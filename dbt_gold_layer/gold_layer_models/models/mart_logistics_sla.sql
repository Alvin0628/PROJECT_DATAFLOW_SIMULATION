{{ config(
    materialized='table',
    indexes=[
      {'columns': ['package_id'], 'unique': True}
    ]
) }}

SELECT 
    -- identifiers
    o.order_id || '-' || p.distribution_center_id AS package_id,
    o.order_id,
    p.distribution_center_id,
    dc.name AS dc_name,
    o.user_id,

    -- package content
    COUNT(oi.id) AS total_items_in_package,

    -- dimensions
    DATE(o.created_at) AS order_created_date,
    o.status AS order_status,
    dc.latitude AS dc_latitude,
    dc.longitude AS dc_longitude,
    u.country AS destination_country,
    u.city AS destination_city,
    u.latitude AS destination_latitude,
    u.longitude AS destination_longitude,

    -- time facts
    EXTRACT(EPOCH FROM o.processing_time) / 86400.0 AS processing_time_days,
    EXTRACT(EPOCH FROM o.delivery_time) / 86400.0 AS delivery_time_days,

    -- 5. SLA Counters (SLA Asumsi: Proses maks 2 hari, Kurir maks 5 hari)
    CASE WHEN o.shipped_at IS NOT NULL THEN 1 ELSE 0 END AS is_shipped_flag,
    CASE WHEN (EXTRACT(EPOCH FROM o.processing_time) / 86400.0) > 2.0 THEN 1 ELSE 0 END AS is_late_processing,
    CASE WHEN (EXTRACT(EPOCH FROM o.delivery_time) / 86400.0) > 5.0 THEN 1 ELSE 0 END AS is_late_delivery

FROM silver.orders o
JOIN silver.order_items oi ON o.order_id = oi.order_id
JOIN silver.products p ON oi.product_id = p.id
JOIN silver.distribution_centers dc ON p.distribution_center_id = dc.id
JOIN silver.users u ON o.user_id = u.id

GROUP BY 
    o.order_id, p.distribution_center_id, dc.name, o.user_id,
    DATE(o.created_at), o.status, 
    dc.latitude, dc.longitude, 
    u.country, u.city, u.latitude, u.longitude,
    o.processing_time, o.delivery_time, o.shipped_at