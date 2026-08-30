#!/usr/bin/env bash
#
# AgentOS Cloud Deployment Script
# Deploys the backend to Google Cloud Run via Artifact Registry.
#
set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────────────────

GCP_PROJECT_ID="${GCP_PROJECT_ID:-agent-os-507119}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="agent-os-backend"
REPO_NAME="agent-os-repo"
IMAGE_NAME="${REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}"

# ─── Colours ─────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[AgentOS]${NC} $1"; }
ok()   { echo -e "${GREEN}[  ✓  ]${NC} $1"; }
warn() { echo -e "${YELLOW}[ ⚠️  ]${NC} $1"; }
fail() { echo -e "${RED}[  ✗  ]${NC} $1"; exit 1; }

# ─── Pre-flight Checks ──────────────────────────────────────────────────────

log "Starting AgentOS deployment..."

# Check GCP_PROJECT_ID
if [ -z "${GCP_PROJECT_ID:-}" ]; then
    fail "GCP_PROJECT_ID is not set. Export it: export GCP_PROJECT_ID=your-project-id"
fi
ok "GCP_PROJECT_ID=${GCP_PROJECT_ID}"

# Check gcloud auth
if ! gcloud auth print-identity-token &>/dev/null; then
    fail "Not authenticated with gcloud. Run: gcloud auth login"
fi
ok "gcloud authenticated"

# Set active project
gcloud config set project "${GCP_PROJECT_ID}" --quiet
ok "Active project set to ${GCP_PROJECT_ID}"

# ─── Enable APIs ─────────────────────────────────────────────────────────────

log "Enabling required Google Cloud APIs..."

gcloud services enable \
    run.googleapis.com \
    firestore.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com \
    --quiet

ok "APIs enabled: Cloud Run, Firestore, Artifact Registry, Cloud Build"

# ─── Firestore Setup ─────────────────────────────────────────────────────────

log "Checking Firestore status..."

# Try to create Firestore in Native mode (will fail gracefully if it already exists)
if gcloud firestore databases describe --quiet 2>/dev/null; then
    ok "Firestore database already exists"
else
    log "Creating Firestore database in Native mode..."
    gcloud firestore databases create \
        --location="${REGION}" \
        --type=firestore-native \
        --quiet 2>/dev/null || warn "Firestore creation skipped (may already exist)"
    ok "Firestore initialised"
fi

# ─── Artifact Registry ───────────────────────────────────────────────────────

log "Setting up Artifact Registry..."

if gcloud artifacts repositories describe "${REPO_NAME}" \
    --location="${REGION}" --quiet 2>/dev/null; then
    ok "Artifact Registry repo '${REPO_NAME}' already exists"
else
    gcloud artifacts repositories create "${REPO_NAME}" \
        --repository-format=docker \
        --location="${REGION}" \
        --quiet
    ok "Created Artifact Registry repo '${REPO_NAME}'"
fi

# ─── Build & Push ─────────────────────────────────────────────────────────────

log "Building and pushing container image..."

cd "$(dirname "$0")/backend"

if command -v docker &>/dev/null && docker info &>/dev/null; then
    gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
    docker build -t "${IMAGE_NAME}:latest" .
    ok "Docker image built locally"
    docker push "${IMAGE_NAME}:latest"
    ok "Image pushed to ${IMAGE_NAME}:latest"
else
    log "Local Docker not running. Using Google Cloud Build (serverless build)..."
    gcloud builds submit --tag "${IMAGE_NAME}:latest" . --quiet
    ok "Image built and pushed via Google Cloud Build: ${IMAGE_NAME}:latest"
fi

# ─── Deploy to Cloud Run ─────────────────────────────────────────────────────

log "Deploying to Cloud Run..."

# Read GEMINI_API_KEY from .env if it exists
GEMINI_KEY="${GEMINI_API_KEY:-}"
if [ -z "${GEMINI_KEY}" ] && [ -f .env ]; then
    GEMINI_KEY=$(grep -E '^GEMINI_API_KEY=' .env | cut -d= -f2-)
fi

if [ -z "${GEMINI_KEY}" ]; then
    warn "GEMINI_API_KEY not found. Set it as an env var or in backend/.env"
fi

gcloud run deploy "${SERVICE_NAME}" \
    --image="${IMAGE_NAME}:latest" \
    --region="${REGION}" \
    --platform=managed \
    --allow-unauthenticated \
    --set-env-vars="GCP_PROJECT_ID=${GCP_PROJECT_ID},GEMINI_API_KEY=${GEMINI_KEY}" \
    --memory=1Gi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=3 \
    --quiet

ok "Backend deployed to Cloud Run"

# ─── Output ───────────────────────────────────────────────────────────────────

BACKEND_URL=$(gcloud run services describe "${SERVICE_NAME}" \
    --region="${REGION}" \
    --format='value(status.url)')

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  AgentOS Backend Deployed Successfully! 🚀${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}Backend URL:${NC}  ${BACKEND_URL}"
echo -e "  ${CYAN}Swagger UI:${NC}   ${BACKEND_URL}/docs"
echo -e "  ${CYAN}Health Check:${NC} ${BACKEND_URL}/"
echo ""
echo -e "  ${YELLOW}Angular Environment Config:${NC}"
echo ""
echo "  export const environment = {"
echo "    production: true,"
echo "    apiUrl: '${BACKEND_URL}'"
echo "  };"
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
