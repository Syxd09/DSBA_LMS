# Docker Setup Guide

## Prerequisites

- Docker Desktop (v20+)
- Docker Compose (v2+)
- 4GB RAM minimum

## Quick Start

```bash
# Clone repository
git clone <repository-url>
cd outcome-master

# Start all services
docker compose up -d

# Check status
docker compose ps
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| frontend | 5173 | React development server |
| backend | 8000 | FastAPI application |
| db | 5432 | PostgreSQL database |
| redis | 6379 | Redis cache |

## Environment Variables

Create `.env` file in project root:

```env
# Database
DB_HOST=db
DB_PORT=5432
DB_NAME=outcome
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_URL=redis://redis:6379/0

# Security
SECRET_KEY=your-super-secret-key-change-in-production
CSRF_SECRET=your-csrf-secret-key

# Application
ENVIRONMENT=development
DEBUG=true
ENABLE_CACHE=true
ENABLE_SCHEDULER=true

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:5173"]
```

## Common Commands

### Start Services
```bash
docker compose up -d
```

### Stop Services
```bash
docker compose down
```

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
```

### Rebuild Containers
```bash
docker compose build --no-cache
docker compose up -d
```

### Database Migrations
```bash
# Run migrations
docker compose exec backend alembic upgrade head

# Check current revision
docker compose exec backend alembic current

# Create new migration
docker compose exec backend alembic revision --autogenerate -m "description"
```

### Database Access
```bash
docker compose exec db psql -U postgres -d outcome
```

### Redis CLI
```bash
docker compose exec redis redis-cli
```

## Development Workflow

### Backend Changes
Backend auto-reloads on file changes (Uvicorn with --reload).

### Frontend Changes
Frontend uses Vite HMR for instant updates.

### Running Tests
```bash
# Backend tests
docker compose exec backend pytest -v

# Specific test file
docker compose exec backend pytest tests/test_auth.py -v
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port
lsof -i :8000

# Kill process or change port in docker-compose.yml
```

### Database Connection Issues
```bash
# Restart db and backend
docker compose restart db backend

# Check db logs
docker compose logs db
```

### Redis Connection Issues
```bash
# Check Redis is running
docker compose exec redis redis-cli ping
# Should return: PONG
```

### Clear Everything
```bash
# Stop and remove all containers, networks, volumes
docker compose down -v

# Start fresh
docker compose up -d
```

## Production Deployment

### 1. Prerequisites

- Linux server with Docker & Docker Compose
- Domain name with DNS configured
- SSL certificate (Let's Encrypt recommended)

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Generate secure keys
SECRET_KEY=$(openssl rand -hex 32)
CSRF_SECRET=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -hex 16)

# Edit .env with production values
nano .env
```

### 3. SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy to nginx/ssl directory
mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
```

### 4. Deploy

```bash
# Build production images
docker compose -f docker-compose.prod.yml build

# Start services
docker compose -f docker-compose.prod.yml up -d

# Run migrations
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

# Seed initial data (optional)
docker compose -f docker-compose.prod.yml exec backend python scripts/seed_pilot_data.py
```

### 5. Health Checks

```bash
# Check all services
docker compose -f docker-compose.prod.yml ps

# Backend health
curl http://localhost/health

# Nginx health
curl http://localhost/nginx-health

# Redis health
docker compose -f docker-compose.prod.yml exec redis redis-cli ping
```

### 6. Monitoring & Logs

```bash
# View all logs
docker compose -f docker-compose.prod.yml logs -f

# Backend logs only
docker compose -f docker-compose.prod.yml logs -f backend

# Error logs
docker compose -f docker-compose.prod.yml logs backend 2>&1 | grep -i error

# Resource usage
docker stats
```

### 7. Production Checklist

- [x] Change SECRET_KEY to 32+ character random value
- [x] Set CSRF_SECRET to unique value  
- [x] Set ENVIRONMENT=production
- [x] Set DEBUG=false
- [x] Configure strong database password
- [x] Set up SSL/TLS certificates
- [x] Configure proper CORS origins
- [x] Enable Redis caching (ENABLE_CACHE=true)
- [x] Enable scheduler (ENABLE_SCHEDULER=true)
- [x] Configure email settings for notifications
- [x] Set up log rotation
- [x] Configure backup strategy

### 8. Backup & Recovery

```bash
# Database backup
docker compose -f docker-compose.prod.yml exec db pg_dump -U postgres edumetrics > backup_$(date +%Y%m%d).sql

# Restore from backup
docker compose -f docker-compose.prod.yml exec -T db psql -U postgres edumetrics < backup_20260207.sql
```

### 9. Scaling

For high-traffic deployments:

```bash
# Scale backend replicas
docker compose -f docker-compose.prod.yml up -d --scale backend=3
```

Update `nginx/nginx.conf` upstream section to include multiple backends.

## Volume Persistence

Volumes are persisted across restarts:
- `postgres_data` - Database files
- `redis_data` - Redis cache data

To reset database:
```bash
docker compose down -v
docker compose up -d
docker compose exec backend alembic upgrade head
```

