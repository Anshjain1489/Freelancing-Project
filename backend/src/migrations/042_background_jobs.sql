-- Migration 042: Background Jobs & Dead-Letter Queue Persistence Schema
CREATE TABLE IF NOT EXISTS background_jobs (
    id VARCHAR(100) PRIMARY KEY,
    job_type VARCHAR(100) NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    idempotency_key VARCHAR(255) UNIQUE NULL,
    attempt_count INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    next_run_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    locked_at TIMESTAMPTZ NULL,
    locked_by VARCHAR(100) NULL,
    last_error TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_status_next_run ON background_jobs (status, next_run_at);
CREATE INDEX IF NOT EXISTS idx_jobs_idempotency_key ON background_jobs (idempotency_key);
