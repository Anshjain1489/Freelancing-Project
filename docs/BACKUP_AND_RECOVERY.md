# BACKUP AND RECOVERY GUIDE — CHAUDHARY KIRANA STORE

**Document Version:** 1.0.0  
**Effective Date:** August 29, 2026  
**Infrastructure:** Supabase PostgreSQL + Node.js API Service + Vite Web Application  

---

## 1. Overview & Operational Targets

This document outlines the backup and recovery procedures for the Chaudhary Kirana Store production database and application infrastructure.

### Operational Recovery Targets

| Metric | Target | Description |
| :--- | :---: | :--- |
| **Recovery Point Objective (RPO)** | **< 15 minutes** | Maximum allowable data loss window in case of major disaster. |
| **Recovery Time Objective (RTO)** | **< 30 minutes** | Target timeframe for restoring application functionality following downtime. |

---

## 2. Supabase Database Backup Strategy

### A. Automated Backups (AUTOMATED)
- **Supabase Daily Backups**: Managed Supabase projects execute automated daily physical database backups with point-in-time recovery (PITR) enabled.
- **Retention Period**: 7 days for Standard tier, 30 days for Enterprise tier.
- **Backup Verification**: Supabase continuously checks backup integrity via WAL (Write-Ahead Logging) archiving.

### B. Manual Database Export (`pg_dump`) (MANUAL / RECOMMENDED)
Execute pre-migration or scheduled logical database backups using the standard PostgreSQL `pg_dump` CLI tool:

```bash
# 1. Export Full Database Schema & Data to Compressed Dump
pg_dump "postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true" \
  --format=custom \
  --blobs \
  --verbose \
  --file="cks_backup_$(date +%Y%m%d_%H%M%S).dump"

# 2. Export Schema-Only (For Version Control & Auditing)
pg_dump "postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true" \
  --schema-only \
  --file="cks_schema_$(date +%Y%m%d_%H%M%S).sql"
```

---

## 3. Database Restoration Procedure

### Step 1: Prepare Clean Target Database
Ensure target PostgreSQL instance is reachable and `pg_restore` is available.

### Step 2: Restore from Dump File
```bash
# Restore Database from Custom Dump Format
pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname="postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres" \
  "cks_backup_YYYYMMDD_HHMMSS.dump"
```

### Step 3: Run Post-Restore Verification
```bash
# Verify schema migration history state
node backend/src/scripts/runMigrations.js

# Verify production health endpoint returns 200 OK
curl -s http://localhost:5000/health/ready
```

---

## 4. Secret & Credentials Backup Strategy

- **GitHub Secrets**: Primary secure store for CI/CD environment secrets.
- **Off-site Encrypted Backup**: Passwords and JWT secrets must be stored in an encrypted vault (1Password / HashiCorp Vault). Never commit secrets to Git repositories.
