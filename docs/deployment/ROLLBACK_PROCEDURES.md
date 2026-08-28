# Emergency Rollback & Disaster Recovery Procedures 🛡️

## 1. Trigger Conditions for Rollback
A production rollback must be initiated immediately if any of the following occur post-deployment:
- `/health/ready` endpoint returns status `503 SERVICE_NOT_READY`.
- Global error rate exceeds 2% of total API traffic.
- Data corruption or missing RLS security barrier is detected.

## 2. Fast Web App Rollback (PM2 / Frontend)
1. Rollback PM2 process to previous commit:
   ```bash
   git checkout tags/v1.0.0-previous
   pm2 restart cks-backend-api
   ```
2. Re-serve previous static frontend bundle:
   ```bash
   cp -r /var/www/backups/dist-previous /var/www/chaudhary-kirana/dist
   ```

## 3. Database Point-in-Time Recovery
1. Restore database snapshot from Supabase automated daily backups.
2. Run database migration verification:
   ```bash
   node backend/src/scripts/preDeploymentCheck.js
   ```
