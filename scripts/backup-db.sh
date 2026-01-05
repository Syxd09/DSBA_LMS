#!/bin/bash
# ===============================================
# OBE System - Database Backup Script (Linux/Mac)
# ===============================================
# Purpose: Create PostgreSQL database backup via Docker
# Scope: Read-only operation, exports database to compressed file
# Execution: Manual or cron scheduler
# ===============================================

# Configuration
CONTAINER_NAME="${CONTAINER_NAME:-obe-postgres}"
DATABASE_NAME="${DATABASE_NAME:-obe_db}"
DATABASE_USER="${DATABASE_USER:-obe_user}"
BACKUP_DIR="${BACKUP_DIR:-./backups/db}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}"
}

log_info() { log "${GREEN}INFO${NC}" "$@"; }
log_warn() { log "${YELLOW}WARN${NC}" "$@"; }
log_error() { log "${RED}ERROR${NC}" "$@"; }

# ===============================================
# MAIN EXECUTION
# ===============================================

set -e  # Exit on error

log_info "==================================="
log_info "OBE Database Backup Started"
log_info "==================================="

# 1. Create backup directory
log_info "Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# 2. Verify Docker container is running
log_info "Checking Docker container: $CONTAINER_NAME"
if ! docker ps --filter "name=$CONTAINER_NAME" --format "{{.Names}}" | grep -q "$CONTAINER_NAME"; then
    log_error "Container $CONTAINER_NAME is not running"
    exit 1
fi

CONTAINER_STATUS=$(docker ps --filter "name=$CONTAINER_NAME" --format "{{.Status}}")
log_info "Container status: $CONTAINER_STATUS"

# 3. Generate backup filename
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql.gz"

# 4. Execute pg_dump via Docker
log_info "Executing pg_dump for database: $DATABASE_NAME"
log_info "Output file: $BACKUP_FILE"

docker exec "$CONTAINER_NAME" pg_dump -U "$DATABASE_USER" "$DATABASE_NAME" | \
    gzip > "$BACKUP_FILE"

if [ $? -ne 0 ]; then
    log_error "pg_dump failed"
    exit 1
fi

# 5. Verify backup file created
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file was not created: $BACKUP_FILE"
    exit 1
fi

FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log_info "Backup completed successfully"
log_info "File: $BACKUP_FILE"
log_info "Size: $FILE_SIZE"

# 6. Cleanup old backups (retention policy)
log_info "Cleaning up backups older than $RETENTION_DAYS days"
find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -print -delete | \
    while read -r file; do
        log_info "Deleted old backup: $(basename "$file")"
    done

log_info "==================================="
log_info "Backup Process Completed Successfully"
log_info "==================================="
exit 0
