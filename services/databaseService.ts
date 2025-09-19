import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
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
    chartData: any | null; // TODO: Replace with proper ChartData type from types.ts
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

class DatabaseService {
    private db: Database.Database;
    private static instance: DatabaseService;

    private constructor() {
        // Create database in the project root
        const dbPath = join(process.cwd(), 'deepdive.db');
        this.db = new Database(dbPath);
        
        // Enable foreign keys
        this.db.pragma('foreign_keys = ON');
        
        // Initialize database schema
        this.initializeDatabase();
    }

    public static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    private initializeDatabase(): void {
        try {
            // Read and execute schema
            const schemaPath = join(process.cwd(), 'database', 'schema.sql');
            const schema = readFileSync(schemaPath, 'utf-8');
            this.db.exec(schema);
            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }

    // File operations
    public insertFile(file: UploadedFile): void {
        const stmt = this.db.prepare(`
            INSERT INTO files (id, name, type, content, is_binary, file_size)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        const fileSize = new Blob([file.content]).size;
        stmt.run(file.id, file.name, file.type, file.content, file.isBinary ? 1 : 0, fileSize);
    }

    public getFile(id: string): DatabaseFile | null {
        const stmt = this.db.prepare(`
            SELECT id, name, type, content, is_binary as isBinary, file_size as fileSize,
                   upload_date as uploadDate, last_accessed as lastAccessed,
                   created_at as createdAt, updated_at as updatedAt
            FROM files WHERE id = ?
        `);
        
        const result = stmt.get(id) as any;
        if (!result) return null;
        
        return {
            ...result,
            isBinary: Boolean(result.isBinary)
        };
    }

    public getAllFiles(): DatabaseFile[] {
        const stmt = this.db.prepare(`
            SELECT id, name, type, content, is_binary as isBinary, file_size as fileSize,
                   upload_date as uploadDate, last_accessed as lastAccessed,
                   created_at as createdAt, updated_at as updatedAt
            FROM files ORDER BY upload_date DESC
        `);
        
        const results = stmt.all() as any[];
        return results.map(result => ({
            ...result,
            isBinary: Boolean(result.isBinary)
        }));
    }

    public deleteFile(id: string): void {
        const stmt = this.db.prepare('DELETE FROM files WHERE id = ?');
        stmt.run(id);
    }

    public updateFileLastAccessed(id: string): void {
        const stmt = this.db.prepare('UPDATE files SET last_accessed = CURRENT_TIMESTAMP WHERE id = ?');
        stmt.run(id);
    }

    // Analysis results operations
    public insertAnalysisResult(fileId: string, result: AnalysisResult, processingTimeMs?: number): number {
        const stmt = this.db.prepare(`
            INSERT INTO analysis_results (file_id, markdown_report, chart_data, suggested_questions, processing_time_ms)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        const info = stmt.run(
            fileId,
            result.markdownReport,
            result.chartData ? JSON.stringify(result.chartData) : null,
            JSON.stringify(result.suggestedQuestions),
            processingTimeMs
        );
        
        return info.lastInsertRowid as number;
    }

    public getAnalysisResult(fileId: string): DatabaseAnalysisResult | null {
        const stmt = this.db.prepare(`
            SELECT id, file_id as fileId, markdown_report as markdownReport,
                   chart_data as chartData, suggested_questions as suggestedQuestions,
                   analysis_date as analysisDate, processing_time_ms as processingTimeMs,
                   created_at as createdAt, updated_at as updatedAt
            FROM analysis_results WHERE file_id = ? ORDER BY analysis_date DESC LIMIT 1
        `);
        
        const result = stmt.get(fileId) as any;
        if (!result) return null;
        
        return {
            ...result,
            chartData: result.chartData ? JSON.parse(result.chartData) : null,
            suggestedQuestions: JSON.parse(result.suggestedQuestions)
        };
    }

    public getAllAnalysisResults(): Record<string, AnalysisResult> {
        const stmt = this.db.prepare(`
            SELECT DISTINCT file_id as fileId, markdown_report as markdownReport,
                   chart_data as chartData, suggested_questions as suggestedQuestions
            FROM analysis_results 
            WHERE (file_id, analysis_date) IN (
                SELECT file_id, MAX(analysis_date) 
                FROM analysis_results 
                GROUP BY file_id
            )
        `);
        
        const results = stmt.all() as any[];
        const analysisResults: Record<string, AnalysisResult> = {};
        
        results.forEach(result => {
            analysisResults[result.fileId] = {
                markdownReport: result.markdownReport,
                chartData: result.chartData ? JSON.parse(result.chartData) : null,
                suggestedQuestions: JSON.parse(result.suggestedQuestions)
            };
        });
        
        return analysisResults;
    }

    public deleteAnalysisResults(fileId: string): void {
        const stmt = this.db.prepare('DELETE FROM analysis_results WHERE file_id = ?');
        stmt.run(fileId);
    }

    // Chat messages operations
    public insertChatMessage(fileId: string, message: ChatMessage, order: number): number {
        const stmt = this.db.prepare(`
            INSERT INTO chat_messages (file_id, role, message_text, message_order)
            VALUES (?, ?, ?, ?)
        `);
        
        const info = stmt.run(fileId, message.role, message.text, order);
        return info.lastInsertRowid as number;
    }

    public getChatHistory(fileId: string): ChatMessage[] {
        const stmt = this.db.prepare(`
            SELECT role, message_text as text
            FROM chat_messages 
            WHERE file_id = ? 
            ORDER BY message_order ASC
        `);
        
        return stmt.all(fileId) as ChatMessage[];
    }

    public getAllChatHistory(): Record<string, ChatMessage[]> {
        const stmt = this.db.prepare(`
            SELECT file_id as fileId, role, message_text as text
            FROM chat_messages 
            ORDER BY file_id, message_order ASC
        `);
        
        const results = stmt.all() as any[];
        const chatHistory: Record<string, ChatMessage[]> = {};
        
        results.forEach(result => {
            if (!chatHistory[result.fileId]) {
                chatHistory[result.fileId] = [];
            }
            chatHistory[result.fileId].push({
                role: result.role,
                text: result.text
            });
        });
        
        return chatHistory;
    }

    public setChatHistory(fileId: string, messages: ChatMessage[]): void {
        // Delete existing messages for this file
        const deleteStmt = this.db.prepare('DELETE FROM chat_messages WHERE file_id = ?');
        deleteStmt.run(fileId);
        
        // Insert new messages
        const insertStmt = this.db.prepare(`
            INSERT INTO chat_messages (file_id, role, message_text, message_order)
            VALUES (?, ?, ?, ?)
        `);
        
        messages.forEach((message, index) => {
            insertStmt.run(fileId, message.role, message.text, index);
        });
    }

    public deleteChatHistory(fileId: string): void {
        const stmt = this.db.prepare('DELETE FROM chat_messages WHERE file_id = ?');
        stmt.run(fileId);
    }

    // Utility operations
    public getStats(): { totalFiles: number; totalAnalyses: number; totalMessages: number; dbSize: string } {
        const filesCount = this.db.prepare('SELECT COUNT(*) as count FROM files').get() as any;
        const analysesCount = this.db.prepare('SELECT COUNT(*) as count FROM analysis_results').get() as any;
        const messagesCount = this.db.prepare('SELECT COUNT(*) as count FROM chat_messages').get() as any;
        
        // Get database file size
        const dbPath = join(process.cwd(), 'deepdive.db');
        let dbSize = '0 KB';
        try {
            const fs = require('fs');
            const stats = fs.statSync(dbPath);
            const sizeInBytes = stats.size;
            dbSize = sizeInBytes < 1024 ? `${sizeInBytes} B` :
                     sizeInBytes < 1024 * 1024 ? `${(sizeInBytes / 1024).toFixed(1)} KB` :
                     `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
        } catch (error) {
            console.warn('Could not get database size:', error);
        }
        
        return {
            totalFiles: filesCount.count,
            totalAnalyses: analysesCount.count,
            totalMessages: messagesCount.count,
            dbSize
        };
    }

    public backup(backupPath: string): void {
        this.db.backup(backupPath);
    }

    public close(): void {
        this.db.close();
    }
}

export default DatabaseService;