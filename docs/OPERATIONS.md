# Operations Guide

**System:** OBE Management System  
**Version:** 1.0  
**Last Updated:** 2026-01-06

---

## Table of Contents

1. [Database Backup & Recovery](#database-backup--recovery)
2. [Health Monitoring](#health-monitoring)
3. [Rollback Procedures](#rollback-procedures)
4. [Troubleshooting](#troubleshooting)

---

## Database Backup & Recovery

### Automated Daily Backups

#### Windows (Task Scheduler)

**Setup:**
1. Open Task Scheduler (`taskschd.msc`)
2. Create Basic Task → Name: "OBE Database Backup"
3. Trigger: Daily at 2:00 AM
4. Action: Start a program
   - Program: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File "C:\path\to\scripts\backup-db.ps1"`
5. Run whether user is logged on or not
6. Run with highest privileges

**Test Execution:**
```powershell
cd C:\path\to\outcome-master
.\scripts\backup-db.ps1
```

#### Linux/Mac (Cron)

**Setup:**
```bash
# Edit crontab
crontab -e

# Add daily backup at 2:00 AM
0 2 * * * /path/to/outcome-master/scripts/backup-db.sh >> /var/log/obe-backup.log 2>&1
```

**Test Execution:**
```bash
cd /path/to/outcome-master
chmod +x scripts/backup-db.sh
./scripts/backup-db.sh
```

---

### Manual Backup

#### Windows
```powershell
.\scripts\backup-db.ps1
```

#### Linux/Mac
```bash
./scripts/backup-db.sh
```

**Custom Parameters:**
```powershell
# Windows - Custom backup location
.\scripts\backup-db.ps1 -BackupDir "D:\backups" -RetentionDays 60

# Linux - Environment variables
export BACKUP_DIR=/custom/path
export RETENTION_DAYS=60
./scripts/backup-db.sh
```

---

### Backup Verification

**Check Latest Backup:**
```powershell
# Windows
Get-ChildItem .\backups\db | Sort-Object LastWriteTime -Descending | Select-Object -First 1

# Linux
ls -lht ./backups/db | head -n 2
```

**Verify Backup Integrity:**
```bash
# Extract and check structure (test mode)
gzip -t backups/db/backup_20260106_020000.sql.gz
```

---

### Database Restore

> **⚠️ WARNING:** Restore will overwrite existing database. Create a backup first!

#### Windows
```powershell
# 1. Stop backend applications
docker stop obe-backend

# 2. Restore from backup
$BACKUP_FILE = ".\backups\db\backup_20260106_020000.sql.gz"
Get-Content $BACKUP_FILE | gzip -d | docker exec -i obe-postgres psql -U obe_user obe_db

# 3. Verify restore
docker exec obe-postgres psql -U obe_user -d obe_db -c "\dt"

# 4. Restart backend
docker start obe-backend
```

#### Linux/Mac
```bash
# 1. Stop backend applications
docker stop obe-backend

# 2. Restore from backup
BACKUP_FILE="./backups/db/backup_20260106_020000.sql.gz"
gunzip -c "$BACKUP_FILE" | docker exec -i obe-postgres psql -U obe_user obe_db

# 3. Verify restore
docker exec obe-postgres psql -U obe_user -d obe_db -c "\dt"

# 4. Restart backend
docker start obe-backend
```

---

### Backup Retention Policy

**Default:** 30 days  
**Storage Location:** `./backups/db/`  
**File Format:** `backup_YYYYMMDD_HHMMSS.sql.gz`  
**Automatic Cleanup:** Old backups deleted when script runs

**Space Monitoring:**
```bash
# Check backup directory size
du -sh ./backups/db/

# List all backups with sizes
du -h ./backups/db/*.sql.gz | sort -h
```

---

## Health Monitoring

### Application Health Checks

#### Health Endpoint
```bash
# Backend API
curl http://localhost:3000/api/health

# Expected Response (200 OK):
{
  "status": "healthy",
  "timestamp": "2026-01-06T...",
  "uptime": 123456,
  "environment": "production"
}
```

#### Database Health
```bash
# Check PostgreSQL connectivity
docker exec obe-postgres pg_isready -U obe_user

# Expected: obe-postgres:5432 - accepting connections
```

#### Docker Container Health
```bash
# Check all OBE containers
docker ps --filter "name=obe" --format "table {{.Names}}\t{{.Status}}\t{{.Health}}"

# Expected output:
# NAMES          STATUS              HEALTH
# obe-backend    Up X hours          healthy
# obe-frontend   Up X hours          N/A
# obe-postgres   Up X hours          healthy
```

---

### Monitoring Logs

#### Backend Application Logs
```bash
# Real-time logs
docker logs obe-backend --tail 100 -f

# Error logs only
docker logs obe-backend --tail 100 | grep -i error

# Winston log files (inside container)
docker exec obe-backend cat logs/error.log
docker exec obe-backend cat logs/combined.log
```

#### Database Logs
```bash
# PostgreSQL logs
docker logs obe-postgres --tail 100 -f

# Query activity
docker exec obe-postgres psql -U obe_user -d obe_db -c "SELECT * FROM pg_stat_activity;"
```

#### Frontend Logs
```bash
# Vite dev server logs
docker logs obe-frontend --tail 100 -f
```

---

### System Metrics

#### Database Size
```bash
docker exec obe-postgres psql -U obe_user -d obe_db -c "
SELECT 
    pg_size_pretty(pg_database_size('obe_db')) as db_size,
    count(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public';"
```

#### Active Connections
```bash
docker exec obe-postgres psql -U obe_user -d obe_db -c "
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE datname = 'obe_db';"
```

---

## Rollback Procedures

### Application Rollback

#### Docker Compose Rollback
```bash
# 1. Stop current deployment
docker-compose down

# 2. Checkout previous version
git checkout <previous-commit-hash>

# 3. Rebuild and restart
docker-compose up -d --build

# 4. Verify health
curl http://localhost:3000/api/health
```

#### Frontend-Only Rollback
```bash
# 1. Stop frontend
docker stop obe-frontend

# 2. Checkout previous frontend code
git checkout <commit-hash> -- src/ public/

# 3. Rebuild
npm run build

# 4. Restart
docker start obe-frontend
```

#### Backend-Only Rollback
```bash
# 1. Stop backend
docker stop obe-backend

# 2. Checkout previous backend code
git checkout <commit-hash> -- backend/

# 3. Rebuild
cd backend && npm run build && cd ..

# 4. Restart
docker start obe-backend
```

---

### Database Rollback

> **⚠️ CRITICAL:** Database rollback requires careful planning

**Pre-Rollback Checklist:**
- [ ] Create fresh backup BEFORE rollback
- [ ] Identify exact backup point to restore
- [ ] Notify all users (system will be unavailable)
- [ ] Stop all application services

**Execution:**
```bash
# 1. Create safety backup
./scripts/backup-db.sh

# 2. Stop applications
docker stop obe-backend obe-frontend

# 3. Restore from backup (see Database Restore section above)

# 4. Verify data integrity
docker exec obe-postgres psql -U obe_user -d obe_db -c "\dt"

# 5. Restart applications
docker start obe-postgres obe-backend obe-frontend

# 6. Verify health
curl http://localhost:3000/api/health
```

---

### Configuration Rollback

#### Environment Variables
```bash
# 1. Backup current .env
cp backend/.env backend/.env.backup

# 2. Restore previous .env
git checkout <commit> -- backend/.env

# 3. Restart backend
docker restart obe-backend
```

#### Docker Compose Configuration
```bash
# 1. Backup current config
cp docker-compose.yml docker-compose.yml.backup

# 2. Restore previous config
git checkout <commit> -- docker-compose.yml

# 3. Restart services
docker-compose down && docker-compose up -d
```

---

## Troubleshooting

### Common Issues

#### Database Connection Refused
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# If not running:
docker start obe-postgres

# Check logs
docker logs obe-postgres --tail 50
```

#### Backend 500 Errors
```bash
# Check backend logs
docker logs obe-backend --tail 100

# Check environment variables
docker exec obe-backend printenv | grep -E "DATABASE_URL|JWT_SECRET|NODE_ENV"

# Restart backend
docker restart obe-backend
```

#### Frontend Not Loading
```bash
# Check if frontend container is running
docker ps | grep frontend

# Check Vite dev server
docker logs obe-frontend --tail 50

# Rebuild frontend
npm run build
docker restart obe-frontend
```

#### Disk Space Issues
```bash
# Check disk usage
df -h

# Check Docker disk usage
docker system df

# Clean up old backup files
find ./backups/db -name "backup_*.sql.gz" -mtime +7 -delete

# Clean Docker (CAREFUL!)
docker system prune -a
```

---

### Emergency Contacts

**System Administrator:** `<admin-email>`  
**Database Administrator:** `<dba-email>`  
**Technical Lead:** `<tech-lead-email>`

---

### Maintenance Windows

**Scheduled Maintenance:** Sunday 12:00 AM - 4:00 AM  
**Backup Time:** Daily 2:00 AM  
**Expected Downtime:** < 5 minutes

---

## Security Notes

- ✅ All backup scripts are read-only (no schema modifications)
- ✅ Health checks do not expose sensitive data
- ✅ Logs are rotated automatically (30-day retention)
- ✅ Database credentials stored in `.env` (gitignored)
- ⚠️ Never commit backup files to version control
- ⚠️ Secure backup directory with appropriate permissions

---

**Document Version:** 1.0  
**Last Review:** 2026-01-06  
**Next Review:** 2026-04-06
