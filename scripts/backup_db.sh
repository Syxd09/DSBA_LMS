#!/bin/bash

# Database Backup Script for EduMetrics
# Usage: ./backup_db.sh

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups"
DB_NAME="edumetrics"
DB_USER="postgres"
CONTAINER_NAME="edumetrics_db"

mkdir -p $BACKUP_DIR

echo "Starting backup for $DB_NAME at $TIMESTAMP..."

# Check if running in Docker
if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
    echo "Detected Docker container: $CONTAINER_NAME"
    docker exec $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
else
    echo "Running pg_dump locally..."
    pg_dump -U $DB_USER $DB_NAME > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
fi

if [ $? -eq 0 ]; then
    echo "✅ Backup successful: $BACKUP_DIR/db_backup_$TIMESTAMP.sql"
    
    # Retention Policy: Delete backups older than 7 days
    find $BACKUP_DIR -name "db_backup_*.sql" -mtime +7 -delete
    echo "Cleaned up backups older than 7 days."
else
    echo "❌ Backup failed!"
    exit 1
fi
