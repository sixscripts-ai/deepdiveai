# Testing Procedure for DeepDiveAI Application

This document outlines the testing procedures to ensure the DeepDiveAI application works correctly before and after deployment to the DigitalOcean App Platform.

## Pre-Deployment Testing

### 1. Environment Setup Verification
- Verify that all required environment variables are set:
  ```bash
  echo $GEMINI_API_KEY
  ```
- Ensure Node.js and npm are installed at compatible versions
  ```bash
  node --version
  npm --version
  ```

### 2. Database Connection Test
- Run the application locally and verify database initialization:
  ```bash
  npm run db:server
  ```
- Check console output for "Database service initialized successfully"

### 3. Backend API Endpoints Test
- With the database server running, test the health check endpoint:
  ```bash
  curl http://localhost:3001/api/health
  ```
- Verify the response is `{"status":"ok"}`

### 4. Frontend Build Test
- Test the production build process:
  ```bash
  npm run build
  ```
- Ensure no build errors occur
- Verify the `dist` directory is created with the built application

### 5. Full Application Test
- Run the complete application locally:
  ```bash
  npm run dev:full
  ```
- Open the application in a browser at `http://localhost:5173`
- Test the following functionalities:
  - File upload feature
  - Analysis report generation
  - Chat functionality with the AI
  - Navigation between different sections

## Deployment Testing

### 1. Initial Deployment Verification
- After deployment to DigitalOcean, check the application URL provided by the platform
- Verify the application loads correctly in the browser
- Check the deployment logs in the DigitalOcean dashboard for any errors

### 2. Database Persistence Test (Known Limitation)
- **Note:** The current SQLite implementation has persistence limitations in cloud environments
- Upload a test file and generate an analysis report
- Refresh the application page and verify the uploaded file still appears
- **Important:** Any data stored in the SQLite database will be lost when the application is redeployed or restarted

### 3. API Integration Test
- Test the end-to-end flow from file upload to report generation
- Verify the AI analysis works as expected with the deployed environment

### 4. Performance Testing
- Test the application with larger data files to ensure it handles them correctly
- Monitor response times and resource usage in the DigitalOcean dashboard

## Post-Deployment Monitoring

### 1. Error Tracking
- Monitor the application logs in the DigitalOcean dashboard for any runtime errors
- Check for database connection issues or API integration problems

### 2. Resource Usage Monitoring
- Keep an eye on CPU, memory, and disk usage in the DigitalOcean metrics
- Scale resources as needed based on application usage patterns

### 3. Regular Health Checks
- Periodically verify the application is functioning correctly
- Test core functionalities to ensure they continue to work as expected

## Known Limitations
- **SQLite Database Persistence:** Data stored in the SQLite database will not persist across application redeploys or restarts
- For production use with multiple instances, consider migrating to a managed database service

## Next Steps for Production Readiness
1. Migrate from SQLite to a managed database service (PostgreSQL recommended)
2. Implement proper backup and restore procedures for the database
3. Set up comprehensive logging and monitoring
4. Implement automated testing for continuous integration and deployment