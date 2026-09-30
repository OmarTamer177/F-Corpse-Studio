FROM python:3.11-slim

WORKDIR /app

# Install system dependencies needed for compiling or running
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    FLASK_ENV=production \
    PORT=5000 \
    HOST=0.0.0.0

EXPOSE 5000

# Healthcheck inside container
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Start production WSGI server
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "3", "--timeout", "60", "app:app"]
