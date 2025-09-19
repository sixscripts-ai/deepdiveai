# Database Migration Guide for DeepDiveAI

This document outlines the steps to migrate from the current SQLite implementation to a more production-ready database solution for the DeepDiveAI application when deployed to DigitalOcean App Platform.

## Current Limitations

The DeepDiveAI application currently uses SQLite as its database, which has the following limitations in a cloud deployment environment:

1. **Data Loss on Redeploy**: DigitalOcean App Platform uses an ephemeral filesystem, meaning any data stored in the SQLite database file will be lost when the application is redeployed.

2. **No Persistence Across Restarts**: Data won't persist if the application container restarts.

3. **Limited Scalability**: SQLite is not designed for high-concurrency environments or applications that scale horizontally.

## Option 1: Use DigitalOcean Managed PostgreSQL (Recommended)

### Step 1: Create a Managed PostgreSQL Database

1. Log in to your DigitalOcean account
2. Navigate to Databases in the sidebar
3. Click "Create Database Cluster"
4. Select PostgreSQL as the database engine
5. Choose a plan that fits your needs
6. Select the same region as your App Platform deployment
7. Name your database cluster (e.g., "deepdiveai-db")
8. Click "Create Database Cluster"

### Step 2: Update Application Code

1. Install PostgreSQL dependencies:

```bash
npm install pg @types/pg
```

2. Create a new database service implementation for PostgreSQL:

```typescript
// services/postgresDatabaseService.ts
import { Pool } from 'pg';
import type { UploadedFile, ChatMessage, AnalysisResult } from '../types';

export interface DatabaseFile extends UploadedFile {
    fileSize?: number;
    uploadDate: string;
    lastAccessed: string;
    createdAt: string;
    updatedAt: string;
}

export interface DatabaseAnalysisResult {
    id: number;
    fileId: string;
    markdownReport: string;
    chartData: any | null;
    suggestedQuestions: string[];
    analysisDate: string;
    processingTimeMs?: number;
    createdAt: string;
    updatedAt: string;
}

export interface DatabaseChatMessage extends ChatMessage {
    id: number;
    fileId: string;
    messageOrder: number;
    timestamp: string;
    createdAt: string;
}

class PostgresDatabaseService {
    private pool: Pool;
    private static instance: PostgresDatabaseService;

    private constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        });
        
        // Initialize database schema
        this.initializeDatabase();
    }

    public static getInstance(): PostgresDatabaseService {
        if (!PostgresDatabaseService.instance) {
            PostgresDatabaseService.instance = new PostgresDatabaseService();
        }
        return PostgresDatabaseService.instance;
    }

    private async initializeDatabase(): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            // Create files table
            await client.query(`
                CREATE TABLE IF NOT EXISTS files (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    data TEXT NOT NULL,
                    fileSize BIGINT,
                    uploadDate TEXT NOT NULL,
                    lastAccessed TEXT NOT NULL,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL
                )
            `);
            
            // Create analysis_results table
            await client.query(`
                CREATE TABLE IF NOT EXISTS analysis_results (
                    id SERIAL PRIMARY KEY,
                    fileId TEXT NOT NULL,
                    markdownReport TEXT NOT NULL,
                    chartData JSONB,
                    suggestedQuestions JSONB NOT NULL,
                    analysisDate TEXT NOT NULL,
                    processingTimeMs BIGINT,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL,
                    FOREIGN KEY (fileId) REFERENCES files(id) ON DELETE CASCADE
                )
            `);
            
            // Create chat_messages table
            await client.query(`
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id SERIAL PRIMARY KEY,
                    fileId TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    messageOrder INTEGER NOT NULL,
                    timestamp TEXT NOT NULL,
                    createdAt TEXT NOT NULL,
                    FOREIGN KEY (fileId) REFERENCES files(id) ON DELETE CASCADE
                )
            `);
            
            await client.query('COMMIT');
            console.log('Database schema initialized successfully');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error initializing database schema:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Implement all the same methods as in the original DatabaseService class
    // but using PostgreSQL queries instead of SQLite

    // Example implementation for getFileById
    public async getFileById(id: string): Promise<DatabaseFile | null> {
        const result = await this.pool.query(
            'SELECT * FROM files WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return null;
        }
        
        const file = result.rows[0];
        return {
            id: file.id,
            name: file.name,
            type: file.type,
            data: file.data,
            fileSize: file.fileSize,
            uploadDate: file.uploadDate,
            lastAccessed: file.lastAccessed,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt
        };
    }

    // Continue implementing all required methods...
}

export default PostgresDatabaseService;
```

3. Update environment variables in the DigitalOcean App Platform deployment:

```yaml
envs:
- key: DATABASE_URL
  scope: RUN_TIME
  value: ${DATABASE_URL}
- key: GEMINI_API_KEY
  scope: RUN_TIME
  value: ${GEMINI_API_KEY}
- key: NODE_ENV
  scope: RUN_TIME
  value: production
- key: PORT
  scope: RUN_TIME
  value: "8080"
```

### Step 3: Update Application Code to Use the New Database Service

Modify the server code to use the new PostgreSQL service instead of SQLite.

## Option 2: Use a Persistent Volume for SQLite (Alternative)

If you must continue using SQLite, you can configure a persistent volume in DigitalOcean App Platform.

### Step 1: Update the App Spec to Include a Volume

Update your `.do/deploy.template.yaml` file to include a volume mount:

```yaml
region: nyc
services:
- name: web
  git:
    branch: main
    repo_clone_url: ${_self.repository}
  build_command: npm run build
  run_command: npm run dev:full
  http_port: 8080
  routes:
  - path: /
  envs:
  - key: GEMINI_API_KEY
    scope: RUN_TIME
    value: ${GEMINI_API_KEY}
  - key: NODE_ENV
    scope: RUN_TIME
    value: production
  - key: PORT
    scope: RUN_TIME
    value: "8080"
  volumes:
  - name: data-volume
    mount_path: /app/data
    size_gb: 1
```

### Step 2: Update the Database Service to Use the Volume Path

Modify the `databaseService.ts` file to store the SQLite database file in the mounted volume:

```typescript
private constructor() {
    // Create database in the mounted volume
    const dbPath = join('/app/data', 'deepdive.db');
    this.db = new Database(dbPath);
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
    
    // Initialize database schema
    this.initializeDatabase();
}
```

## Option 3: Migrate to a Different Database Provider

You can also consider other database providers that integrate well with Node.js applications:

1. **MongoDB Atlas** - A document database that works well for JSON-like data structures
2. **Supabase** - An open-source Firebase alternative with a PostgreSQL backend
3. **Firebase Firestore** - A NoSQL document database with real-time capabilities

## Data Migration Strategy

When migrating from SQLite to PostgreSQL or another database system:

1. **Create a Migration Script**: Write a script that:
   - Reads all data from the SQLite database
   - Transforms data if necessary to match the new schema
   - Inserts data into the new database

2. **Test Migration**: Test the migration process in a staging environment before applying to production.

3. **Deployment Strategy**:
   - Schedule a maintenance window
   - Backup the SQLite database
   - Run the migration script
   - Verify data integrity in the new database
   - Update application to use the new database
   - Deploy the updated application

## Conclusion

Migrating to a managed database service will significantly improve the reliability and scalability of the DeepDiveAI application in a cloud deployment environment. PostgreSQL is recommended for its compatibility with the current data structure and DigitalOcean's excellent managed database offering.