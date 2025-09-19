import express from 'express';
import cors from 'cors';
import path from 'path';
import DatabaseService from '../services/databaseService';
import type { UploadedFile } from '../types';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize database service
let db: DatabaseService;

try {
    db = DatabaseService.getInstance();
    console.log('Database service initialized successfully');
} catch (error) {
    console.error('Failed to initialize database service:', error);
    process.exit(1);
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database stats endpoint
app.get('/api/stats', (_req, res) => {
    try {
        const stats = db.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Error getting database stats:', error);
        res.status(500).json({ error: 'Failed to get database stats' });
    }
});

// File endpoints
app.get('/api/files', (_req, res) => {
    try {
        const files = db.getAllFiles();
        res.json(files);
    } catch (error) {
        console.error('Error getting files:', error);
        res.status(500).json({ error: 'Failed to get files' });
    }
});

app.get('/api/files/:id', (req, res) => {
    try {
        const file = db.getFile(req.params.id);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }
        res.json(file);
    } catch (error) {
        console.error('Error getting file:', error);
        res.status(500).json({ error: 'Failed to get file' });
    }
});

app.post('/api/files', (req, res) => {
    try {
        const file: UploadedFile = req.body;
        
        // Basic validation
        if (!file || !file.id || !file.name || !file.type || file.content === undefined) {
            return res.status(400).json({ error: 'Invalid file data: missing required fields' });
        }
        
        if (file.name.length > 255) {
            return res.status(400).json({ error: 'File name too long (max 255 characters)' });
        }
        
        db.insertFile(file);
        res.status(201).json({ message: 'File uploaded successfully', id: file.id });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

app.delete('/api/files/:id', (req, res) => {
    try {
        db.deleteFile(req.params.id);
        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

app.put('/api/files/:id/access', (req, res) => {
    try {
        db.updateFileLastAccessed(req.params.id);
        res.json({ message: 'File access updated' });
    } catch (error) {
        console.error('Error updating file access:', error);
        res.status(500).json({ error: 'Failed to update file access' });
    }
});

// Analysis results endpoints
app.get('/api/analysis', (_req, res) => {
    try {
        const results = db.getAllAnalysisResults();
        res.json(results);
    } catch (error) {
        console.error('Error getting analysis results:', error);
        res.status(500).json({ error: 'Failed to get analysis results' });
    }
});

app.get('/api/analysis/:fileId', (req, res) => {
    try {
        const result = db.getAnalysisResult(req.params.fileId);
        if (!result) {
            return res.status(404).json({ error: 'Analysis result not found' });
        }
        res.json(result);
    } catch (error) {
        console.error('Error getting analysis result:', error);
        res.status(500).json({ error: 'Failed to get analysis result' });
    }
});

app.post('/api/analysis', (req, res) => {
    try {
        const { fileId, result, processingTimeMs } = req.body;
        const id = db.insertAnalysisResult(fileId, result, processingTimeMs);
        res.status(201).json({ message: 'Analysis result saved', id });
    } catch (error) {
        console.error('Error saving analysis result:', error);
        res.status(500).json({ error: 'Failed to save analysis result' });
    }
});

app.delete('/api/analysis/:fileId', (req, res) => {
    try {
        db.deleteAnalysisResults(req.params.fileId);
        res.json({ message: 'Analysis results deleted' });
    } catch (error) {
        console.error('Error deleting analysis results:', error);
        res.status(500).json({ error: 'Failed to delete analysis results' });
    }
});

// Chat history endpoints
app.get('/api/chat', (_req, res) => {
    try {
        const chatHistory = db.getAllChatHistory();
        res.json(chatHistory);
    } catch (error) {
        console.error('Error getting chat history:', error);
        res.status(500).json({ error: 'Failed to get chat history' });
    }
});

app.get('/api/chat/:fileId', (req, res) => {
    try {
        const messages = db.getChatHistory(req.params.fileId);
        res.json(messages);
    } catch (error) {
        console.error('Error getting chat history:', error);
        res.status(500).json({ error: 'Failed to get chat history' });
    }
});

app.post('/api/chat/:fileId', (req, res) => {
    try {
        const { messages } = req.body;
        db.setChatHistory(req.params.fileId, messages);
        res.json({ message: 'Chat history updated' });
    } catch (error) {
        console.error('Error updating chat history:', error);
        res.status(500).json({ error: 'Failed to update chat history' });
    }
});

app.delete('/api/chat/:fileId', (req, res) => {
    try {
        db.deleteChatHistory(req.params.fileId);
        res.json({ message: 'Chat history deleted' });
    } catch (error) {
        console.error('Error deleting chat history:', error);
        res.status(500).json({ error: 'Failed to delete chat history' });
    }
});

// Backup endpoint
app.post('/api/backup', (req, res) => {
    try {
        const { backupPath } = req.body;
        const defaultPath = path.join(process.cwd(), `backup-${Date.now()}.db`);
        db.backup(backupPath || defaultPath);
        res.json({ message: 'Database backup created', path: backupPath || defaultPath });
    } catch (error) {
        console.error('Error creating backup:', error);
        res.status(500).json({ error: 'Failed to create backup' });
    }
});

// Error handling middleware
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Database API server running on http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log('  GET  /api/health - Health check');
    console.log('  GET  /api/stats - Database statistics');
    console.log('  GET  /api/files - Get all files');
    console.log('  POST /api/files - Upload file');
    console.log('  GET  /api/analysis - Get all analysis results');
    console.log('  POST /api/analysis - Save analysis result');
    console.log('  GET  /api/chat - Get all chat history');
    console.log('  POST /api/chat/:fileId - Update chat history');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down server...');
    db.close();
    process.exit(0);
});