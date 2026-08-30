# DISASTER RECOVERY PLAN — CHAUDHARY KIRANA STORE

**Document Version:** 1.0.0  
**Status:** PRODUCTION APPROVED  
**Owner:** Store Operations & Technical Support Team  

---

## 1. Incident Classification & Severity Levels

| Severity | Definition | Response Target | Example |
| :--- | :--- | :---: | :--- |
| **SEV-1 (Critical)** | Complete store application downtime or data loss | **< 15 Mins** | Database down, API unreachable, broad 500 errors |
| **SEV-2 (High)** | Core feature impaired (e.g. checkout or POS billing offline) | **< 30 Mins** | Payment gateway failing, delivery dispatch error |
| **SEV-3 (Medium)** | Non-critical feature degraded | **< 2 Hours** | Slow reporting queries, banner image upload issue |

---

## 2. Emergency Escalation Matrix & Contacts

- **Store Owner & Lead Operator**: Akash Chaudhary (`7897837095` / `7007550184`)
- **Technical Support Lead**: Technical Administrator (`admin@chaudharykiranastore.com`)
- **Supabase Cloud Status Page**: `https://status.supabase.com`
- **Vercel / Hosting Status Page**: `https://www.vercel-status.com`

---

## 3. Disaster Recovery Procedures

### Scenario A: Database Outage or Corruption
1. **Detect**: System Alert `DATABASE_UNAVAILABLE` triggered on `/admin/system-status`.
2. **Isolate**: Place store web app in Maintenance Mode if necessary.
3. **Restore**:
   - Navigate to Supabase Dashboard ➔ Settings ➔ Backups ➔ Point-in-Time Recovery.
   - Select point-in-time timestamp immediately prior to corrupting incident.
   - Click **Restore to timestamp**.
4. **Verify**: Execute `/health/ready` check to confirm database connection and table integrity.

### Scenario B: Application Rollback (Faulty Deployment)
1. **Identify**: High HTTP 5xx error rate or failed automated QA check post-deploy.
2. **Execute Rollback**:
   ```bash
   # Revert Git repository to last known good production tag
   git checkout tags/v1.0.0-release -b rollback-branch
   
   # Re-trigger GitHub Actions deployment workflow
   git push origin production --force
   ```
3. **Validate**: Run production QA test suite `node src/test_phase43_production_qa.js`.

### Scenario C: Compromised Secret or Credential Leak
1. **Revoke**: Immediately invalidate leaked JWT secrets or Supabase service keys.
2. **Rotate Secrets**:
   - Generate new 32+ character secrets using `crypto.randomBytes(32).toString('hex')`.
   - Update secrets in GitHub Actions Secrets and hosting provider settings.
3. **Restart API Service**: Trigger immediate rolling restart of the backend API.
4. **Audit**: Inspect `/admin/activity` logs for unauthorized administrative actions during the breach window.
