{{ config(
    materialized='table',
    indexes=[
      {'columns': ['session_id'], 'unique': True}
    ]
) }}

-- 1. Tentukan Jendela Waktu (Delta: 30 Hari Terakhir)
WITH global_time_window AS (
    SELECT 
        MAX(created_at) AS max_date,
        (MAX(created_at) - INTERVAL '30 days') AS window_start
    FROM silver.events
),

session_has_purchase AS (
    SELECT
        e.session_id,
        MAX(CASE WHEN e.event_type = 'purchase' THEN 1 ELSE 0 END) AS already_converted
    FROM silver.events e
    CROSS JOIN global_time_window g
    -- FILTER DELTA: Hanya tarik sesi yang terjadi bulan ini
    WHERE e.created_at > g.window_start 
      AND e.created_at <= g.max_date
    GROUP BY e.session_id
),

undecided_sessions AS (
    -- Hanya sesi yang BELUM pernah convert
    SELECT session_id
    FROM session_has_purchase
    WHERE already_converted = 0
),

session_agg AS (
    SELECT 
        e.session_id,
        MAX(e.user_id) AS user_id,
        MIN(e.created_at) AS session_start_at,
        MAX(e.created_at) AS session_end_at,
        COUNT(e.id) AS total_events,
        MAX(e.traffic_source) AS traffic_source,
        MAX(e.browser) AS browser,
        MAX(e.city) AS city,
        MAX(e.state) AS state,
        MAX(CASE WHEN e.event_type = 'department' THEN 1 ELSE 0 END) AS step_department,
        MAX(CASE WHEN e.event_type = 'product' THEN 1 ELSE 0 END) AS step_product,
        MAX(CASE WHEN e.event_type = 'cart' THEN 1 ELSE 0 END) AS step_cart
    FROM silver.events e
    JOIN undecided_sessions us ON e.session_id = us.session_id
    GROUP BY e.session_id
)

-- Build Final Table (Tetap Sama)
SELECT
    sa.session_id,
    sa.user_id,
    EXTRACT(HOUR FROM sa.session_start_at) AS session_start_hour,
    CASE WHEN EXTRACT(ISODOW FROM sa.session_start_at) IN (6, 7) THEN 1 ELSE 0 END AS is_weekend,
    sa.total_events AS total_interactions,
    EXTRACT(EPOCH FROM (sa.session_end_at - sa.session_start_at)) AS session_duration_seconds,
    CASE 
        WHEN sa.total_events > 1 THEN EXTRACT(EPOCH FROM (sa.session_end_at - sa.session_start_at)) / (sa.total_events - 1)
        ELSE 0 
    END AS avg_seconds_per_interaction,
    sa.step_department,
    sa.step_product,
    sa.step_cart,
    sa.traffic_source,
    sa.browser,
    sa.city,
    sa.state,
    CASE WHEN sa.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_logged_in_user
FROM session_agg sa