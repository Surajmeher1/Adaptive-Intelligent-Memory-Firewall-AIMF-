FROM python:3.13-slim

# Metadata
LABEL maintainer="AIMF Research Team"
LABEL description="AIMF FastAPI Backend"

# Set working directory
WORKDIR /app

# Install system dependencies required by spaCy and faiss-cpu
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (Docker layer cache optimization)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Download spaCy model
RUN python -m spacy download en_core_web_sm

# Copy application code
COPY . .

# Create data directory for SQLite and FAISS index persistence
RUN mkdir -p /app/data

# Set Python path
ENV PYTHONPATH=/app

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Run server
# Single worker: FAISS index is not multiprocess-safe
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
