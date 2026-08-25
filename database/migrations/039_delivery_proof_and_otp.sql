-- =============================================================================
-- Phase 25 Database Migration: Secure Delivery OTP & Proof of Delivery System
-- =============================================================================

-- Add OTP verification and assignment binding columns to delivery_assignments
ALTER TABLE delivery_assignments
ADD COLUMN IF NOT EXISTS delivery_otp_hash TEXT,
ADD COLUMN IF NOT EXISTS delivery_otp_assignment_id UUID,
ADD COLUMN IF NOT EXISTS delivery_otp_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivery_otp_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivery_otp_attempts INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_otp_last_attempt_at TIMESTAMPTZ;

-- Add Proof of Delivery columns to delivery_assignments
ALTER TABLE delivery_assignments
ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS proof_image_url TEXT,
ADD COLUMN IF NOT EXISTS delivery_latitude NUMERIC,
ADD COLUMN IF NOT EXISTS delivery_longitude NUMERIC,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_otp_expires_at ON delivery_assignments(delivery_otp_expires_at);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_otp_verified_at ON delivery_assignments(delivery_otp_verified_at);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_delivered_at ON delivery_assignments(delivered_at DESC);
