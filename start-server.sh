#!/bin/bash
# Start the Nightmare UI development server
# This script ensures the server is running and accessible on the network

cd "$(dirname "$0")"

echo "Starting Nightmare UI server..."
echo "Access at: http://192.168.1.199:5173"
echo "Press Ctrl+C to stop"
echo ""

# Check if port is already in use
if lsof -i :5173 >/dev/null 2>&1; then
    echo "⚠️  Port 5173 is already in use. Stopping existing process..."
    pkill -f "vite.*5173" || true
    sleep 2
fi

# Start the server
npm run dev


