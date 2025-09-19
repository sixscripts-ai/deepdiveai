#!/bin/bash

# Start the database server in the background
echo "Starting database server..."
npm run db:server &
DB_PID=$!

# Wait a moment for the database server to start
sleep 3

# Start the Vite development server
echo "Starting Vite development server..."
npm run dev &
VITE_PID=$!

# Function to cleanup processes on exit
cleanup() {
    echo "Shutting down servers..."
    kill $DB_PID 2>/dev/null
    kill $VITE_PID 2>/dev/null
    exit
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait $DB_PID $VITE_PID