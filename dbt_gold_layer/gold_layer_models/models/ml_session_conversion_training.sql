{{ config(
    materialized='table',
    indexes=[
      {'columns': ['session_id'], 'unique': True}
    ]
) }}

WITH events_with_purchase_marker AS (
    SELECT 
        e.*,
        MIN(CASE WHEN event_type = 'purchase' THEN created_at END) 
            OVER (PARTITION BY session_id) AS purchase_at
    FROM silver.events e
),

pre_purchase_events AS (
    -- IMPORTANT: Only use events before purchase; exclude purchase and all events after it.
    SELECT *
    FROM events_with_purchase_marker
    WHERE purchase_at IS NULL OR created_at < purchase_at
),

session_agg AS (
    SELECT 
        session_id,
        MAX(user_id) AS user_id,
        MIN(created_at) AS session_start_at,
        MAX(created_at) AS session_end_at,  
        COUNT(id) AS total_events,
        MAX(traffic_source) AS traffic_source,
        MAX(browser) AS browser,
        MAX(city) AS city,
        MAX(state) AS state,
        MAX(CASE WHEN event_type = 'department' THEN 1 ELSE 0 END) AS step_department,
        MAX(CASE WHEN event_type = 'product' THEN 1 ELSE 0 END) AS step_product,
        MAX(CASE WHEN event_type = 'cart' THEN 1 ELSE 0 END) AS step_cart
    FROM pre_purchase_events
    GROUP BY session_id
),

target AS (
    -- Target is calculated separately from all original events, including purchase
    SELECT session_id, MAX(CASE WHEN event_type = 'purchase' THEN 1 ELSE 0 END) AS is_converted
    FROM silver.events
    GROUP BY session_id
)

SELECT
    sa.session_id,
    sa.user_id,
    t.is_converted,
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
JOIN target t ON sa.session_id = t.session_id