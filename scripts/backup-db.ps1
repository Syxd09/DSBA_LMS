# ===============================================
# OBE System - Database Backup Script (Windows)
# ===============================================
# Purpose: Create PostgreSQL database backup via Docker
# Scope: Read-only operation, exports database to compressed file
# Execution: Manual or Windows Task Scheduler
# ===============================================

param(
    [string]$BackupDir = ".\backups\db",
    [string]$ContainerName = "obe-postgres",
    [string]$DatabaseName = "obe_db",
    [string]$DatabaseUser = "obe_user",
    [int]$RetentionDays = 30
)

# Configuration
$ErrorActionPreference = "Stop"
$DATE = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "$BackupDir\backup_$DATE.sql.gz"

# Logging
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Level] $Message"
}

# ===============================================
# MAIN EXECUTION
# ===============================================

try {
    Write-Log "==================================="
    Write-Log "OBE Database Backup Started"
    Write-Log "==================================="

    # 1. Create backup directory
    Write-Log "Creating backup directory: $BackupDir"
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

    # 2. Verify Docker container is running
    Write-Log "Checking Docker container: $ContainerName"
    $containerStatus = docker ps --filter "name=$ContainerName" --format "{{.Status}}"
    
    if (-not $containerStatus) {
        throw "Container $ContainerName is not running"
    }
    Write-Log "Container status: $containerStatus"

    # 3. Execute pg_dump via Docker
    Write-Log "Executing pg_dump for database: $DatabaseName"
    Write-Log "Output file: $BACKUP_FILE"
    
    docker exec $ContainerName pg_dump -U $DatabaseUser $DatabaseName | `
        & gzip > $BACKUP_FILE

    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed with exit code: $LASTEXITCODE"
    }

    # 4. Verify backup file created
    if (-not (Test-Path $BACKUP_FILE)) {
        throw "Backup file was not created: $BACKUP_FILE"
    }

    $fileSize = (Get-Item $BACKUP_FILE).Length
    $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
    Write-Log "Backup completed successfully"
    Write-Log "File: $BACKUP_FILE"
    Write-Log "Size: $fileSizeMB MB"

    # 5. Cleanup old backups (retention policy)
    Write-Log "Cleaning up backups older than $RetentionDays days"
    $cutoffDate = (Get-Date).AddDays(-$RetentionDays)
    
    Get-ChildItem $BackupDir -Filter "backup_*.sql.gz" | 
        Where-Object { $_.LastWriteTime -lt $cutoffDate } |
        ForEach-Object {
            Write-Log "Deleting old backup: $($_.Name)"
            Remove-Item $_.FullName -Force
        }

    Write-Log "==================================="
    Write-Log "Backup Process Completed Successfully"
    Write-Log "==================================="
    exit 0

} catch {
    Write-Log "BACKUP FAILED: $_" "ERROR"
    Write-Log "==================================="
    exit 1
}
