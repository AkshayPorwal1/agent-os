#!/usr/bin/env bash
#
# AgentOS Local Development Launcher
# Starts both the FastAPI backend (port 8080) and the Angular frontend (port 4200) concurrently.
#

set -e

# Colours
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}====================================================${NC}"
echo -e "${GREEN}  🧠 Starting AgentOS Local Development Environment ${NC}"
echo -e "${CYAN}====================================================${NC}"
echo ""

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Trap Ctrl+C to kill child processes cleanly
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping all AgentOS processes...${NC}"
    kill 0
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 1. Start Backend
echo -e "${CYAN}[1/2] Starting FastAPI Backend on http://localhost:8080 ...${NC}"
cd "${ROOT_DIR}/backend"
if [ ! -d "venv" ]; then
    echo "Creating virtualenv..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Run Uvicorn in background
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload &
BACKEND_PID=$!

# Wait briefly for backend to initialize
sleep 2

# 2. Start Frontend
echo -e "${CYAN}[2/2] Starting Angular Frontend on http://localhost:4200 ...${NC}"
cd "${ROOT_DIR}/frontend"

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

echo ""
echo -e "${GREEN}✨ AgentOS is running!${NC}"
echo -e "   • Frontend:  ${CYAN}http://localhost:4200${NC}"
echo -e "   • Backend:   ${CYAN}http://localhost:8080${NC}"
echo -e "   • Swagger UI:${CYAN}http://localhost:8080/docs${NC}"
echo ""
echo -e "${YELLOW}Press [Ctrl+C] to stop both servers.${NC}"
echo ""

# Run Angular dev server with proxy configuration
npx ng serve --proxy-config proxy.conf.json --port 4200
