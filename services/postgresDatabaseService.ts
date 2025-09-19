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
        // Initialize PostgreSQL connection pool
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
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
        try {
            const client = await this.pool.connect();
            
            // Create tables if they don't exist
            await client.query(`
                CREATE TABLE IF NOT EXISTS files (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    content TEXT NOT NULL,
                    file_size BIGINT,
                    upload_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                    last_accessed TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                );
            `);

            await client.query(`
                CREATE TABLE IF NOT EXISTS analysis_results (
                    id SERIAL PRIMARY KEY,
                    file_id TEXT NOT NULL,
                    markdown_report TEXT NOT NULL,
                    chart_data JSONB,
                    suggested_questions JSONB NOT NULL,
                    analysis_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                    processing_time_ms BIGINT,
                    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
                );
            `);

            await client.query(`
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id SERIAL PRIMARY KEY,
                    file_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    message_order INTEGER NOT NULL,
                    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
                );
            `);

            // Create indexes
            await client.query(`CREATE INDEX IF NOT EXISTS idx_files_upload_date ON files(upload_date);`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_analysis_results_file_id ON analysis_results(file_id);`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_analysis_results_analysis_date ON analysis_results(analysis_date);`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_file_id ON chat_messages(file_id);`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);`);

            client.release();
        } catch (error) {
            console.error('Failed to initialize PostgreSQL database:', error);
            throw error;
        }
    }

    // File operations
    public async insertFile(file: UploadedFile): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query(
                `INSERT INTO files (id, name, type, content, file_size, upload_date, last_accessed, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                [file.id, file.name, file.type, file.content, file.content?.length || 0]
            );
        } finally {
            client.release();
        }
    }

    public async getFile(id: string): Promise<DatabaseFile | null> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                `SELECT id, name, type, content, file_size, 
                        upload_date, last_accessed, created_at, updated_at
                 FROM files WHERE id = $1`,
                [id]
            );

            if (result.rows.length === 0) return null;

            const row = result.rows[0];
            return {
                id: row.id,
                name: row.name,
                type: row.type,
                content: row.content,
                isBinary: false, // PostgreSQL stores text content
                fileSize: row.file_size,
                uploadDate: row.upload_date.toISOString(),
                lastAccessed: row.last_accessed.toISOString(),
                createdAt: row.created_at.toISOString(),
                updatedAt: row.updated_at.toISOString()
            };
        } finally {
            client.release();
        }
    }

    public async getAllFiles(): Promise<DatabaseFile[]> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                `SELECT id, name, type, content, file_size,
                        upload_date, last_accessed, created_at, updated_at
                 FROM files ORDER BY upload_date DESC`
            );

            return result.rows.map(row => ({
                id: row.id,
                name: row.name,
                type: row.type,
                content: row.content,
                isBinary: false, // PostgreSQL stores text content
                fileSize: row.file_size,
                uploadDate: row.upload_date.toISOString(),
                lastAccessed: row.last_accessed.toISOString(),
                createdAt: row.created_at.toISOString(),
                updatedAt: row.updated_at.toISOString()
            }));
        } finally {
            client.release();
        }
    }

    public async deleteFile(id: string): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('DELETE FROM files WHERE id = $1', [id]);
        } finally {
            client.release();
        }
    }

    public async updateFileLastAccessed(id: string): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query(
                'UPDATE files SET last_accessed = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
                [id]
            );
        } finally {
            client.release();
        }
    }

    // Analysis operations
    public async insertAnalysisResult(fileId: string, result: AnalysisResult, processingTimeMs?: number): Promise<number> {
        const client = await this.pool.connect();
        try {
            const insertResult = await client.query(
                `INSERT INTO analysis_results (file_id, markdown_report, chart_data, suggested_questions, processing_time_ms, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
                [
                    fileId,
                    result.markdownReport,
                    result.chartData ? JSON.stringify(result.chartData) : null,
                    JSON.stringify(result.suggestedQuestions),
                    processingTimeMs
                ]
            );
            return insertResult.rows[0].id;
        } finally {
            client.release();
        }
    }

    public async getAnalysisResult(fileId: string): Promise<DatabaseAnalysisResult | null> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                `SELECT id, file_id, markdown_report, chart_data, suggested_questions,
                        analysis_date, processing_time_ms, created_at, updated_at
                 FROM analysis_results WHERE file_id = $1 ORDER BY analysis_date DESC LIMIT 1`,
                [fileId]
            );

            if (result.rows.length === 0) return null;

            const row = result.rows[0];
            return {
                id: row.id,
                fileId: row.file_id,
                markdownReport: row.markdown_report,
                chartData: row.chart_data,
                suggestedQuestions: row.suggested_questions,
                analysisDate: row.analysis_date.toISOString(),
                processingTimeMs: row.processing_time_ms,
                createdAt: row.created_at.toISOString(),
                updatedAt: row.updated_at.toISOString()
            };
        } finally {
            client.release();
        }
    }

    public async getAllAnalysisResults(): Promise<Record<string, AnalysisResult>> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                `SELECT DISTINCT ON (file_id) file_id, markdown_report, chart_data, suggested_questions
                 FROM analysis_results ORDER BY file_id, analysis_date DESC`
            );

            const analysisResults: Record<string, AnalysisResult> = {};
            for (const row of result.rows) {
                analysisResults[row.file_id] = {
                    markdownReport: row.markdown_report,
                    chartData: row.chart_data,
                    suggestedQuestions: row.suggested_questions
                };
            }
            return analysisResults;
        } finally {
            client.release();
        }
    }

    public async deleteAnalysisResults(fileId: string): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('DELETE FROM analysis_results WHERE file_id = $1', [fileId]);
        } finally {
            client.release();
        }
    }

    // Chat operations
    public async insertChatMessage(fileId: string, message: ChatMessage, order: number): Promise<number> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                `INSERT INTO chat_messages (file_id, role, content, message_order, timestamp, created_at)
                 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
                [fileId, message.role, message.text, order]
            );
            return result.rows[0].id;
        } finally {
            client.release();
        }
    }

    public async getChatHistory(fileId: string): Promise<ChatMessage[]> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                `SELECT role, content FROM chat_messages 
                 WHERE file_id = $1 ORDER BY message_order ASC`,
                [fileId]
            );

            return result.rows.map(row => ({
                role: row.role as 'user' | 'model',
                text: row.content
            }));
        } finally {
            client.release();
        }
    }

    public async getAllChatHistory(): Promise<Record<string, ChatMessage[]>> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                `SELECT file_id, role, content FROM chat_messages ORDER BY file_id, message_order ASC`
            );

            const chatHistory: Record<string, ChatMessage[]> = {};
            for (const row of result.rows) {
                if (!chatHistory[row.file_id]) {
                    chatHistory[row.file_id] = [];
                }
                chatHistory[row.file_id].push({
                    role: row.role as 'user' | 'model',
                    text: row.content
                });
            }
            return chatHistory;
        } finally {
            client.release();
        }
    }

    public async setChatHistory(fileId: string, messages: ChatMessage[]): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            // Delete existing messages
            await client.query('DELETE FROM chat_messages WHERE file_id = $1', [fileId]);
            
            // Insert new messages
            for (let i = 0; i < messages.length; i++) {
                await client.query(
                    `INSERT INTO chat_messages (file_id, role, content, message_order, timestamp, created_at)
                     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [fileId, messages[i].role, messages[i].text, i]
                );
            }
            
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    public async deleteChatHistory(fileId: string): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('DELETE FROM chat_messages WHERE file_id = $1', [fileId]);
        } finally {
            client.release();
        }
    }

    // Utility operations
    public async getStats(): Promise<{ totalFiles: number; totalAnalyses: number; totalMessages: number; dbSize: string }> {
        const client = await this.pool.connect();
        try {
            const [filesResult, analysesResult, messagesResult, sizeResult] = await Promise.all([
                client.query('SELECT COUNT(*) as count FROM files'),
                client.query('SELECT COUNT(*) as count FROM analysis_results'),
                client.query('SELECT COUNT(*) as count FROM chat_messages'),
                client.query(`SELECT pg_size_pretty(pg_database_size(current_database())) as size`)
            ]);

            return {
                totalFiles: parseInt(filesResult.rows[0].count),
                totalAnalyses: parseInt(analysesResult.rows[0].count),
                totalMessages: parseInt(messagesResult.rows[0].count),
                dbSize: sizeResult.rows[0].size
            };
        } finally {
            client.release();
        }
    }

    public async backup(backupPath: string): Promise<void> {
        // For PostgreSQL, backup is typically handled by pg_dump
        // This is a placeholder - in production, you'd use pg_dump or managed backup
        console.log(`PostgreSQL backup requested to: ${backupPath}`);
        console.log('Note: PostgreSQL backups should be handled via pg_dump or managed database backups');
        
        // For now, we'll create a simple data export
        try {
            const stats = await this.getStats();
            const backupInfo = {
                timestamp: new Date().toISOString(),
                database: 'postgresql',
                stats: stats,
                note: 'Use pg_dump for full PostgreSQL backups'
            };
            
            // In a real implementation, you'd use pg_dump here
            console.log('Backup info:', JSON.stringify(backupInfo, null, 2));
        } catch (error) {
            console.error('Backup operation failed:', error);
            throw error;
        }
    }

    public async testConnection(): Promise<boolean> {
        try {
            const client = await this.pool.connect();
            await client.query('SELECT 1');
            client.release();
            return true;
        } catch (error) {
            console.error('PostgreSQL connection test failed:', error);
            return false;
        }
    }

    public async close(): Promise<void> {
        await this.pool.end();
    }
}

export default PostgresDatabaseService;