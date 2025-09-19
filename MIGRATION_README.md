# PostgreSQL Migration Guide

This document provides instructions for migrating your DeepDiveAI application from SQLite to PostgreSQL using the automated migration script.

## Overview

The migration script (`migrate_to_postgresql.cjs`) provides:

- **Schema Translation**: Converts SQLite schema to PostgreSQL with proper data type mappings
- **Data Integrity**: Preserves all data with validation and error handling
- **Minimal Complexity**: Single script execution with comprehensive logging
- **Rollback Support**: Automatic backup creation before migration
- **Progress Tracking**: Real-time progress updates and detailed logging

## Prerequisites

1. **Node.js** (version 14 or higher)
2. **PostgreSQL** database server running
3. **Database Access**: PostgreSQL credentials with CREATE/INSERT permissions
4. **SQLite Database**: Existing `deepdive.db` file in your project

## Installation

### Option 1: Install Dependencies Separately

```bash
# Install required dependencies
npm install better-sqlite3 pg

# Make the script executable
chmod +x migrate_to_postgresql.cjs
```

### Option 2: Use Migration Package File

```bash
# Copy migration dependencies
cp package-migration.json package-migration-temp.json

# Install migration-specific dependencies
npm install --prefix . better-sqlite3 pg
```

## Configuration

### Environment Variables

Set the following environment variables for your PostgreSQL connection:

```bash
# PostgreSQL connection settings
export PGHOST=localhost
export PGPORT=5432
export PGDATABASE=deepdiveai
export PGUSER=postgres
export PGPASSWORD=your_password
export PGSSL=false

# Optional: SQLite database path (defaults to ./deepdive.db)
export SQLITE_PATH=/path/to/your/deepdive.db

# Optional: Migration settings
export BATCH_SIZE=1000
export VALIDATE_DATA=true
export CREATE_BACKUP=true
```

### DigitalOcean Managed PostgreSQL

For DigitalOcean Managed PostgreSQL:

```bash
export PGHOST=your-db-cluster-host
export PGPORT=25060
export PGDATABASE=deepdiveai
export PGUSER=doadmin
export PGPASSWORD=your_password
export PGSSL=true
```

## Usage

### Basic Migration

```bash
# Run the migration script
node migrate_to_postgresql.cjs
```

### Advanced Usage

```bash
# Custom SQLite path
SQLITE_PATH=/custom/path/deepdive.db node migrate_to_postgresql.cjs

# Skip backup creation (not recommended)
CREATE_BACKUP=false node migrate_to_postgresql.cjs

# Custom batch size for large datasets
BATCH_SIZE=500 node migrate_to_postgresql.cjs
```

## Migration Process

The script performs the following steps:

1. **Initialization**
   - Connects to SQLite database (read-only)
   - Connects to PostgreSQL database
   - Validates connections

2. **Backup Creation**
   - Creates timestamped backup of SQLite database
   - Stored as `deepdive.db.backup.YYYY-MM-DDTHH-MM-SS`

3. **Schema Setup**
   - Creates PostgreSQL schema with proper data types
   - Sets up indexes and constraints
   - Creates triggers for automatic timestamp updates

4. **Data Migration**
   - **Files Table**: Migrates file metadata and content
   - **Analysis Results**: Converts JSON strings to JSONB
   - **Chat Messages**: Preserves conversation history
   - Progress tracking with batch processing

5. **Validation**
   - Verifies record counts match between databases
   - Checks foreign key relationships
   - Validates data integrity

6. **Cleanup**
   - Closes database connections
   - Saves detailed migration log

## Schema Differences

### Data Type Mappings

| SQLite Type | PostgreSQL Type | Notes |
|-------------|-----------------|-------|
| `TEXT` | `TEXT` | Direct mapping |
| `INTEGER` | `BIGINT` / `SERIAL` | SERIAL for auto-increment |
| `BOOLEAN` | `BOOLEAN` | Proper boolean type |
| `DATETIME` | `TIMESTAMPTZ` | Timezone-aware timestamps |
| `JSON TEXT` | `JSONB` | Indexed JSON with better performance |

### Enhanced Features

- **JSONB Indexes**: Efficient querying of chart data and suggested questions
- **Automatic Triggers**: Timestamp updates without application logic
- **Foreign Key Constraints**: Proper referential integrity
- **UUID Support**: Ready for UUID primary keys if needed

## Troubleshooting

### Common Issues

1. **Connection Errors**
   ```bash
   # Check PostgreSQL is running
   pg_isready -h localhost -p 5432
   
   # Test connection manually
   psql -h localhost -p 5432 -U postgres -d deepdiveai
   ```

2. **Permission Errors**
   ```sql
   -- Grant necessary permissions
   GRANT CREATE, USAGE ON SCHEMA public TO your_user;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
   ```

3. **Large Database Migration**
   ```bash
   # Increase batch size for better performance
   BATCH_SIZE=2000 node migrate_to_postgresql.js
   ```

4. **SSL Connection Issues**
   ```bash
   # For DigitalOcean or other managed services
   export PGSSL=true
   export PGSSLMODE=require
   ```

### Validation Failures

If validation fails, check the migration log for details:

```bash
# View the latest migration log
ls -la migration-log-*.json | tail -1
cat migration-log-YYYY-MM-DDTHH-MM-SS.json
```

## Post-Migration Steps

### 1. Update Application Configuration

Update your application to use PostgreSQL:

```javascript
// Replace SQLite database service
const DatabaseService = require('./services/postgresDatabaseService');

// Update connection string
const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;
```

### 2. Update Environment Variables

```bash
# Add to your .env file
DATABASE_URL=postgresql://user:password@host:port/database
```

### 3. Test Application

```bash
# Start your application
npm run dev:full

# Verify data integrity
curl http://localhost:3001/api/health
curl http://localhost:3001/api/stats
```

### 4. Update Deployment Configuration

Update your `.do/deploy.template.yaml`:

```yaml
envs:
- key: DATABASE_URL
  scope: RUN_TIME
  value: ${DATABASE_URL}
```

## Performance Optimization

### Indexes

The migration script creates optimized indexes:

```sql
-- File queries
CREATE INDEX idx_files_upload_date ON files(upload_date);
CREATE INDEX idx_files_last_accessed ON files(last_accessed);

-- Analysis queries
CREATE INDEX idx_analysis_results_file_id ON analysis_results(file_id);
CREATE INDEX idx_analysis_chart_data ON analysis_results USING GIN (chart_data);

-- Chat queries
CREATE INDEX idx_chat_messages_file_id ON chat_messages(file_id);
CREATE INDEX idx_chat_messages_order ON chat_messages(file_id, message_order);
```

### Connection Pooling

For production, implement connection pooling:

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Rollback Procedure

If you need to rollback to SQLite:

1. **Stop your application**
2. **Restore from backup**:
   ```bash
   cp deepdive.db.backup.YYYY-MM-DDTHH-MM-SS deepdive.db
   ```
3. **Revert application configuration**
4. **Restart application**

## Support

For migration issues:

1. Check the migration log file
2. Verify PostgreSQL connection settings
3. Ensure all dependencies are installed
4. Review the troubleshooting section above

## Security Notes

- Never commit database credentials to version control
- Use environment variables for sensitive configuration
- Enable SSL for production database connections
- Regularly backup your PostgreSQL database

## Next Steps

After successful migration:

1. Set up automated PostgreSQL backups
2. Configure monitoring and alerting
3. Optimize queries based on usage patterns
4. Consider implementing read replicas for scaling