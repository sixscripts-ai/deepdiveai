# DigitalOcean PostgreSQL Setup Guide

## 🐘 Step-by-Step PostgreSQL Database Creation

### Step 1: Access DigitalOcean Dashboard
1. Go to [DigitalOcean Dashboard](https://cloud.digitalocean.com/)
2. Log in to your account
3. Click **"Databases"** in the left sidebar
4. Click **"Create Database Cluster"** button

### Step 2: Configure Database Cluster
```
Database Engine: PostgreSQL
Version: PostgreSQL 15 (recommended)
```

### Step 3: Choose Configuration
```
Datacenter Region: New York 1 (nyc1) - Same as your app
Plan: Basic ($15/month)
  - 1 GB RAM
  - 1 vCPU  
  - 10 GB SSD
  - Good for development/small production
```

### Step 4: Cluster Settings
```
Cluster Name: deepdiveai-db
Database Name: deepdiveai (or keep defaultdb)
```

### Step 5: Create Cluster
- Click **"Create Database Cluster"**
- Wait 5-10 minutes for provisioning
- Status will change from "Creating" to "Online"

## 🔗 Getting Connection Details

### Step 6: Access Connection Info
1. Click on your **"deepdiveai-db"** cluster
2. Go to **"Connection Details"** tab
3. Copy the following information:

```bash
# Connection Details (example - yours will be different)
Host: deepdiveai-db-do-user-123456-0.b.db.ondigitalocean.com
Port: 25060
Database: deepdiveai
Username: doadmin
Password: [auto-generated secure password]
SSL Mode: require
```

### Step 7: Get Connection String
```bash
# Format: postgresql://username:password@host:port/database?sslmode=require
# Example:
postgresql://doadmin:AVNS_abc123xyz@deepdiveai-db-do-user-123456-0.b.db.ondigitalocean.com:25060/deepdiveai?sslmode=require
```

## 🧪 Test Connection Locally

### Step 8: Test Database Connection
```bash
# Set environment variables (replace with your actual values)
export PGHOST=deepdiveai-db-do-user-123456-0.b.db.ondigitalocean.com
export PGPORT=25060
export PGDATABASE=deepdiveai
export PGUSER=doadmin
export PGPASSWORD=AVNS_abc123xyz
export PGSSL=true

# Test connection
psql "postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$PGDATABASE?sslmode=require"
```

### Step 9: Run Migration
```bash
# Run migration script
node migrate_to_postgresql.cjs

# Expected output:
# ✅ Connected to PostgreSQL database
# ✅ Created backup: deepdive.db.backup.2025-01-19T...
# ✅ PostgreSQL schema created successfully
# ✅ Migrated 5 files
# ✅ Migrated 7 analysis results  
# ✅ Migrated 10 chat messages
# ✅ Migration completed successfully
```

## 🚀 Deploy to DigitalOcean App Platform

### Step 10: Update App Platform Environment Variables
1. Go to **Apps** in DigitalOcean Dashboard
2. Create new app or select existing app
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

```bash
GEMINI_API_KEY=your_actual_gemini_api_key
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://doadmin:password@host:25060/deepdiveai?sslmode=require
PGSSL=true
```

### Step 11: Deploy Application
```bash
# Option A: GitHub Auto-Deploy
# 1. Connect your GitHub repository
# 2. Select main branch
# 3. Use .do/deploy.template.yaml configuration

# Option B: Manual Deploy via CLI
doctl apps create --spec .do/deploy.template.yaml
```

## ✅ Verification Steps

### Step 12: Test Deployed Application
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

### Step 13: Check Application Logs
1. Go to **Apps** → Your App → **Runtime Logs**
2. Look for: `🐘 Using PostgreSQL database service`
3. Verify no database connection errors

## 🔧 Troubleshooting

### Common Issues & Solutions

#### Connection Timeout
```bash
# Check if database is in same region as app
# Ensure SSL is enabled: PGSSL=true
```

#### Authentication Failed
```bash
# Double-check username/password from DigitalOcean dashboard
# Ensure special characters in password are URL-encoded
```

#### SSL Certificate Error
```bash
# For managed databases, always use SSL
export PGSSLMODE=require
# In connection string: ?sslmode=require
```

#### Database Not Found
```bash
# Create database if using defaultdb:
psql "postgresql://..." -c "CREATE DATABASE deepdiveai;"
```

## 💰 Cost Estimation

### Database Costs:
- **Basic Plan**: $15/month (1GB RAM, 10GB storage)
- **Professional Plan**: $60/month (4GB RAM, 40GB storage)
- **Business Plan**: $240/month (16GB RAM, 160GB storage)

### App Platform Costs:
- **Basic**: $5/month (512MB RAM)
- **Professional**: $12/month (1GB RAM)

**Total Minimum**: ~$20/month for small production deployment

## 📋 Quick Reference Commands

```bash
# Set PostgreSQL environment
export DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"

# Test connection
pg_isready -h $PGHOST -p $PGPORT

# Run migration
node migrate_to_postgresql.cjs

# Test local app with PostgreSQL
npm run dev:full

# Deploy
git push origin main
```

## 🎯 Next Steps After Setup

1. **Monitor Performance**: Check database metrics in DigitalOcean
2. **Set Up Backups**: Configure automated daily backups
3. **Security Review**: Review database access and firewall rules
4. **Scaling**: Monitor usage and upgrade plan if needed

---

**🚨 Important**: Save your database connection details securely. You'll need them for:
- Environment variables in App Platform
- Local development with PostgreSQL
- Database administration tasks