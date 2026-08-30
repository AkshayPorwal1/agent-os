#!/usr/bin/env bash
#
# AgentOS — One-Click Local Launcher
# Starts FastAPI backend (port 8080) and Angular frontend (port 4200) concurrently.
#
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🧠 Starting AgentOS..."

# Trap SIGINT to kill background jobs cleanly
cleanup() {
    echo ""
    echo "🛑 Shutting down AgentOS..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 1. Start Backend
echo "🚀 Starting FastAPI Backend on http://localhost:8080..."
cd "$DIR/backend"
if [ ! -d "venv" ]; then
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi
uvicorn app.main:app --reload --port 8080 &
BACKEND_PID=$!

# Wait briefly for backend to initialize
sleep 2

# 2. Start Frontend
echo "🌐 Starting Angular Frontend on http://localhost:4200..."
cd "$DIR/frontend"
if [ ! -d "node_modules" ]; then
    npm install
fi
npm start &
FRONTEND_PID=$!

echo ""
echo "✨ AgentOS is running!"
echo "   • Frontend: http://localhost:4200"
echo "   • API Docs: http://localhost:8080/docs"
echo "   Press Ctrl+C to stop both servers."
echo ""

wait
