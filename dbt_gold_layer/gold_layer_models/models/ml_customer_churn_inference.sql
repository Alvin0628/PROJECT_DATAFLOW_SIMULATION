{{ config(
    materialized='table',
    indexes=[
      {'columns': ['user_id'], 'unique': True}
    ]
) }}

WITH global_time_window AS (
    SELECT 
        MAX(created_at) AS max_date,
        (MAX(created_at) - INTERVAL '30 days') AS window_start
    FROM silver.orders
),

-- 2. DELTA FILTER: Users active or transacting in the last 30 days
active_users AS (
    SELECT DISTINCT o.user_id
    FROM silver.orders o
    CROSS JOIN global_time_window g
    WHERE o.created_at > g.window_start 
      AND o.created_at <= g.max_date
),

-- 3. Order level aggregation -- (Features are calculated from the full history up to max_date)
order_metrics AS (
    SELECT 
        o.user_id,
        MIN(o.created_at) AS first_order_date,
        MAX(o.created_at) AS last_order_date,
        COUNT(DISTINCT o.order_id) AS frequency_total_orders,
        SUM(CASE WHEN o.status = 'Complete' THEN 1 ELSE 0 END) AS total_completed_orders,
        SUM(CASE WHEN o.status = 'Cancelled' THEN 1 ELSE 0 END) AS total_cancelled_orders,
        SUM(CASE WHEN o.status = 'Returned' THEN 1 ELSE 0 END) AS total_returned_orders,
        AVG(EXTRACT(EPOCH FROM o.delivery_time) / 86400.0) AS avg_delivery_time_days,
        SUM(CASE WHEN (EXTRACT(EPOCH FROM o.delivery_time) / 86400.0) > 3.0 THEN 1 ELSE 0 END) AS late_deliveries_experienced
    FROM silver.orders o
    CROSS JOIN global_time_window g
    JOIN active_users au ON o.user_id = au.user_id -- FILTER DELTA
    WHERE o.created_at <= g.max_date 
    GROUP BY o.user_id
),

-- 4. Aggregation item and product
item_metrics AS (
    SELECT 
        o.user_id, 
        SUM(CASE WHEN o.status = 'Complete' THEN oi.sale_price ELSE 0 END) AS monetary_total_spent,
        AVG(oi.sale_price) AS avg_item_price,
        SUM(p.retail_price - oi.sale_price) AS total_discount_enjoyed,
        COUNT(DISTINCT p.category) AS unique_categories_bought,
        MODE() WITHIN GROUP (ORDER BY p.category) AS favorite_category
    FROM silver.orders o 
    CROSS JOIN global_time_window g
    JOIN active_users au ON o.user_id = au.user_id -- FILTER DELTA
    JOIN silver.order_items oi ON o.order_id = oi.order_id 
    JOIN silver.products p ON oi.product_id = p.id
    WHERE o.created_at <= g.max_date 
    GROUP BY o.user_id
),

-- 5. Aggregation web / activity user
web_metrics AS (
    SELECT 
        e.user_id,
        COUNT(DISTINCT e.session_id) AS total_web_sessions,
        COUNT(e.id) AS total_page_views,
        COUNT(e.id) * 1.0 / NULLIF(COUNT(DISTINCT e.session_id), 0) AS avg_page_views_per_session,
        SUM(CASE WHEN e.event_type = 'cart' THEN 1 ELSE 0 END) AS total_cart_adds,
        SUM(CASE WHEN e.event_type = 'purchase' THEN 1 ELSE 0 END) AS total_purchases,
        MODE() WITHIN GROUP (ORDER BY e.browser) AS primary_browser
    FROM silver.events e
    CROSS JOIN global_time_window g
    JOIN active_users au ON e.user_id = au.user_id -- FILTER DELTA
    WHERE e.user_id IS NOT NULL
      AND e.created_at <= g.max_date 
    GROUP BY e.user_id
)

-- 6. Build Final Inference Table
SELECT 
    om.user_id,
    EXTRACT(EPOCH FROM (g.max_date - om.last_order_date)) / 86400.0 AS recency_days,
    u.age AS user_age,
    u.gender AS user_gender,
    u.country AS user_country,
    u.traffic_source AS primary_traffic_source,
    om.frequency_total_orders,
    COALESCE(im.monetary_total_spent, 0) AS monetary_total_spent,
    COALESCE(im.monetary_total_spent, 0) / NULLIF(om.frequency_total_orders, 0) AS monetary_aov,
    EXTRACT(EPOCH FROM (om.last_order_date - om.first_order_date)) / 86400.0 AS customer_tenure_days,
    (EXTRACT(EPOCH FROM (om.last_order_date - om.first_order_date)) / 86400.0) / NULLIF(om.frequency_total_orders - 1, 0) AS avg_days_between_orders,
    CASE WHEN om.frequency_total_orders = 1 THEN 1 ELSE 0 END AS is_single_order_user,
    COALESCE(im.avg_item_price, 0) AS avg_item_price,
    COALESCE(im.total_discount_enjoyed, 0) AS total_discount_enjoyed,
    COALESCE(im.unique_categories_bought, 0) AS unique_categories_bought,
    im.favorite_category,
    COALESCE(om.total_cancelled_orders, 0) AS total_cancelled_orders,
    COALESCE(om.total_returned_orders, 0) AS total_returned_orders,
    COALESCE(om.total_returned_orders, 0) * 100.0 / NULLIF(om.frequency_total_orders, 0) AS return_rate_pct,
    COALESCE(om.late_deliveries_experienced, 0) AS late_deliveries_experienced,
    COALESCE(om.avg_delivery_time_days, 0) AS avg_delivery_time_days,
    COALESCE(wm.total_web_sessions, 0) AS total_web_sessions,
    COALESCE(wm.total_page_views, 0) AS total_page_views,
    COALESCE(wm.avg_page_views_per_session, 0) AS avg_page_views_per_session,
    GREATEST((COALESCE(wm.total_cart_adds, 0) - COALESCE(wm.total_purchases, 0)), 0) AS cart_abandonment_count,
    wm.primary_browser
FROM order_metrics om
CROSS JOIN global_time_window g
JOIN silver.users u ON om.user_id = u.id
LEFT JOIN item_metrics im ON om.user_id = im.user_id
LEFT JOIN web_metrics wm ON om.user_id = wm.user_id