# EduMetrics Deployment Guide

## Overview
This guide routes you through deploying the **EduMetrics Outcome-Based Education (OBE) System** in a production environment using Docker and Docker Compose.

**Version**: 1.0.0
**Stack**: FastAPI (Backend), React (Frontend), PostgreSQL (Database), Redis (Cache)

---

## 📋 Prerequisites

Ensure the following are installed on your host server (Ubuntu 22.04 LTS recommended):

- **Docker Engine**: v24.0+
- **Docker Compose**: v2.20+
- **Git**: v2.40+
- **Hardware**: Min 2 vCPU, 4GB RAM, 20GB Disk

---

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/your-org/outcome-master.git
cd outcome-master
```

### 2. Configure Environment
Copy the example environment file and configure secrets:
```bash
cp .env.example .env
nano .env
```

**Critical Variables to Set:**
| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | Database password | `StrongPassword123!` |
| `SECRET_KEY` | JWT signing key | `openssl rand -hex 32` |
| `First_SUPERUSER_PASSWORD` | Initial admin password | `AdminSecurePass` |
| `DOMAIN` | Production domain | `edumetrics.university.edu` |

### 3. Build & Launch
```bash
# Build and start services in detached mode
docker compose up -d --build

# Verify services are running
docker compose ps
```

---

## 🏗️ Architecture & Services

The system runs as 4 containerized services:

| Service | Internal Port | External Port | Description |
|---------|---------------|---------------|-------------|
| `backend` | 8000 | 8000 (API) | FastAPI Application Server |
| `frontend` | 80 | 3000 (Web) | React Nginx Web Server |
| `db` | 5432 | 5432 | PostgreSQL 15 Database |
| `redis` | 6379 | - | Cache & Queue Broker |

---

## 🛡️ Maintenance & Operations

### Database Backups
Automate backups using a cron job:
```bash
# Manual Backup
docker exec -t outcome-master-db-1 pg_dump -U postgres edumetrics > backup_$(date +%F).sql

# Restore
cat backup_file.sql | docker exec -i outcome-master-db-1 psql -U postgres edumetrics
```

### Logs & Monitoring
View live logs for troubleshooting:
```bash
# Follow backend logs
docker compose logs -f backend

# Check database logs
docker compose logs -f db
```

### Application Updates
To deploy a new version:
```bash
git pull origin main
docker compose down
docker compose up -d --build
docker image prune -f  # Cleanup old images
```

---

## 🔧 Configuration Reference

### Backend (`.env`)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: JWT validity (default: 30)
- `SENTRY_DSN`: Error tracking URL (optional)
- `SMTP_xxx`: Email server settings for notifications

### Frontend
Frontend is built as a static application served by Nginx. Run-time configuration is injected via `window.env` or build-time `VITE_` variables.

---

## 🚑 Troubleshooting

**Issue**: API Connection Failed
- Check CORS settings in `main.py`.
- Verify `VITE_API_URL` in frontend matches your domain.

**Issue**: Database Connection Error
- Ensure `POSTGRES_HOST=db` in backend env.
- Check volume permissions: `sudo chown -R 999:999 postgres_data/`

**Issue**: "502 Bad Gateway" (Nginx)
- Backend container might be restarting. Check logs: `docker compose logs backend`.

---

## 🔒 Security Checklist
- [ ] Change all default passwords.
- [ ] Set `DEBUG=False` in `.env`.
- [ ] Configure SSL/TLS via external Reverse Proxy (Nginx/Traefik).
- [ ] Restrict database port (5432) access via firewall (UFW).
- [ ] Regularly update Docker images.
