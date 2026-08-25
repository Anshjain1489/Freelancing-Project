-- Migration 040: Encrypted Delivery OTP Persistence for Stateless Production Horizontally Scaled Deployments
-- Adds delivery_otp_encrypted column to delivery_assignments table to ensure raw OTPs survive server restarts & multi-instance scaling

ALTER TABLE delivery_assignments
ADD COLUMN IF NOT EXISTS delivery_otp_encrypted TEXT;

-- Notify PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
