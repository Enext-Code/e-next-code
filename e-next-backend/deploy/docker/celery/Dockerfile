FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Install system dependencies including weasyprint dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    python3-dev \
    python3-pip \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-xlib-2.0-dev \
    libffi-dev \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*


# Copy requirements first for better caching
COPY requirements/base.txt requirements/base.txt
COPY requirements/prod.txt requirements/prod.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements/prod.txt

# Copy application code
COPY . .

# Set Python path and environment variables
ENV PYTHONPATH=/app \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TZ=UTC

# Create non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

# Command for Celery worker
CMD ["celery", "-A", "app.celery_app.celery", "worker", \
    "--loglevel=info", \
    "--concurrency=4", \
    "--max-tasks-per-child=1000", \
    "--optimization=fair"]
