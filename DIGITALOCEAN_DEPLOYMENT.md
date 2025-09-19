# DigitalOcean App Platform Deployment Configuration

## Project Overview
This is a full-stack React application with an Express backend and SQLite database. It requires configuration for proper deployment on the DigitalOcean App Platform.

## Build Settings
- **Build Strategy**: Buildpack
- **Build Command**: `npm run build`
- **Run Command**: `npm run dev:full`
- **Buildpack**: Node.js

## Network Configuration
- **Public HTTP Port**: 8080
- **Internal Ports**: None required

## HTTP Routing
- **HTTP Request Route**: Configure a single route with the following settings:
  - Path: /
  - Destination: Your app component
  - Preserve Path Prefix: No

## Environment Variables
- **GEMINI_API_KEY**: Your Gemini API key
- **NODE_ENV**: production

## Additional Configuration

### Backend Server Configuration
The backend server (server/index.ts) currently runs on port 3001. We need to modify it to use the port provided by DigitalOcean's PORT environment variable. Create a file named `.do/deploy.template.yaml` with the following content:

```yaml
name: deepdiveai
region: nyc
services:
- name: web
  git:
    branch: main
    repo_clone_url: <your-repo-url>
  build_command: npm run build
  run_command: npm run dev:full
  env:
    - key: GEMINI_API_KEY
      scope: RUN_TIME
      value: $GEMINI_API_KEY
    - key: NODE_ENV
      scope: RUN_TIME
      value: production
  routes:
  - path: /
  ports:
  - http_port: 8080
    protocol: http
```

### Server Port Modification
Create a patch for the server/index.ts file to use the PORT environment variable:

```patch
diff --git a/server/index.ts b/server/index.ts
index XXXXXX..XXXXXX 100644
--- a/server/index.ts
+++ b/server/index.ts
@@ -5,7 +5,7 @@ import DatabaseService from '../services/databaseService';
 import type { UploadedFile } from '../types';
 
 const app = express();
-const PORT = 3001;
+const PORT = process.env.PORT || 3001;
 
 // Middleware
 app.use(cors());
```

## Deployment Steps
1. Ensure your code is pushed to a GitHub repository
2. Log in to your DigitalOcean account
3. Create a new App Platform application
4. Connect your GitHub repository
5. Configure the settings according to this document
6. Set up the environment variables in the DigitalOcean dashboard
7. Click "Create Resources" to start the deployment process
8. Once deployed, your application will be accessible via the provided URL

## Important Notes and Limitations

### Database Persistence
- **Critical Limitation**: The application uses SQLite, which is a file-based database. In DigitalOcean App Platform, the filesystem is **ephemeral**, which means:
  - Database data will be lost whenever the application is redeployed
  - Data will not persist across application restarts
  - Each deployment creates a fresh copy of the filesystem

### Production Recommendations
For a production environment, consider these improvements:

1. **Database Migration**: Replace SQLite with a managed database service:
   - DigitalOcean Managed PostgreSQL (recommended)
   - Other compatible database services

2. **Storage Options**:
   - If SQLite must be used, mount a persistent volume to store the database file
   - Consider using DigitalOcean Spaces for file storage instead of local filesystem

3. **Environment Configuration**:
   - Ensure all environment variables are properly configured in the DigitalOcean dashboard
   - Set up proper secrets management for API keys

4. **Testing**:
   - Refer to the `TESTING_PROCEDURE.md` document for comprehensive testing steps
   - Perform thorough testing after initial deployment

5. **Monitoring**:
   - Enable DigitalOcean App Platform metrics
   - Set up alerts for application errors and performance issues

The `npm run dev:full` command uses concurrently to run both the frontend and backend services simultaneously.