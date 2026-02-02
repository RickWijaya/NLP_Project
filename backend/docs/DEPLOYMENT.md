# Deployment Guide

Guide for deploying the RAG Service to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Setup](#server-setup)
3. [Database Setup](#database-setup)
4. [Application Deployment](#application-deployment)
5. [Nginx Configuration](#nginx-configuration)
6. [SSL/HTTPS](#sslhttps)
7. [Systemd Service](#systemd-service)
8. [Docker Deployment](#docker-deployment)

---

## Prerequisites

- Ubuntu 22.04 LTS (or similar Linux server)
- Python 3.10+
- PostgreSQL 14+
- Nginx
- Domain name (for HTTPS)
- Groq API key

---

## Server Setup

### 1. Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Dependencies

```bash
# Python
sudo apt install python3.10 python3.10-venv python3-pip -y

# PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Nginx
sudo apt install nginx -y

# Build tools
sudo apt install build-essential libpq-dev -y
```

---

## Database Setup

### 1. Create Database and User

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE rag_service;
CREATE USER raguser WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE rag_service TO raguser;
\q
```

### 2. Update PostgreSQL Authentication

Edit `/etc/postgresql/14/main/pg_hba.conf`:

```
local   all   raguser   md5
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

---

## Application Deployment

### 1. Create Application User

```bash
sudo useradd -m -s /bin/bash ragservice
sudo su - ragservice
```

### 2. Clone/Upload Application

```bash
cd /home/ragservice
# Upload your code or clone from git
git clone https://your-repo.git rag_service
cd rag_service
```

### 3. Create Virtual Environment

```bash
python3.10 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Download NLP Models

```bash
python -m spacy download en_core_web_sm
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('wordnet')"
```

### 5. Configure Environment

```bash
nano .env
```

```env
DATABASE_URL=postgresql+asyncpg://raguser:secure_password_here@localhost:5432/rag_service
JWT_SECRET=your-very-long-random-secret-key-here
GROQ_API_KEY=gsk_your_groq_api_key
DEBUG=false
PORT=8000
```

### 6. Test Application

```bash
source venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

---

## Nginx Configuration

### 1. Create Site Configuration

```bash
sudo nano /etc/nginx/sites-available/ragservice
```

```nginx
server {
    listen 80;
    server_name your-domain.com api.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for SSE streaming
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    # Increase max upload size
    client_max_body_size 50M;
}
```

### 2. Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/ragservice /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## SSL/HTTPS

Use Certbot for free SSL:

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com -d api.your-domain.com
```

---

## Systemd Service

### 1. Create Service File

```bash
sudo nano /etc/systemd/system/ragservice.service
```

```ini
[Unit]
Description=RAG Service FastAPI Application
After=network.target postgresql.service

[Service]
Type=simple
User=ragservice
Group=ragservice
WorkingDirectory=/home/ragservice/rag_service
Environment="PATH=/home/ragservice/rag_service/venv/bin"
ExecStart=/home/ragservice/rag_service/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 2. Enable and Start

```bash
sudo systemctl daemon-reload
sudo systemctl enable ragservice
sudo systemctl start ragservice
sudo systemctl status ragservice
```

### 3. View Logs

```bash
sudo journalctl -u ragservice -f
```

---

## Docker Deployment

### Dockerfile

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download NLP models
RUN python -m spacy download en_core_web_sm
RUN python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('wordnet')"

# Copy application
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  db:
    image: postgres:14
    environment:
      POSTGRES_DB: rag_service
      POSTGRES_USER: raguser
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U raguser -d rag_service"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://raguser:secure_password@db:5432/rag_service
      JWT_SECRET: your-secret-key-here
      GROQ_API_KEY: ${GROQ_API_KEY}
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./uploads:/app/uploads
      - ./chroma_db:/app/chroma_db

volumes:
  postgres_data:
```

### Deploy with Docker

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop
docker-compose down
```

---

## Health Check

Verify deployment:

```bash
curl https://your-domain.com/health
```

Expected response:

```json
{"status": "healthy", "service": "rag-service", "version": "1.0.0"}
```

---

## Maintenance

### Backup Database

```bash
pg_dump -U raguser rag_service > backup_$(date +%Y%m%d).sql
```

### Update Application

```bash
cd /home/ragservice/rag_service
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart ragservice
```

### Monitor Resources

```bash
htop
sudo journalctl -u ragservice -f
```
