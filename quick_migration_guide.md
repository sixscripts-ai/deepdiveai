# Quick PostgreSQL Migration Guide

## TL;DR - Fast Migration Steps

### 1. Install Dependencies
```bash
npm install better-sqlite3 pg
```

### 2. Set Environment Variables
```bash
export PGHOST=your-postgres-host
export PGPORT=5432
export PGDATABASE=deepdiveai
export PGUSER=your-username
export PGPASSWORD=your-password
export PGSSL=false  # Set to true for managed databases
```

### 3. Run Migration
```bash
node migrate_to_postgresql.cjs
```

### 4. Update Application
```bash
# Add to .env file
echo "DATABASE_URL=postgresql://user:pass@host:port/database" >> .env.local
```

## DigitalOcean Managed PostgreSQL

### Quick Setup
```bash
# From DigitalOcean dashboard, get connection details
export PGHOST=your-cluster-host
export PGPORT=25060
export PGDATABASE=deepdiveai
export PGUSER=doadmin
export PGPASSWORD=your-cluster-password
export PGSSL=true

# Run migration
node migrate_to_postgresql.cjs
```

## Verification Commands

### Test Migration
```bash
# Run tests before migration
node test_migration.cjs

# Check migration results
psql $DATABASE_URL -c "SELECT COUNT(*) FROM files;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM analysis_results;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM chat_messages;"
```

### Application Test
```bash
# Update environment and test
export DATABASE_URL="postgresql://user:pass@host:port/database"
npm run dev:full
curl http://localhost:3001/api/health
```

## Rollback (if needed)
```bash
# Restore SQLite backup
cp deepdive.db.backup.YYYY-MM-DDTHH-MM-SS deepdive.db

# Remove PostgreSQL environment variable
unset DATABASE_URL

# Restart application
npm run dev:full
```

## Common Issues & Solutions

### Connection Error
```bash
# Test PostgreSQL connection
pg_isready -h $PGHOST -p $PGPORT
psql "postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$PGDATABASE"
```

### Permission Error
```sql
-- Grant permissions (run as superuser)
GRANT ALL PRIVILEGES ON DATABASE deepdiveai TO your_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;
```

### SSL Error
```bash
# For managed databases, ensure SSL is enabled
export PGSSL=true
export PGSSLMODE=require
```

## Files Created
- `migrate_to_postgresql.cjs` - Main migration script
- `test_migration.cjs` - Test script
- `MIGRATION_README.md` - Detailed documentation
- `package-migration.json` - Migration dependencies
- Migration logs: `migration-log-*.json`
- SQLite backup: `deepdive.db.backup.*`

## Next Steps After Migration
1. Update deployment configuration with `DATABASE_URL`
2. Test all application features
3. Set up PostgreSQL backups
4. Monitor performance and optimize queries
5. Remove SQLite dependencies if no longer needed