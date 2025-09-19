<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1JmMDP5ACGBv0HyY90ZlqgwaYrY9qRspF

## Run Locally

**Prerequisites:**  Node.js

### Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key

3. Run the app with database:
   ```bash
   npm run dev:full
   ```
   Or use the startup script:
   ```bash
   ./start.sh
   ```

### Manual Setup

If you prefer to run services separately:

1. Start the database server:
   ```bash
   npm run db:server
   ```

2. In another terminal, start the frontend:
   ```bash
   npm run dev
   ```

## Database

This application uses **SQLite** for data persistence:
- **Database file**: `deepdive.db` (created automatically)
- **Location**: Project root directory
- **Features**:

## Deployment Documentation

### Deploy to DigitalOcean App Platform

#### Prerequisites

1. A DigitalOcean account
2. Your code pushed to a Git repository
3. Gemini API key

#### Deployment Steps

1. Log in to your DigitalOcean account and navigate to the App Platform
2. Click "Create App" and select your Git repository
3. Configure the app with the following settings:

##### Build Settings
- **Build Strategy**: Buildpack
- **Build Command**: `npm run build`
- **Run Command**: `npm run dev:full`

##### Network Configuration
- **Public HTTP Port**: 8080

##### HTTP Routing
- Configure 1 HTTP request route with path `/`

##### Environment Variables
- **GEMINI_API_KEY**: Your Gemini API key
- **NODE_ENV**: production
- **PORT**: 8080

4. Click "Create Resources" to start the deployment
5. Once deployed, your application will be accessible via the provided URL

### Additional Deployment Resources

- [DIGITALOCEAN_DEPLOYMENT.md](DIGITALOCEAN_DEPLOYMENT.md) - Detailed deployment configuration
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Step-by-step deployment checklist
- [TESTING_PROCEDURE.md](TESTING_PROCEDURE.md) - Testing procedures for pre and post deployment
- [DATABASE_MIGRATION_GUIDE.md](DATABASE_MIGRATION_GUIDE.md) - Database migration strategies for production environments
  - Persistent file storage
  - Analysis results caching
  - Chat history preservation
  - Automatic migration from localStorage
  - Database backup functionality

### Database API

The database server runs on `http://localhost:3001` with the following endpoints:

- `GET /api/health` - Health check
- `GET /api/stats` - Database statistics
- `GET /api/files` - Get all uploaded files
- `POST /api/files` - Upload new file
- `GET /api/analysis/:fileId` - Get analysis results
- `POST /api/analysis` - Save analysis results
- `GET /api/chat/:fileId` - Get chat history
- `POST /api/chat/:fileId` - Update chat history
- `POST /api/backup` - Create database backup

### Fallback Mode

If the database server is unavailable, the application automatically falls back to localStorage for data persistence.
