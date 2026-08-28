# Chaudhary Kirana Store — Production Setup & Deployment Guide 🚀🏪

This guide provides end-to-end instructions for deploying the Chaudhary Kirana Store platform to a production environment.

## 1. Prerequisites
- **Node.js**: `v18.x` or `v20.x` LTS
- **Database**: Supabase PostgreSQL database instance
- **Storage**: Supabase Storage Bucket for product images and invoices
- **Web Domain**: SSL HTTPS domain (e.g. `https://chaudharykiranastore.com`)

## 2. Environment Variables Configuration

### Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env` and update the values:
```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://chaudharykiranastore.com
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
SUPABASE_URL=https://[REF].supabase.co
SUPABASE_ANON_KEY=[ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE_KEY]
JWT_ACCESS_SECRET=[SECRET_MIN_32_CHARS]
JWT_REFRESH_SECRET=[SECRET_MIN_32_CHARS]
RAZORPAY_KEY_ID=rzp_live_[KEY_ID]
RAZORPAY_KEY_SECRET=[KEY_SECRET]
```

### Frontend (`frontend/.env`)
Copy `frontend/.env.example` to `frontend/.env`:
```env
VITE_API_BASE_URL=https://api.chaudharykiranastore.com/api/v1
VITE_STORE_ID=00000000-0000-0000-0000-000000000002
VITE_APP_ENV=production
```

## 3. Database Migration Execution
Run migrations against production PostgreSQL:
```bash
node backend/src/run_migrations.js
```

## 4. Pre-Deployment Audit Check
Execute the automated pre-flight audit script to verify environment validity and schema integrity:
```bash
node backend/src/scripts/preDeploymentCheck.js
```

## 5. Build Frontend Production Bundle
```bash
cd frontend
npm run build
```

## 6. Process Monitoring & PM2 Cluster Setup
Start backend in cluster mode with PM2:
```bash
pm2 start backend/src/server.js --name "cks-backend-api" -i max
pm2 save
```
