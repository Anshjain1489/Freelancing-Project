-- 034_fix_delivery_partner_role_schema.sql: Safe, Idempotent Delivery Partner Role Migration & Schema Cache Reload

-- 1. Ensure public.users table has the 'role' column
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'CUSTOMER';

-- 2. Backfill null roles to 'CUSTOMER' safely
UPDATE public.users
SET role = 'CUSTOMER'
WHERE role IS NULL;

-- 3. Preserve Admin roles safely for known admin credentials
UPDATE public.users
SET role = 'ADMIN'
WHERE phone = '7897837095' OR email = 'admin@chaudhary.com' OR role = 'ROLE_ADMIN';

-- 4. Ensure roles lookup table contains DELIVERY_PARTNER, ADMIN, and CUSTOMER
INSERT INTO public.roles (name, description)
VALUES 
    ('ADMIN', 'Store Administrator / Owner'),
    ('CUSTOMER', 'Retail Customer'),
    ('DELIVERY_PARTNER', 'Delivery Fleet Partner')
ON CONFLICT (name) DO NOTHING;

-- 5. Add check constraint on users.role if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
    ) THEN
        ALTER TABLE public.users
        ADD CONSTRAINT users_role_check
        CHECK (role IN ('ADMIN', 'CUSTOMER', 'DELIVERY_PARTNER'));
    END IF;
END $$;

-- 6. Synchronize any delivery partner assignments from user_roles into users.role
UPDATE public.users u
SET role = r.name
FROM public.user_roles ur
JOIN public.roles r ON ur.role_id = r.id
WHERE u.id = ur.user_id AND r.name = 'DELIVERY_PARTNER';

-- 7. Reload PostgREST/Supabase Schema Cache
NOTIFY pgrst, 'reload schema';
