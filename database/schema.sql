-- DeepDive AI Trading Analysis Database Schema
-- SQLite Database for storing uploaded files, analysis results, and chat history

-- Files table: stores uploaded trading data files
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    is_binary BOOLEAN NOT NULL DEFAULT 0,
    file_size INTEGER,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Analysis results table: stores AI-generated analysis reports
CREATE TABLE IF NOT EXISTS analysis_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id TEXT NOT NULL,
    markdown_report TEXT NOT NULL,
    chart_data TEXT, -- JSON string containing chart data
    suggested_questions TEXT, -- JSON array of suggested questions
    analysis_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    processing_time_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- Chat messages table: stores conversation history for each file
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'model')),
    message_text TEXT NOT NULL,
    message_order INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_files_upload_date ON files(upload_date);
CREATE INDEX IF NOT EXISTS idx_files_last_accessed ON files(last_accessed);
CREATE INDEX IF NOT EXISTS idx_analysis_results_file_id ON analysis_results(file_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_date ON analysis_results(analysis_date);
CREATE INDEX IF NOT EXISTS idx_chat_messages_file_id ON chat_messages(file_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_order ON chat_messages(file_id, message_order);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);

-- Triggers to automatically update the updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_files_timestamp 
    AFTER UPDATE ON files
    BEGIN
        UPDATE files SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_analysis_results_timestamp 
    AFTER UPDATE ON analysis_results
    BEGIN
        UPDATE analysis_results SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Trigger to update file last_accessed when analysis is performed
CREATE TRIGGER IF NOT EXISTS update_file_last_accessed 
    AFTER INSERT ON analysis_results
    BEGIN
        UPDATE files SET last_accessed = CURRENT_TIMESTAMP WHERE id = NEW.file_id;
    END;