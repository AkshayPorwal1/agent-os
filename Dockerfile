# Stage 1: Build Angular Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build -- --configuration production

# Stage 2: Python Backend + Static Files
FROM python:3.11-slim
WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend/app/ ./app/

# Copy built frontend assets to /app/static
COPY --from=frontend-builder /build/frontend/dist/frontend/browser/ ./static/

# Environment configuration
ENV STATIC_DIR=/app/static
EXPOSE 8080

# Launch FastAPI app with Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
