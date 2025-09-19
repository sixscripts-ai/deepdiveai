import DatabaseService from './databaseService';
import PostgresDatabaseService from './postgresDatabaseService';

// Common interface for both database services
export interface IDatabaseService {
    insertFile(file: any): Promise<void> | void;
    getFile(id: string): Promise<any> | any;
    getAllFiles(): Promise<any[]> | any[];
    deleteFile(id: string): Promise<void> | void;
    updateFileLastAccessed(id: string): Promise<void> | void;
    insertAnalysisResult(fileId: string, result: any, processingTimeMs?: number): Promise<number> | number;
    getAnalysisResult(fileId: string): Promise<any> | any;
    getAllAnalysisResults(): Promise<Record<string, any>> | Record<string, any>;
    deleteAnalysisResults(fileId: string): Promise<void> | void;
    insertChatMessage(fileId: string, message: any, order: number): Promise<number> | number;
    getChatHistory(fileId: string): Promise<any[]> | any[];
    getAllChatHistory(): Promise<Record<string, any[]>> | Record<string, any[]>;
    setChatHistory(fileId: string, messages: any[]): Promise<void> | void;
    deleteChatHistory(fileId: string): Promise<void> | void;
    getStats(): Promise<any> | any;
    backup(backupPath: string): Promise<void> | void;
    close(): Promise<void> | void;
}

// Wrapper class to provide consistent async interface
class DatabaseServiceWrapper implements IDatabaseService {
    private sqliteService: DatabaseService;

    constructor() {
        this.sqliteService = DatabaseService.getInstance();
    }

    async insertFile(file: any): Promise<void> {
        return this.sqliteService.insertFile(file);
    }

    async getFile(id: string): Promise<any> {
        return this.sqliteService.getFile(id);
    }

    async getAllFiles(): Promise<any[]> {
        return this.sqliteService.getAllFiles();
    }

    async deleteFile(id: string): Promise<void> {
        return this.sqliteService.deleteFile(id);
    }

    async updateFileLastAccessed(id: string): Promise<void> {
        return this.sqliteService.updateFileLastAccessed(id);
    }

    async insertAnalysisResult(fileId: string, result: any, processingTimeMs?: number): Promise<number> {
        return this.sqliteService.insertAnalysisResult(fileId, result, processingTimeMs);
    }

    async getAnalysisResult(fileId: string): Promise<any> {
        return this.sqliteService.getAnalysisResult(fileId);
    }

    async getAllAnalysisResults(): Promise<Record<string, any>> {
        return this.sqliteService.getAllAnalysisResults();
    }

    async deleteAnalysisResults(fileId: string): Promise<void> {
        return this.sqliteService.deleteAnalysisResults(fileId);
    }

    async insertChatMessage(fileId: string, message: any, order: number): Promise<number> {
        return this.sqliteService.insertChatMessage(fileId, message, order);
    }

    async getChatHistory(fileId: string): Promise<any[]> {
        return this.sqliteService.getChatHistory(fileId);
    }

    async getAllChatHistory(): Promise<Record<string, any[]>> {
        return this.sqliteService.getAllChatHistory();
    }

    async setChatHistory(fileId: string, messages: any[]): Promise<void> {
        return this.sqliteService.setChatHistory(fileId, messages);
    }

    async deleteChatHistory(fileId: string): Promise<void> {
        return this.sqliteService.deleteChatHistory(fileId);
    }

    async getStats(): Promise<any> {
        return this.sqliteService.getStats();
    }

    async backup(backupPath: string): Promise<void> {
        return this.sqliteService.backup(backupPath);
    }

    async close(): Promise<void> {
        return this.sqliteService.close();
    }
}

// Database factory function
export function createDatabaseService(): IDatabaseService {
    const isProduction = process.env.NODE_ENV === 'production';
    const hasPostgresUrl = !!process.env.DATABASE_URL;
    
    if (isProduction || hasPostgresUrl) {
        console.log('🐘 Using PostgreSQL database service');
        return PostgresDatabaseService.getInstance();
    } else {
        console.log('🗃️  Using SQLite database service (local development)');
        return new DatabaseServiceWrapper();
    }
}

// Export singleton instance
let databaseServiceInstance: IDatabaseService | null = null;

export function getDatabaseService(): IDatabaseService {
    if (!databaseServiceInstance) {
        databaseServiceInstance = createDatabaseService();
    }
    return databaseServiceInstance;
}

export default getDatabaseService;