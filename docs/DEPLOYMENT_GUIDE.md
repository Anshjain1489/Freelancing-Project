# PRODUCTION DEPLOYMENT GUIDE — CHAUDHARY KIRANA STORE

**Project:** Chaudhary Kirana Store  
**Version:** 1.0.0  

---

## 1. Pre-Deployment Prerequisites

Ensure the following infrastructure resources are provisioned before deployment:

1. **Supabase PostgreSQL Project**: Created with transaction pooler enabled (`port 6543`, `pgbouncer=true`).
2. **GitHub Repository**: Secrets configured under **Settings ➔ Secrets and variables ➔ Actions**:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`
   - `JWT_ACCESS_SECRET` (32+ chars)
   - `JWT_REFRESH_SECRET` (32+ chars)
3. **Web Hosting Platform**: Vercel, Netlify, or Docker Container hosting for frontend and backend Node.js.

---

## 2. Step-by-Step Production Deployment Sequence

### Step 1: Database Migration
Execute production database migrations:
```bash
cd backend
npm ci
node src/scripts/runMigrations.js
```

### Step 2: Environment Pre-Deployment Audit
Run environment integrity audit:
```bash
node src/scripts/preDeploymentCheck.js
```

### Step 3: Run Automated QA Suites
Run full QA verification:
```bash
node src/test_phase43_production_qa.js
```

### Step 4: Build Production Frontend Assets
```bash
cd frontend
npm ci
npm run build
```

### Step 5: Post-Deployment Smoke Check
Verify operational endpoints:
```bash
curl -s https://api.chaudharykiranastore.com/health/ready
```
Expected output:
```json
{
  "status": "ready",
  "checks": {
    "database": "healthy",
    "supabase": "healthy",
    "configuration": "healthy"
  }
}
```
