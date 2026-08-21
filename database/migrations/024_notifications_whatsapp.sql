-- ============================================================================
-- Migration: 024_notifications_whatsapp.sql
-- Description: Create notifications, notification_deliveries, and notification_preferences tables
-- Author: Akash Chaudhary (Chaudhary Kirana Store)
-- ============================================================================

-- 1. Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'ORDER', -- ORDER, INVENTORY, SYSTEM, PROMOTION
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  event_type VARCHAR(100) NOT NULL, -- e.g., ORDER_CONFIRMED, LOW_STOCK
  reference_type VARCHAR(50), -- e.g., ORDER, PRODUCT
  reference_id VARCHAR(255), -- e.g., order_id or order_number
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Notification Deliveries Table
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL, -- IN_APP, WHATSAPP, EMAIL, SMS
  recipient VARCHAR(255) NOT NULL, -- phone or email or user_id
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, SENT, DELIVERED, READ, FAILED, SKIPPED
  provider VARCHAR(50) DEFAULT 'WHATSAPP_CLOUD_API',
  provider_message_id VARCHAR(255),
  attempt_count INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_code VARCHAR(100),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_event_delivery UNIQUE(notification_id, channel, recipient)
);

-- 3. Create Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  in_app_orders BOOLEAN NOT NULL DEFAULT TRUE,
  whatsapp_orders BOOLEAN NOT NULL DEFAULT TRUE,
  whatsapp_promotions BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status ON notification_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_msg_id ON notification_deliveries(provider_message_id);
