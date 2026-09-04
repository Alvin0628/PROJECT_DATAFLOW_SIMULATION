{{ config(
    materialized='table',
    indexes=[
      {'columns': ['user_id'], 'unique': True}
    ]
) }}

-- TIME MACHINE: Set the Cutoff Point (90 Days Back)
WITH time_boundaries AS (
    SELECT 
        MAX(created_at) AS max_date,
        (MAX(created_at) - INTERVAL '90 days') AS cutoff_date
    FROM silver.orders
),

-- CUMULATIVE: Get ALL users who existed and made purchases before the cutoff

base_users AS (
    SELECT DISTINCT user_id
    FROM silver.orders
    CROSS JOIN time_boundaries
    WHERE created_at <= cutoff_date
),

target_labels AS (
    SELECT 
        bu.user_id,
        CASE 
            WHEN MAX(CASE WHEN o.created_at > tb.cutoff_date 
                           AND o.created_at <= tb.max_date THEN 1 END) = 1 
            THEN 0
            ELSE 1
        END AS is_churned
    FROM base_users bu
    CROSS JOIN time_boundaries tb
    LEFT JOIN silver.orders o ON bu.user_id = o.user_id
    GROUP BY bu.user_id
),

-- 4. CALCULATE HISTORICAL FEATURES (Full History)
order_metrics_past AS (
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
    CROSS JOIN time_boundaries tb
    JOIN base_users bu ON o.user_id = bu.user_id
    WHERE o.created_at <= tb.cutoff_date 
    GROUP BY o.user_id
),

item_metrics_past AS (
    SELECT 
        o.user_id, 
        SUM(CASE WHEN o.status = 'Complete' THEN oi.sale_price ELSE 0 END) AS monetary_total_spent,
        AVG(oi.sale_price) AS avg_item_price,
        SUM(p.retail_price - oi.sale_price) AS total_discount_enjoyed,
        COUNT(DISTINCT p.category) AS unique_categories_bought,
        MODE() WITHIN GROUP (ORDER BY p.category) AS favorite_category
    FROM silver.orders o 
    CROSS JOIN time_boundaries tb
    JOIN base_users bu ON o.user_id = bu.user_id
    JOIN silver.order_items oi ON o.order_id = oi.order_id 
    JOIN silver.products p ON oi.product_id = p.id
    WHERE o.created_at <= tb.cutoff_date 
    GROUP BY o.user_id
),

web_metrics_past AS (
    SELECT 
        e.user_id,
        COUNT(DISTINCT e.session_id) AS total_web_sessions,
        COUNT(e.id) AS total_page_views,
        COUNT(e.id) * 1.0 / NULLIF(COUNT(DISTINCT e.session_id), 0) AS avg_page_views_per_session,
        SUM(CASE WHEN e.event_type = 'cart' THEN 1 ELSE 0 END) AS total_cart_adds,
        SUM(CASE WHEN e.event_type = 'purchase' THEN 1 ELSE 0 END) AS total_purchases,
        MODE() WITHIN GROUP (ORDER BY e.browser) AS primary_browser
    FROM silver.events e
    CROSS JOIN time_boundaries tb
    JOIN base_users bu ON e.user_id = bu.user_id
    WHERE e.user_id IS NOT NULL 
      AND e.created_at <= tb.cutoff_date
    GROUP BY e.user_id
)

-- 5. Final
SELECT 
    omp.user_id,
    tl.is_churned,
    u.age AS user_age,
    u.gender AS user_gender,
    u.country AS user_country,
    u.traffic_source AS primary_traffic_source,
    EXTRACT(EPOCH FROM (tb.cutoff_date - omp.last_order_date)) / 86400.0 AS recency_days,
    omp.frequency_total_orders,
    COALESCE(imp.monetary_total_spent, 0) AS monetary_total_spent,
    COALESCE(imp.monetary_total_spent, 0) / NULLIF(omp.frequency_total_orders, 0) AS monetary_aov,
    EXTRACT(EPOCH FROM (omp.last_order_date - omp.first_order_date)) / 86400.0 AS customer_tenure_days,
    (EXTRACT(EPOCH FROM (omp.last_order_date - omp.first_order_date)) / 86400.0) / NULLIF(omp.frequency_total_orders - 1, 0) AS avg_days_between_orders,
    CASE WHEN omp.frequency_total_orders = 1 THEN 1 ELSE 0 END AS is_single_order_user,
    COALESCE(imp.avg_item_price, 0) AS avg_item_price,
    COALESCE(imp.total_discount_enjoyed, 0) AS total_discount_enjoyed,
    COALESCE(imp.unique_categories_bought, 0) AS unique_categories_bought,
    imp.favorite_category,
    COALESCE(omp.total_cancelled_orders, 0) AS total_cancelled_orders,
    COALESCE(omp.total_returned_orders, 0) AS total_returned_orders,
    COALESCE(omp.total_returned_orders, 0) * 100.0 / NULLIF(omp.frequency_total_orders, 0) AS return_rate_pct,
    COALESCE(omp.late_deliveries_experienced, 0) AS late_deliveries_experienced,
    COALESCE(omp.avg_delivery_time_days, 0) AS avg_delivery_time_days,
    COALESCE(wmp.total_web_sessions, 0) AS total_web_sessions,
    COALESCE(wmp.total_page_views, 0) AS total_page_views,
    COALESCE(wmp.avg_page_views_per_session, 0) AS avg_page_views_per_session,
    GREATEST((COALESCE(wmp.total_cart_adds, 0) - COALESCE(wmp.total_purchases, 0)), 0) AS cart_abandonment_count,
    wmp.primary_browser
FROM order_metrics_past omp
CROSS JOIN time_boundaries tb 
JOIN target_labels tl ON omp.user_id = tl.user_id
JOIN silver.users u ON omp.user_id = u.id
LEFT JOIN item_metrics_past imp ON omp.user_id = imp.user_id
LEFT JOIN web_metrics_past wmp ON omp.user_id = wmp.user_id