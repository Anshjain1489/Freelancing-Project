-- 035_whatsapp_delivery_notifications.sql: WhatsApp Delivery Assignment Notification Tracking Audit Table

CREATE TABLE IF NOT EXISTS whatsapp_delivery_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    delivery_partner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL DEFAULT 'DELIVERY_ASSIGNED', -- DELIVERY_ASSIGNED, DELIVERY_REASSIGNED, REASSIGNED_REMOVAL
    recipient_phone VARCHAR(50) NOT NULL,
    provider VARCHAR(50) DEFAULT 'WHATSAPP_CLOUD_API',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, SENT, FAILED
    attempt_count INT DEFAULT 1,
    provider_message_id VARCHAR(255),
    message_text TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_order_partner_notification UNIQUE(order_id, delivery_partner_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_wa_delivery_notif_order ON whatsapp_delivery_notifications(order_id);
CREATE INDEX IF NOT EXISTS idx_wa_delivery_notif_partner ON whatsapp_delivery_notifications(delivery_partner_id);
CREATE INDEX IF NOT EXISTS idx_wa_delivery_notif_status ON whatsapp_delivery_notifications(status);

-- PostgREST Schema Cache Reload
NOTIFY pgrst, 'reload schema';
