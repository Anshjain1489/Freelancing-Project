-- ============================================================================
-- Migration: 022_google_auth.sql
-- Description: Add google_id column and index for Google Sign-In support
-- Author: Akash Chaudhary (Chaudhary Kirana Store)
-- ============================================================================

-- Add google_id column to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;

-- Create index on google_id for fast authentication lookup
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
