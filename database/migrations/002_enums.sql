-- 002_enums.sql: Define custom enumeration types

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        CREATE TYPE user_role_enum AS ENUM ('CUSTOMER', 'ADMIN');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status_enum') THEN
        CREATE TYPE order_status_enum AS ENUM (
            'PENDING',
            'PAYMENT_VERIFIED',
            'CONFIRMED',
            'PROCESSING',
            'OUT_FOR_DELIVERY',
            'DELIVERED',
            'CANCELLED',
            'PAYMENT_FAILED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
        CREATE TYPE payment_status_enum AS ENUM (
            'PENDING',
            'PAID',
            'FAILED',
            'REFUNDED',
            'PARTIALLY_REFUNDED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_enum') THEN
        CREATE TYPE payment_method_enum AS ENUM (
            'RAZORPAY',
            'UPI',
            'CARD',
            'NET_BANKING',
            'COD',
            'OTHER'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type_enum') THEN
        CREATE TYPE notification_type_enum AS ENUM (
            'ORDER',
            'PAYMENT',
            'PROMOTION',
            'INVENTORY',
            'SYSTEM'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_channel_enum') THEN
        CREATE TYPE notification_channel_enum AS ENUM (
            'IN_APP',
            'WHATSAPP',
            'EMAIL',
            'SMS'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_type_enum') THEN
        CREATE TYPE discount_type_enum AS ENUM ('PERCENTAGE', 'FIXED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promotion_type_enum') THEN
        CREATE TYPE promotion_type_enum AS ENUM (
            'PRODUCT',
            'CATEGORY',
            'ORDER',
            'FESTIVAL',
            'SEASONAL'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_movement_type_enum') THEN
        CREATE TYPE inventory_movement_type_enum AS ENUM (
            'STOCK_IN',
            'STOCK_OUT',
            'ORDER_RESERVED',
            'ORDER_RELEASED',
            'ADJUSTMENT',
            'RETURN'
        );
    END IF;
END $$;
