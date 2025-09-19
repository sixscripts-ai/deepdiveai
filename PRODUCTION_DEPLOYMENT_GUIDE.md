# Production Deployment Guide - DigitalOcean App Platform

## 🚀 Complete Deployment Checklist

### Phase 1: Database Setup (REQUIRED)

#### 1.1 Create DigitalOcean Managed PostgreSQL Database
```bash
# Via DigitalOcean Dashboard:
# 1. Go to Databases → Create Database Cluster
# 2. Select PostgreSQL
# 3. Choose same region as your app (e.g., nyc1)
# 4. Select appropriate plan (Basic $15/month minimum)
# 5. Name: deepdiveai-db
# 6. Wait for cluster creation (5-10 minutes)
```

#### 1.2 Get Database Connection Details
```bash
# From DigitalOcean dashboard, copy:
# - Host: your-cluster-host.db.ondigitalocean.com
# - Port: 25060
# - Database: defaultdb (or create 'deepdiveai')
# - User: doadmin
# - Password: [generated password]
# - SSL: Required (true)

# Connection string format:
# postgresql://doadmin:password@host:25060/deepdiveai?sslmode=require
```

### Phase 2: Data Migration

#### 2.1 Set Up Local PostgreSQL Connection
```bash
# Set environment variables for migration
export PGHOST=your-cluster-host.db.ondigitalocean.com
export PGPORT=25060
export PGDATABASE=deepdiveai  # or defaultdb
export PGUSER=doadmin
export PGPASSWORD=your-cluster-password
export PGSSL=true
```

#### 2.2 Run Migration Script
```bash
# Test migration first
node test_migration.cjs

# Run actual migration
node migrate_to_postgresql.cjs

# Verify migration
psql "postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$PGDATABASE?sslmode=require" \
  -c "SELECT COUNT(*) FROM files; SELECT COUNT(*) FROM analysis_results; SELECT COUNT(*) FROM chat_messages;"
```

### Phase 3: Application Deployment

#### 3.1 Prepare Repository
```bash
# Ensure all changes are committed
git add .
git commit -m "Add PostgreSQL support and migration scripts"
git push origin main
```

#### 3.2 Deploy to DigitalOcean App Platform
```bash
# Option A: Use doctl CLI
doctl apps create --spec .do/deploy.template.yaml

# Option B: Use DigitalOcean Dashboard
# 1. Go to Apps → Create App
# 2. Connect your GitHub repository
# 3. Use the configuration from .do/deploy.template.yaml
```

#### 3.3 Set Environment Variables in DigitalOcean
```bash
# In DigitalOcean App Platform dashboard:
# Settings → Environment Variables

GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://doadmin:password@host:25060/deepdiveai?sslmode=require
PGSSL=true
```

### Phase 4: Post-Deployment Verification

#### 4.1 Test Application
```bash
# Test health endpoint
curl https://your-app-url.ondigitalocean.app/api/health

# Test database stats
curl https://your-app-url.ondigitalocean.app/api/stats

# Test file listing
curl https://your-app-url.ondigitalocean.app/api/files
```

#### 4.2 Verify Database Connection
```bash
# Check application logs in DigitalOcean dashboard
# Should see: "🐘 Using PostgreSQL database service"
# Should NOT see any database connection errors
```

## 🔧 Configuration Files Updated

### Files Modified for PostgreSQL Support:
- ✅ `services/postgresDatabaseService.ts` - PostgreSQL implementation
- ✅ `services/databaseFactory.ts` - Environment-based database selection
- ✅ `server/index.ts` - Updated to use async database operations
- ✅ `.do/deploy.template.yaml` - Added PostgreSQL environment variables
- ✅ `package.json` - Includes `pg` and `@types/pg` dependencies

### Migration Files Created:
- ✅ `migrate_to_postgresql.cjs` - Main migration script
- ✅ `test_migration.cjs` - Migration validation
- ✅ `MIGRATION_README.md` - Detailed migration documentation
- ✅ `quick_migration_guide.md` - Quick reference

## 🚨 Critical Notes

### Database Behavior:
- **Local Development**: Automatically uses SQLite (no setup required)
- **Production**: Automatically uses PostgreSQL when `DATABASE_URL` is set
- **Fallback**: If PostgreSQL connection fails, application will error (by design)

### Data Persistence:
- **SQLite**: Data lost on every DigitalOcean deployment
- **PostgreSQL**: Data persists across deployments and restarts

### SSL Requirements:
- DigitalOcean Managed PostgreSQL requires SSL connections
- `PGSSL=true` is set in deployment configuration

## 🎯 Next Steps After Deployment

1. **Monitor Application**: Check logs for any database connection issues
2. **Set Up Backups**: Configure automated PostgreSQL backups in DigitalOcean
3. **Performance Monitoring**: Monitor database performance and optimize queries
4. **Security**: Review database access permissions and connection security
5. **Scaling**: Consider connection pooling optimizations for high traffic

## 📞 Support Resources

- **Migration Issues**: See `MIGRATION_README.md`
- **Quick Commands**: See `quick_migration_guide.md`
- **Database Schema**: See `database/schema.sql`
- **Deployment Issues**: See `DIGITALOCEAN_DEPLOYMENT.md`

## 🔄 Rollback Plan

If deployment fails:
```bash
# 1. Revert to SQLite-only version
git revert HEAD
git push origin main

# 2. Redeploy without PostgreSQL
# Remove DATABASE_URL from environment variables

# 3. Restore local SQLite data
cp deepdive.db.backup.* deepdive.db
```

---

**Status**: ✅ Ready for Production Deployment
**Database**: 🐘 PostgreSQL Required
**Migration**: ✅ Scripts Ready and Tested