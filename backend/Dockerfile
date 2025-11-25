# Dockerfile for DuThi Backend on Cloud Run
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for better caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
# .dockerignore will automatically exclude env.yaml, .env, and other sensitive files
# API keys should be set via Cloud Run Environment Variables, NOT in Docker image
COPY . .

# Create tmp_uploads directory
RUN mkdir -p tmp_uploads

# Cloud Run provides PORT environment variable
ENV PORT=8080
ENV FASTAPI_HOST=0.0.0.0
ENV FASTAPI_PORT=8080

# Run with uvicorn
# Cloud Run automatically sets $PORT
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers 2

