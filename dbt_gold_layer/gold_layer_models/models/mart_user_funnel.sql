{{ config(
    materialized='table',
    indexes=[
      {'columns': ['session_id'], 'unique': True}
    ]
) }}

WITH session_events AS (
    SELECT 
        session_id,
        MAX(user_id) AS user_id,
        MIN(created_at) AS session_start_at,
        MAX(created_at) AS session_end_at,
        COUNT(id) AS total_events,
        
        -- Dimensions
        MAX(traffic_source) AS traffic_source,
        MAX(browser) AS browser,
        MAX(city) AS city,
        MAX(state) AS state,
        
        -- Funnel Steps 
        MAX(CASE WHEN event_type = 'home' THEN 1 ELSE 0 END) AS step_home,
        MAX(CASE WHEN event_type = 'department' THEN 1 ELSE 0 END) AS step_department,
        MAX(CASE WHEN event_type = 'product' THEN 1 ELSE 0 END) AS step_product,
        MAX(CASE WHEN event_type = 'cart' THEN 1 ELSE 0 END) AS step_cart,
        MAX(CASE WHEN event_type = 'purchase' THEN 1 ELSE 0 END) AS step_purchase,
        MAX(CASE WHEN event_type = 'cancel' THEN 1 ELSE 0 END) AS step_cancel
    FROM silver.events
    GROUP BY session_id
)
SELECT 
    -- identifiers
    session_id,
    user_id,

    -- dimensions
    DATE(session_start_at) AS session_date,
    TO_CHAR(session_start_at, 'YYYY-MM') AS session_month,
    traffic_source,
    browser,
    city,
    state,

    -- session facts
    total_events AS total_page_views,
    EXTRACT(EPOCH FROM (session_end_at - session_start_at)) AS session_duration_seconds,

    -- funnel counters
    step_home AS visited_home,
    step_department AS visited_department,
    step_product AS viewed_product,
    step_cart AS added_to_cart,
    step_purchase AS is_converted,
    step_cancel AS is_cancelled,

    -- marketing flags
    CASE WHEN total_events = 1 THEN 1 ELSE 0 END AS is_bounced,
    
    -- Cart Abandonment
    CASE WHEN step_cart = 1 AND step_purchase = 0 THEN 1 ELSE 0 END AS is_abandoned_cart,
    
    -- Guest vs Logged-in
    CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END AS is_logged_in_user

FROM session_events