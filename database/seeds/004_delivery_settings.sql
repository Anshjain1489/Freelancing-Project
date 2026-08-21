-- 004_delivery_settings.sql: Store delivery distance and parameters

INSERT INTO delivery_settings (
    store_name,
    store_latitude,
    store_longitude,
    free_delivery_radius_km,
    charge_per_extra_km,
    maximum_delivery_radius_km,
    minimum_order_amount,
    is_active
) VALUES (
    'Chaudhary Kirana Store',
    24.2381000,
    78.7364000,
    1.0,
    10.00,
    15.0,
    0.00,
    TRUE
);
