#!/usr/bin/env node

/**
 * PostgreSQL Migration Script for DeepDiveAI
 * 
 * This script migrates data from SQLite to PostgreSQL with:
 * - Schema translation with proper data type mappings
 * - Data integrity preservation
 * - Efficient batch processing
 * - Comprehensive error handling and rollback
 * - Progress tracking and validation
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { Client } = require('pg');

class PostgreSQLMigrator {
    constructor(config) {
        this.config = {
            sqlitePath: config.sqlitePath || path.join(process.cwd(), 'deepdive.db'),
            postgresql: {
                host: config.postgresql?.host || 'localhost',
                port: config.postgresql?.port || 5432,
                database: config.postgresql?.database || 'deepdiveai',
                user: config.postgresql?.user || 'postgres',
                password: config.postgresql?.password,
                ssl: config.postgresql?.ssl || false
            },
            batchSize: config.batchSize || 1000,
            validateData: config.validateData !== false,
            createBackup: config.createBackup !== false
        };
        
        this.sqliteDb = null;
        this.pgClient = null;
        this.migrationLog = [];
    }

    /**
     * PostgreSQL schema with proper data type mappings from SQLite
     */
    getPostgreSQLSchema() {
        return `
-- DeepDive AI Trading Analysis Database Schema (PostgreSQL)
-- Migrated from SQLite with proper data type mappings

-- Enable UUID extension for better primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Files table: stores uploaded trading data files
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    is_binary BOOLEAN NOT NULL DEFAULT FALSE,
    file_size BIGINT,
    upload_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Analysis results table: stores AI-generated analysis reports
CREATE TABLE IF NOT EXISTS analysis_results (
    id SERIAL PRIMARY KEY,
    file_id TEXT NOT NULL,
    markdown_report TEXT NOT NULL,
    chart_data JSONB, -- JSON data with indexing support
    suggested_questions JSONB, -- JSON array with indexing support
    analysis_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    processing_time_ms BIGINT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_analysis_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- Chat messages table: stores conversation history for each file
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    file_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'model')),
    message_text TEXT NOT NULL,
    message_order INTEGER NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chat_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- Indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_files_upload_date ON files(upload_date);
CREATE INDEX IF NOT EXISTS idx_files_last_accessed ON files(last_accessed);
CREATE INDEX IF NOT EXISTS idx_analysis_results_file_id ON analysis_results(file_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_date ON analysis_results(analysis_date);
CREATE INDEX IF NOT EXISTS idx_chat_messages_file_id ON chat_messages(file_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_order ON chat_messages(file_id, message_order);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);

-- JSONB indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_analysis_chart_data ON analysis_results USING GIN (chart_data);
CREATE INDEX IF NOT EXISTS idx_analysis_questions ON analysis_results USING GIN (suggested_questions);

-- Functions to automatically update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
-- Check if triggers exist before creating to avoid conflicts
do $$
begin
    if not exists (select 1 from pg_trigger where tgname = 'update_files_updated_at') then
        CREATE TRIGGER update_files_updated_at 
            BEFORE UPDATE ON files 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    end if;
    
    if not exists (select 1 from pg_trigger where tgname = 'update_analysis_results_updated_at') then
        CREATE TRIGGER update_analysis_results_updated_at 
            BEFORE UPDATE ON analysis_results 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    end if;
end $$;

-- Function to update file last_accessed when analysis is performed
CREATE OR REPLACE FUNCTION update_file_last_accessed()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE files SET last_accessed = CURRENT_TIMESTAMP WHERE id = NEW.file_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update file last_accessed
do $$
begin
    if not exists (select 1 from pg_trigger where tgname = 'update_file_last_accessed_trigger') then
        CREATE TRIGGER update_file_last_accessed_trigger
            AFTER INSERT ON analysis_results
            FOR EACH ROW EXECUTE FUNCTION update_file_last_accessed();
    end if;
end $$;
`;
    }

    /**
     * Initialize connections to both databases
     */
    async initialize() {
        try {
            // Check if SQLite database exists
            if (!fs.existsSync(this.config.sqlitePath)) {
                throw new Error(`SQLite database not found at: ${this.config.sqlitePath}`);
            }

            // Initialize SQLite connection
            this.sqliteDb = new Database(this.config.sqlitePath, { readonly: true });
            this.log('✅ Connected to SQLite database');

            // Initialize PostgreSQL connection
            this.pgClient = new Client(this.config.postgresql);
            await this.pgClient.connect();
            this.log('✅ Connected to PostgreSQL database');

            return true;
        } catch (error) {
            this.log(`❌ Initialization failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Create backup of SQLite database
     */
    async createBackup() {
        if (!this.config.createBackup) return;

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = `${this.config.sqlitePath}.backup.${timestamp}`;
            
            fs.copyFileSync(this.config.sqlitePath, backupPath);
            this.log(`✅ Backup created: ${backupPath}`);
            return backupPath;
        } catch (error) {
            this.log(`❌ Backup failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Setup PostgreSQL schema
     */
    async setupPostgreSQLSchema() {
        try {
            await this.pgClient.query('BEGIN');
            
            const schema = this.getPostgreSQLSchema();
            await this.pgClient.query(schema);
            
            await this.pgClient.query('COMMIT');
            this.log('✅ PostgreSQL schema created successfully');
        } catch (error) {
            await this.pgClient.query('ROLLBACK');
            this.log(`❌ Schema creation failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Migrate files table with data type conversion
     */
    async migrateFiles() {
        try {
            this.log('📁 Starting files migration...');
            
            // Get total count for progress tracking
            const countResult = this.sqliteDb.prepare('SELECT COUNT(*) as count FROM files').get();
            const totalFiles = countResult.count;
            
            if (totalFiles === 0) {
                this.log('ℹ️  No files to migrate');
                return;
            }

            // Clear existing data
            await this.pgClient.query('DELETE FROM files');
            
            // Prepare statements
            const selectStmt = this.sqliteDb.prepare(`
                SELECT id, name, type, content, is_binary, file_size,
                       upload_date, last_accessed, created_at, updated_at
                FROM files
                ORDER BY created_at
            `);

            const insertQuery = `
                INSERT INTO files (id, name, type, content, is_binary, file_size,
                                 upload_date, last_accessed, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `;

            let migratedCount = 0;
            const files = selectStmt.all();

            await this.pgClient.query('BEGIN');

            for (const file of files) {
                // Convert SQLite datetime strings to PostgreSQL timestamps
                const uploadDate = this.convertDateTime(file.upload_date);
                const lastAccessed = this.convertDateTime(file.last_accessed);
                const createdAt = this.convertDateTime(file.created_at);
                const updatedAt = this.convertDateTime(file.updated_at);

                await this.pgClient.query(insertQuery, [
                    file.id,
                    file.name,
                    file.type,
                    file.content,
                    Boolean(file.is_binary),
                    file.file_size,
                    uploadDate,
                    lastAccessed,
                    createdAt,
                    updatedAt
                ]);

                migratedCount++;
                if (migratedCount % 100 === 0) {
                    this.log(`📁 Migrated ${migratedCount}/${totalFiles} files`);
                }
            }

            await this.pgClient.query('COMMIT');
            this.log(`✅ Successfully migrated ${migratedCount} files`);
            
        } catch (error) {
            await this.pgClient.query('ROLLBACK');
            this.log(`❌ Files migration failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Migrate analysis_results table with JSON data conversion
     */
    async migrateAnalysisResults() {
        try {
            this.log('📊 Starting analysis results migration...');
            
            const countResult = this.sqliteDb.prepare('SELECT COUNT(*) as count FROM analysis_results').get();
            const totalResults = countResult.count;
            
            if (totalResults === 0) {
                this.log('ℹ️  No analysis results to migrate');
                return;
            }

            // Clear existing data
            await this.pgClient.query('DELETE FROM analysis_results');
            
            const selectStmt = this.sqliteDb.prepare(`
                SELECT id, file_id, markdown_report, chart_data, suggested_questions,
                       analysis_date, processing_time_ms, created_at, updated_at
                FROM analysis_results
                ORDER BY created_at
            `);

            const insertQuery = `
                INSERT INTO analysis_results (file_id, markdown_report, chart_data, suggested_questions,
                                            analysis_date, processing_time_ms, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `;

            let migratedCount = 0;
            const results = selectStmt.all();

            await this.pgClient.query('BEGIN');

            for (const result of results) {
                // Validate and prepare JSON data for JSONB columns
                // PostgreSQL requires valid JSON strings for JSONB columns
                let chartData = null;
                if (result.chart_data) {
                    try {
                        // Ensure it's a valid JSON string for PostgreSQL JSONB
                        JSON.parse(result.chart_data); // Validate JSON
                        chartData = result.chart_data; // Use the original string
                    } catch (e) {
                        this.log(`Warning: Invalid JSON in chart_data for file ${result.file_id}. Setting to null.`, 'warn');
                    }
                }
                
                let suggestedQuestions = null;
                if (result.suggested_questions) {
                    try {
                        // Ensure it's a valid JSON string for PostgreSQL JSONB
                        JSON.parse(result.suggested_questions); // Validate JSON
                        suggestedQuestions = result.suggested_questions; // Use the original string
                    } catch (e) {
                        this.log(`Warning: Invalid JSON in suggested_questions for file ${result.file_id}. Setting to null.`, 'warn');
                    }
                }
                
                // Convert datetime strings
                const analysisDate = this.convertDateTime(result.analysis_date);
                const createdAt = this.convertDateTime(result.created_at);
                const updatedAt = this.convertDateTime(result.updated_at);

                await this.pgClient.query(insertQuery, [
                    result.file_id,
                    result.markdown_report,
                    chartData,
                    suggestedQuestions,
                    analysisDate,
                    result.processing_time_ms,
                    createdAt,
                    updatedAt
                ]);

                migratedCount++;
                if (migratedCount % 100 === 0) {
                    this.log(`📊 Migrated ${migratedCount}/${totalResults} analysis results`);
                }
            }

            await this.pgClient.query('COMMIT');
            this.log(`✅ Successfully migrated ${migratedCount} analysis results`);
            
        } catch (error) {
            await this.pgClient.query('ROLLBACK');
            this.log(`❌ Analysis results migration failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Migrate chat_messages table
     */
    async migrateChatMessages() {
        try {
            this.log('💬 Starting chat messages migration...');
            
            const countResult = this.sqliteDb.prepare('SELECT COUNT(*) as count FROM chat_messages').get();
            const totalMessages = countResult.count;
            
            if (totalMessages === 0) {
                this.log('ℹ️  No chat messages to migrate');
                return;
            }

            // Clear existing data
            await this.pgClient.query('DELETE FROM chat_messages');
            
            const selectStmt = this.sqliteDb.prepare(`
                SELECT id, file_id, role, message_text, message_order, timestamp, created_at
                FROM chat_messages
                ORDER BY file_id, message_order
            `);

            const insertQuery = `
                INSERT INTO chat_messages (file_id, role, message_text, message_order, timestamp, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)
            `;

            let migratedCount = 0;
            const messages = selectStmt.all();

            await this.pgClient.query('BEGIN');

            for (const message of messages) {
                // Convert datetime strings
                const timestamp = this.convertDateTime(message.timestamp);
                const createdAt = this.convertDateTime(message.created_at);

                await this.pgClient.query(insertQuery, [
                    message.file_id,
                    message.role,
                    message.message_text,
                    message.message_order,
                    timestamp,
                    createdAt
                ]);

                migratedCount++;
                if (migratedCount % 500 === 0) {
                    this.log(`💬 Migrated ${migratedCount}/${totalMessages} chat messages`);
                }
            }

            await this.pgClient.query('COMMIT');
            this.log(`✅ Successfully migrated ${migratedCount} chat messages`);
            
        } catch (error) {
            await this.pgClient.query('ROLLBACK');
            this.log(`❌ Chat messages migration failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Validate migrated data integrity
     */
    async validateMigration() {
        if (!this.config.validateData) return;

        try {
            this.log('🔍 Validating migration integrity...');

            // Count records in both databases
            const sqliteCounts = {
                files: this.sqliteDb.prepare('SELECT COUNT(*) as count FROM files').get().count,
                analysis_results: this.sqliteDb.prepare('SELECT COUNT(*) as count FROM analysis_results').get().count,
                chat_messages: this.sqliteDb.prepare('SELECT COUNT(*) as count FROM chat_messages').get().count
            };

            const pgCounts = {
                files: (await this.pgClient.query('SELECT COUNT(*) as count FROM files')).rows[0].count,
                analysis_results: (await this.pgClient.query('SELECT COUNT(*) as count FROM analysis_results')).rows[0].count,
                chat_messages: (await this.pgClient.query('SELECT COUNT(*) as count FROM chat_messages')).rows[0].count
            };

            // Validate counts match
            for (const table of ['files', 'analysis_results', 'chat_messages']) {
                if (parseInt(sqliteCounts[table]) !== parseInt(pgCounts[table])) {
                    throw new Error(`Record count mismatch in ${table}: SQLite=${sqliteCounts[table]}, PostgreSQL=${pgCounts[table]}`);
                }
            }

            // Validate foreign key relationships
            const orphanedAnalysis = await this.pgClient.query(`
                SELECT COUNT(*) as count FROM analysis_results ar 
                LEFT JOIN files f ON ar.file_id = f.id 
                WHERE f.id IS NULL
            `);

            const orphanedMessages = await this.pgClient.query(`
                SELECT COUNT(*) as count FROM chat_messages cm 
                LEFT JOIN files f ON cm.file_id = f.id 
                WHERE f.id IS NULL
            `);

            if (parseInt(orphanedAnalysis.rows[0].count) > 0) {
                throw new Error(`Found ${orphanedAnalysis.rows[0].count} orphaned analysis results`);
            }

            if (parseInt(orphanedMessages.rows[0].count) > 0) {
                throw new Error(`Found ${orphanedMessages.rows[0].count} orphaned chat messages`);
            }

            this.log('✅ Migration validation passed');
            
        } catch (error) {
            this.log(`❌ Migration validation failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Convert SQLite datetime string to PostgreSQL timestamp
     */
    convertDateTime(dateString) {
        if (!dateString) return null;
        
        // SQLite CURRENT_TIMESTAMP format: YYYY-MM-DD HH:MM:SS
        // PostgreSQL expects ISO format
        try {
            // Handle SQLite datetime format by treating it as UTC
            if (dateString.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
                // Add 'Z' to indicate UTC timezone for SQLite format
                const date = new Date(dateString + 'Z');
                return date.toISOString();
            } else {
                // Handle other date formats
                const date = new Date(dateString);
                return date.toISOString();
            }
        } catch (error) {
            this.log(`⚠️  Invalid date format: ${dateString}, using current timestamp`, 'warning');
            return new Date().toISOString();
        }
    }

    /**
     * Parse JSON string safely
     */
    parseJSON(jsonString) {
        if (!jsonString) return null;
        
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            this.log(`⚠️  Invalid JSON: ${jsonString.substring(0, 100)}...`, 'warning');
            return null;
        }
    }

    /**
     * Log migration progress and errors
     */
    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, level, message };
        
        this.migrationLog.push(logEntry);
        
        const prefix = {
            info: 'ℹ️ ',
            error: '❌',
            warning: '⚠️ ',
            success: '✅'
        }[level] || 'ℹ️ ';
        
        console.log(`${prefix} ${message}`);
    }

    /**
     * Save migration log to file
     */
    async saveMigrationLog() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const logPath = path.join(process.cwd(), `migration-log-${timestamp}.json`);
            
            fs.writeFileSync(logPath, JSON.stringify(this.migrationLog, null, 2));
            this.log(`📝 Migration log saved: ${logPath}`);
        } catch (error) {
            this.log(`❌ Failed to save migration log: ${error.message}`, 'error');
        }
    }

    /**
     * Cleanup connections
     */
    async cleanup() {
        try {
            if (this.sqliteDb) {
                this.sqliteDb.close();
                this.log('🔌 SQLite connection closed');
            }
            
            if (this.pgClient) {
                await this.pgClient.end();
                this.log('🔌 PostgreSQL connection closed');
            }
        } catch (error) {
            this.log(`❌ Cleanup error: ${error.message}`, 'error');
        }
    }

    /**
     * Run complete migration process
     */
    async migrate() {
        const startTime = Date.now();
        
        try {
            this.log('🚀 Starting PostgreSQL migration...');
            
            // Initialize connections
            await this.initialize();
            
            // Create backup
            await this.createBackup();
            
            // Setup PostgreSQL schema
            await this.setupPostgreSQLSchema();
            
            // Migrate data
            await this.migrateFiles();
            await this.migrateAnalysisResults();
            await this.migrateChatMessages();
            
            // Validate migration
            await this.validateMigration();
            
            const duration = (Date.now() - startTime) / 1000;
            this.log(`🎉 Migration completed successfully in ${duration.toFixed(2)} seconds`);
            
            return true;
            
        } catch (error) {
            this.log(`💥 Migration failed: ${error.message}`, 'error');
            throw error;
        } finally {
            await this.saveMigrationLog();
            await this.cleanup();
        }
    }
}

// CLI interface
if (require.main === module) {
    let postgresqlConfig;
    
    // Parse DATABASE_URL if provided, otherwise use individual env vars
    if (process.env.DATABASE_URL) {
        const url = new URL(process.env.DATABASE_URL);
        postgresqlConfig = {
            host: url.hostname,
            port: parseInt(url.port) || 5432,
            database: url.pathname.slice(1), // Remove leading slash
            user: url.username,
            password: url.password,
            ssl: url.searchParams.get('sslmode') === 'require' ? { rejectUnauthorized: false } : false
        };
    } else {
        postgresqlConfig = {
            host: process.env.PGHOST || 'localhost',
            port: parseInt(process.env.PGPORT) || 5432,
            database: process.env.PGDATABASE || 'deepdiveai',
            user: process.env.PGUSER || 'postgres',
            password: process.env.PGPASSWORD,
            ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false
        };
    }

    const config = {
        sqlitePath: process.env.SQLITE_PATH || path.join(process.cwd(), 'deepdive.db'),
        postgresql: postgresqlConfig,
        batchSize: parseInt(process.env.BATCH_SIZE) || 1000,
        validateData: process.env.VALIDATE_DATA !== 'false',
        createBackup: process.env.CREATE_BACKUP !== 'false'
    };

    const migrator = new PostgreSQLMigrator(config);
    
    migrator.migrate()
        .then(() => {
            console.log('\n✅ Migration completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Migration failed:', error.message);
            process.exit(1);
        });
}

module.exports = PostgreSQLMigrator;