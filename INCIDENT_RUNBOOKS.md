# Production Incident Runbooks — Chaudhary Kirana Store 🛠️🚨

This document provides step-by-step incident response procedures for on-call engineers managing the Chaudhary Kirana Store production stack.

---

## Quick Reference & Severity Matrix

| Incident ID | Incident Name | Trigger Condition | Severity | Dashboard Location |
| :--- | :--- | :--- | :---: | :--- |
| **INC-001** | High API Latency | P95 Latency > 1000ms over 5 min | `WARNING` | `/api/v1/admin/observability/dashboard` -> `http.p95LatencyMs` |
| **INC-002** | Availability SLO Breach | HTTP 5xx Error Rate > 5.0% over 5 min | `CRITICAL` | `/api/v1/admin/observability/dashboard` -> `slo` -> `API_AVAILABILITY` |
| **INC-003** | Dead-Letter Queue Accumulation | Dead-letter background jobs count > 0 | `WARNING` | `/api/v1/admin/observability/dashboard` -> `jobs.dead_letter` |
| **INC-004** | SSE Reconnect Storm | Reconnect events > 50 in 1 min | `WARNING` | `/api/v1/admin/observability/dashboard` -> `sse.reconnectEvents` |
| **INC-005** | Database Slow Query / High Locks | Query execution duration > 1000ms | `WARNING` | `/api/v1/health/ready` -> `database` |
| **INC-006** | Cache Provider Outage | Cache hit ratio < 20% or Provider error | `WARNING` | `/api/v1/admin/observability/dashboard` -> `cache` |

---

## INC-001: High API Latency / P95 Latency Breach (>1000ms)

### 1. Detection
- **Alert**: `API_SLOW_LATENCY` triggered in `alertManager`.
- **Diagnostic Endpoint**: Check `GET /api/v1/admin/observability/dashboard` -> `http.p95LatencyMs` or `http.maxLatencyMs`.

### 2. Immediate Investigation
1. Check `GET /api/v1/health/ready` to verify system health and heap memory usage.
2. Inspect structured logs for slow request entries:
   ```bash
   node -e "const metrics = require('./backend/src/monitoring/metrics.service'); console.log(metrics.getAggregateMetrics().http);"
   ```
3. Check `cache.hitRatio`. Low cache hit rates mean PostgreSQL database is being queried directly for public categories/products.

### 3. Mitigation & Resolution
- **Step 1**: If memory heap used is >90% (`heapUsedMb`), initiate a graceful process restart.
- **Step 2**: Clear or repopulate public category/product caches using the cache service:
  ```javascript
  const cacheService = require('./backend/src/services/cache.service');
  cacheService.clear();
  ```
- **Step 3**: Verify performance recovery via `GET /api/v1/admin/observability/dashboard`.

---

## INC-002: Availability SLO Breach / High HTTP 5xx Errors (>5%)

### 1. Detection
- **Alert**: `API_HIGH_ERROR_RATE` or `SLO_BREACH` triggered.
- **Metric**: `http.errorRatePercent` > 5.0% or `slo.API_AVAILABILITY.status === 'BREACHED'`.

### 2. Immediate Investigation
1. Fetch recent errors grouped by stack fingerprint from the observability endpoint:
   `GET /api/v1/admin/observability/dashboard` -> `errors.recent`.
2. Locate the top failing endpoint and request correlation ID (`requestId`).
3. Check database connection status via `GET /api/v1/health/ready`.

### 3. Mitigation & Resolution
- **Step 1**: If errors stem from database disconnection, verify Supabase PostgreSQL availability.
- **Step 2**: If errors stem from a bad code deployment, execute an immediate zero-downtime rollback:
  ```bash
  git checkout main
  git reset --hard HEAD~1
  git push origin main --force
  ```
- **Step 3**: Re-evaluate SLO status via `sloTracker.evaluateSlos()`.

---

## INC-003: Dead-Letter Queue Accumulation & Job Failures

### 1. Detection
- **Alert**: `JOB_DEAD_LETTER_ALERT` triggered.
- **Metric**: `jobs.dead_letter` > 0.

### 2. Immediate Investigation
1. Inspect dead-letter job payloads and sanitized error messages:
   ```javascript
   const jobQueue = require('./backend/src/jobs/jobQueue.service');
   console.log(jobQueue.getDeadLetterJobs(10));
   ```
2. Verify if failure was due to network timeout or unhandled exception.

### 3. Safe Replay Procedure
1. Verify idempotency protection: Dead-letter jobs preserve their `idempotency_key` (e.g. `ORDER_NOTIFICATION:ord-123:CONFIRMED`).
2. Replay specific dead-letter job:
   ```javascript
   const jobQueue = require('./backend/src/jobs/jobQueue.service');
   await jobQueue.replayDeadLetterJob('job-id-uuid');
   ```
3. Confirm status transitions back from `DEAD_LETTER` to `PENDING` -> `COMPLETED`.

---

## INC-004: SSE Reconnection Storm / Connection Exhaustion

### 1. Detection
- **Alert**: `SSE_RECONNECT_STORM` triggered.
- **Metric**: `sse.reconnectEvents` > 50 or rapid active connection drops.

### 2. Immediate Investigation
1. Inspect active connection counts and role distribution:
   `GET /api/v1/admin/observability/dashboard` -> `sse`.
2. Check if customer multi-tab clients are repeatedly dropping HTTP/1.1 connections due to browser proxy limits.

### 3. Mitigation & Resolution
- **Step 1**: Verify fallback polling is active for customers (`useOrderSync` fallback polling interval 10s-15s).
- **Step 2**: Trigger clean SSE client flush:
  ```javascript
  const sseManager = require('./backend/src/notifications/sse.manager');
  sseManager.shutdown();
  ```
- **Step 3**: Verify client reconnects establish cleanly without memory leaks.

---

## INC-005: Database Slow Query / High Lock Contention

### 1. Detection
- **Alert**: `DATABASE_SLOW_QUERY` triggered (>1000ms execution).
- **Metric**: Endpoint response duration spiking on order queries.

### 2. Immediate Investigation
1. Check Migration 041 & 042 performance indexes exist in PostgreSQL:
   - `idx_orders_user_status`
   - `idx_orders_status_created`
   - `idx_delivery_assignments_partner_status`
   - `idx_products_category_active`
   - `idx_jobs_status_next_run`
2. Verify index health using `fix_schema_full.js`:
   ```bash
   node backend/src/fix_schema_full.js
   ```

---

## INC-006: Cache Provider Outage / High Miss Rate

### 1. Detection
- **Alert**: `cache.hitRatio` drops below 0.20 (20%).
- **Diagnostic**: `cache.status !== 'healthy'`.

### 2. Mitigation & Resolution
- **Step 1**: If Redis provider is offline, verify fallback to `MemoryCacheProvider` executed automatically without application crash.
- **Step 2**: Restart cache provider or reset memory store:
  ```javascript
  const cacheService = require('./backend/src/services/cache.service');
  cacheService.resetStatsForTests();
  ```
- **Step 3**: Confirm category and product endpoints populate cache on subsequent GET requests.
