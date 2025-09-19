# Deployment Checklist for DeepDiveAI

Use this checklist to ensure a successful deployment to DigitalOcean App Platform.

## Pre-Deployment Preparations

- [ ] Code is committed and pushed to a Git repository
- [ ] Gemini API key is available
- [ ] `.do/deploy.template.yaml` file is properly configured
- [ ] Local testing has been completed (see TESTING_PROCEDURE.md)
- [ ] `server/index.ts` has been updated to use environment variable for PORT

## DigitalOcean Setup

- [ ] DigitalOcean account is active
- [ ] Billing information is up to date
- [ ] Appropriate permissions are available for deployment

## Deployment Configuration

### Build Settings
- [ ] Build Command: `npm run build`
- [ ] Run Command: `npm run dev:full`
- [ ] Buildpack: Node.js

### Network Configuration
- [ ] Public HTTP Port: 8080

### HTTP Routing
- [ ] Path: /
- [ ] Destination: App component

### Environment Variables
- [ ] GEMINI_API_KEY is set
- [ ] NODE_ENV is set to "production"
- [ ] PORT is set to "8080"
- [ ] DATABASE_URL is set to PostgreSQL connection string
- [ ] PGSSL is set to "true"

## Post-Deployment Verification

- [ ] Application is accessible at the provided URL
- [ ] Health check endpoint returns status "ok"
- [ ] File upload functionality works
- [ ] Analysis generation works
- [ ] Chat functionality works

## Database Considerations

- [x] PostgreSQL migration completed successfully
- [x] DigitalOcean Managed PostgreSQL database created
- [x] Data migrated from SQLite to PostgreSQL
- [x] `.env.postgresql` file created with connection details
- [x] `DATABASE_URL` and `PGSSL` environment variables configured in deployment template

## PostgreSQL Verification

- [x] Database connection test passed
- [x] Migration script completed successfully
- [x] Data integrity verified (5 files, 7 analysis results, 10 chat messages)

## Monitoring and Maintenance

- [ ] App metrics are enabled
- [ ] Alerts are configured for critical errors
- [ ] Backup plan is in place for important data
- [ ] Team members have appropriate access to the deployment

## Rollback Plan

- [ ] Previous stable deployment is identified
- [ ] Process for rolling back is documented
- [ ] Team is trained on rollback procedures

## Security Considerations

- [ ] API keys are securely stored
- [ ] No sensitive information is exposed in client-side code
- [ ] HTTPS is enforced for all connections

## Documentation

- [ ] Deployment process is documented
- [ ] Known limitations are documented
- [ ] User guide is updated with deployment-specific information