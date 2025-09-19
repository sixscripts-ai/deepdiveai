import type { UploadedFile, ChatMessage, AnalysisResult } from '../types';

const API_BASE = '/api';

export interface DatabaseStats {
    totalFiles: number;
    totalAnalyses: number;
    totalMessages: number;
    dbSize: string;
}

class DatabaseClient {
    private static instance: DatabaseClient;

    private constructor() {}

    public static getInstance(): DatabaseClient {
        if (!DatabaseClient.instance) {
            DatabaseClient.instance = new DatabaseClient();
        }
        return DatabaseClient.instance;
    }

    private async request<T>(endpoint: string, options: RequestInit = {}, retries = 3): Promise<T> {
        const url = `${API_BASE}${endpoint}`;
        
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
                
                const response = await fetch(url, {
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers,
                    },
                    signal: controller.signal,
                    ...options,
                });
                
                clearTimeout(timeoutId);

                if (!response.ok) {
                    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
                    throw new Error(error.error || `HTTP ${response.status}`);
                }

                return response.json();
            } catch (error) {
                console.warn(`Database request attempt ${attempt}/${retries} failed:`, error);
                
                if (attempt === retries) {
                    // On final failure, throw a user-friendly error
                    if (error instanceof Error && error.name === 'AbortError') {
                        throw new Error('Database connection timeout. Please check your connection.');
                    }
                    throw new Error('Database connection failed. Operating in offline mode.');
                }
                
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
        
        throw new Error('Database connection failed after all retries.');
    }

    // Health check
    async healthCheck(): Promise<{ status: string; timestamp: string }> {
        return this.request('/health');
    }

    // Database stats
    async getStats(): Promise<DatabaseStats> {
        return this.request('/stats');
    }

    // File operations
    async getAllFiles(): Promise<UploadedFile[]> {
        return this.request('/files');
    }

    async getFile(id: string): Promise<UploadedFile | null> {
        try {
            return await this.request(`/files/${id}`);
        } catch (error) {
            if (error instanceof Error && error.message.includes('404')) {
                return null;
            }
            throw error;
        }
    }

    async uploadFile(file: UploadedFile): Promise<void> {
        await this.request('/files', {
            method: 'POST',
            body: JSON.stringify(file),
        });
    }

    async deleteFile(id: string): Promise<void> {
        await this.request(`/files/${id}`, {
            method: 'DELETE',
        });
    }

    async updateFileAccess(id: string): Promise<void> {
        await this.request(`/files/${id}/access`, {
            method: 'PUT',
        });
    }

    // Analysis results operations
    async getAllAnalysisResults(): Promise<Record<string, AnalysisResult>> {
        return this.request('/analysis');
    }

    async getAnalysisResult(fileId: string): Promise<AnalysisResult | null> {
        try {
            const result = await this.request<any>(`/analysis/${fileId}`);
            return {
                markdownReport: result.markdownReport,
                chartData: result.chartData,
                suggestedQuestions: result.suggestedQuestions,
            };
        } catch (error) {
            if (error instanceof Error && error.message.includes('404')) {
                return null;
            }
            throw error;
        }
    }

    async saveAnalysisResult(fileId: string, result: AnalysisResult, processingTimeMs?: number): Promise<void> {
        await this.request('/analysis', {
            method: 'POST',
            body: JSON.stringify({ fileId, result, processingTimeMs }),
        });
    }

    async deleteAnalysisResults(fileId: string): Promise<void> {
        await this.request(`/analysis/${fileId}`, {
            method: 'DELETE',
        });
    }

    // Chat history operations
    async getAllChatHistory(): Promise<Record<string, ChatMessage[]>> {
        return this.request('/chat');
    }

    async getChatHistory(fileId: string): Promise<ChatMessage[]> {
        return this.request(`/chat/${fileId}`);
    }

    async setChatHistory(fileId: string, messages: ChatMessage[]): Promise<void> {
        await this.request(`/chat/${fileId}`, {
            method: 'POST',
            body: JSON.stringify({ messages }),
        });
    }

    async deleteChatHistory(fileId: string): Promise<void> {
        await this.request(`/chat/${fileId}`, {
            method: 'DELETE',
        });
    }

    // Backup operation
    async createBackup(backupPath?: string): Promise<{ message: string; path: string }> {
        return this.request('/backup', {
            method: 'POST',
            body: JSON.stringify({ backupPath }),
        });
    }

    // Migration helper - move data from localStorage to database
    async migrateFromLocalStorage(): Promise<void> {
        try {
            // Migrate files
            const savedFiles = localStorage.getItem('deepdive-trading-files');
            if (savedFiles) {
                const files: UploadedFile[] = JSON.parse(savedFiles);
                for (const file of files) {
                    try {
                        await this.uploadFile(file);
                    } catch (error) {
                        console.warn(`Failed to migrate file ${file.name}:`, error);
                    }
                }
                console.log(`Migrated ${files.length} files from localStorage`);
            }

            // Migrate analysis results
            const savedReports = localStorage.getItem('deepdive-trading-reports');
            if (savedReports) {
                const reports: Record<string, AnalysisResult> = JSON.parse(savedReports);
                for (const [fileId, result] of Object.entries(reports)) {
                    try {
                        await this.saveAnalysisResult(fileId, result);
                    } catch (error) {
                        console.warn(`Failed to migrate analysis result for file ${fileId}:`, error);
                    }
                }
                console.log(`Migrated ${Object.keys(reports).length} analysis results from localStorage`);
            }

            // Migrate chat history
            const savedChats = localStorage.getItem('deepdive-trading-chats');
            if (savedChats) {
                const chats: Record<string, ChatMessage[]> = JSON.parse(savedChats);
                for (const [fileId, messages] of Object.entries(chats)) {
                    try {
                        await this.setChatHistory(fileId, messages);
                    } catch (error) {
                        console.warn(`Failed to migrate chat history for file ${fileId}:`, error);
                    }
                }
                console.log(`Migrated chat history for ${Object.keys(chats).length} files from localStorage`);
            }

            // Clear localStorage after successful migration
            localStorage.removeItem('deepdive-trading-files');
            localStorage.removeItem('deepdive-trading-reports');
            localStorage.removeItem('deepdive-trading-chats');
            
            console.log('Migration from localStorage completed successfully');
        } catch (error) {
            console.error('Migration from localStorage failed:', error);
            throw error;
        }
    }
}

export default DatabaseClient;