# PostgreSQL Deployment Steps for DigitalOcean App Platform

This guide outlines the steps to deploy your DeepDiveAI application with the PostgreSQL database that has been successfully set up and migrated.

## Pre-Deployment Checklist

✅ PostgreSQL database cluster created on DigitalOcean
✅ Connection details saved in `.env.postgresql`
✅ Data migrated from SQLite to PostgreSQL
✅ `deploy.template.yaml` updated with PostgreSQL environment variables

## Deployment Steps

### 1. Push Latest Code to GitHub

```bash
# Ensure all changes are committed
git add .
git commit -m "Ready for PostgreSQL deployment"
git push origin main
```

### 2. Deploy to DigitalOcean App Platform

**Option A: GitHub Auto-Deploy**
1. Go to DigitalOcean Dashboard → Apps
2. Create a new app or select existing app
3. Connect to your GitHub repository
4. Select main branch
5. Use the configuration from `.do/deploy.template.yaml`

**Option B: Manual Deploy via CLI**
```bash
doctl apps create --spec .do/deploy.template.yaml
```

### 3. Configure Environment Variables

Add the following environment variables from your `.env.postgresql` file:

```
GEMINI_API_KEY=your_actual_gemini_api_key
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://username:password@host:25060/deepdiveai?sslmode=require
PGSSL=true
```

### 4. Verify Deployment

After deployment completes, verify that everything is working correctly:

```bash
# Replace with your actual app URL
APP_URL="https://your-app-name.ondigitalocean.app"

# Test health endpoint
curl $APP_URL/api/health

# Test database stats (should show your migrated data)
curl $APP_URL/api/stats

# Test files endpoint
curl $APP_URL/api/files
```

### 5. Check Application Logs

1. Go to DigitalOcean Dashboard → Apps → Your App → Runtime Logs
2. Verify you see: `🐘 Using PostgreSQL database service`
3. Confirm there are no database connection errors

## Troubleshooting

If you encounter any issues with your PostgreSQL connection:

1. Double-check that all environment variables are correctly set
2. Ensure that the PostgreSQL cluster is in the same region as your app
3. Verify that your database user has the correct permissions
4. Check that `PGSSL=true` is set as DigitalOcean Managed PostgreSQL requires SSL

## Additional Resources

- [DIGITALOCEAN_POSTGRESQL_SETUP.md](DIGITALOCEAN_POSTGRESQL_SETUP.md) - Detailed PostgreSQL setup guide
- [DIGITALOCEAN_DEPLOYMENT.md](DIGITALOCEAN_DEPLOYMENT.md) - General deployment instructions
- [DATABASE_MIGRATION_GUIDE.md](DATABASE_MIGRATION_GUIDE.md) - Database migration information