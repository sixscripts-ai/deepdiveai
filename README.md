<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1JmMDP5ACGBv0HyY90ZlqgwaYrY9qRspF

## Run Locally

**Prerequisites:**  Node.js

### Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key

3. Run the app with database:
   ```bash
   npm run dev:full
   ```
   Or use the startup script:
   ```bash
   ./start.sh
   ```

### Manual Setup

If you prefer to run services separately:

1. Start the database server:
   ```bash
   npm run db:server
   ```

2. In another terminal, start the frontend:
   ```bash
   npm run dev
   ```

## Database

This application uses **SQLite** for data persistence:

- **Database file**: `deepdive.db` (created automatically)
- **Location**: Project root directory
- **Features**:
  - Persistent file storage
  - Analysis results caching
  - Chat history preservation
  - Automatic migration from localStorage
  - Database backup functionality

### Database API

The database server runs on `http://localhost:3001` with the following endpoints:

- `GET /api/health` - Health check
- `GET /api/stats` - Database statistics
- `GET /api/files` - Get all uploaded files
- `POST /api/files` - Upload new file
- `GET /api/analysis/:fileId` - Get analysis results
- `POST /api/analysis` - Save analysis results
- `GET /api/chat/:fileId` - Get chat history
- `POST /api/chat/:fileId` - Update chat history
- `POST /api/backup` - Create database backup

### Fallback Mode

If the database server is unavailable, the application automatically falls back to localStorage for data persistence.
