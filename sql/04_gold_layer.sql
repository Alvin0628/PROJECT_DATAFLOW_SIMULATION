CREATE SCHEMA IF NOT EXISTS gold;

DROP MATERIALIZED VIEW IF EXISTS gold.mart_sales_revenue;

CREATE MATERIALIZED VIEW gold.mart_sales_revenue AS
SELECT 

    oi.id AS order_item_id,
    o.order_id,
    o.user_id,
    oi.product_id,

    -- dimensions
    -- time
    DATE(o.created_at) AS order_date,
    TO_CHAR(o.created_at, 'YYYY-MM') AS order_month,
    EXTRACT(YEAR FROM o.created_at) AS order_year,
    
    -- status
    o.status AS order_status,
    
    -- product
    p.category AS product_category,
    p.department AS product_department,
    p.brand AS product_brand,
    p.name AS product_name,
    
    -- Geography
    u.country AS user_country,
    u.city AS user_city,
    u.gender AS user_gender,
    u.traffic_source AS user_traffic_source,

    -- metrics / facts
    p.retail_price,
    oi.sale_price,
    p.cost AS product_cost,

    --profit

    (oi.sale_price - p.cost) AS gross_margin,
    (p.retail_price - oi.sale_price) AS discount_amount,
    CASE 
        WHEN p.retail_price > 0 THEN (p.retail_price - oi.sale_price) / p.retail_price 
        ELSE 0 
    END AS discount_percentage,

    -- status based revenue
    CASE WHEN o.status = 'Complete' THEN oi.sale_price ELSE 0 END AS realized_revenue,
    CASE WHEN o.status = 'Returned' THEN oi.sale_price ELSE 0 END AS returned_revenue,
    CASE WHEN o.status = 'Cancelled' THEN oi.sale_price ELSE 0 END AS cancelled_revenue,
    CASE WHEN o.status = 'Cancelled (Stock Not Exist)' THEN oi.sale_price ELSE 0 END AS lost_revenue_out_of_stock,

    -- binary flags
    1 AS is_sold_item,
    CASE WHEN o.status = 'Returned' THEN 1 ELSE 0 END AS is_returned

FROM silver.order_items oi
JOIN silver.orders o ON oi.order_id = o.order_id
JOIN silver.products p ON oi.product_id = p.id
JOIN silver.users u ON o.user_id = u.id;

-- index
CREATE UNIQUE INDEX idx_gold_mart_sales_revenue_id ON gold.mart_sales_revenue (order_item_id);


-- LOGISTICS
DROP MATERIALIZED VIEW IF EXISTS gold.mart_logistics_sla;

CREATE MATERIALIZED VIEW gold.mart_logistics_sla AS
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
    o.processing_time, o.delivery_time, o.shipped_at;

-- Index
CREATE UNIQUE INDEX idx_gold_mart_logistics_id ON gold.mart_logistics_sla (package_id);

-- account activity
DROP MATERIALIZED VIEW IF EXISTS gold.mart_user_funnel;

CREATE MATERIALIZED VIEW gold.mart_user_funnel AS

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

    --dimensions
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

FROM session_events;

-- Index
CREATE UNIQUE INDEX idx_gold_mart_user_funnel_id ON gold.mart_user_funnel (session_id);

-- customer churn prediction feature (table)
DROP MATERIALIZED VIEW IF EXISTS gold.ml_customer_churn_features;

CREATE MATERIALIZED VIEW gold.ml_customer_churn_features AS

-- define (today) for datetime logic
WITH global_max_date AS (
    SELECT MAX(created_at) AS max_date 
    FROM silver.orders
),

-- order level aggregation
order_metrics AS (
    SELECT 
        user_id,
        MIN(created_at) AS first_order_date,
        MAX(created_at) AS last_order_date,
        COUNT(DISTINCT order_id) AS frequency_total_orders,
        SUM(CASE WHEN status = 'Complete' THEN 1 ELSE 0 END) AS total_completed_orders,
        SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS total_cancelled_orders,
        SUM(CASE WHEN status = 'Returned' THEN 1 ELSE 0 END) AS total_returned_orders,
        AVG(EXTRACT(EPOCH FROM delivery_time) / 86400.0) AS avg_delivery_time_days,
        SUM(CASE WHEN (EXTRACT(EPOCH FROM delivery_time) / 86400.0) > 5.0 THEN 1 ELSE 0 END) AS late_deliveries_experienced
    FROM silver.orders
    GROUP BY user_id
),

-- aggregation item and product
item_metrics AS (
    SELECT 
        oi.user_id,
        SUM(CASE WHEN oi.status = 'Complete' THEN oi.sale_price ELSE 0 END) AS monetary_total_spent,
        AVG(oi.sale_price) AS avg_item_price,
        SUM(p.retail_price - oi.sale_price) AS total_discount_enjoyed,
        COUNT(DISTINCT p.category) AS unique_categories_bought,
        MODE() WITHIN GROUP (ORDER BY p.category) AS favorite_category
    FROM silver.order_items oi
    JOIN silver.products p ON oi.product_id = p.id
    GROUP BY oi.user_id
),

-- aggregation bad experience
oos_metrics AS (
    SELECT 
        user_id,
        COUNT(id) AS out_of_stock_experienced
    FROM silver.order_items_out_of_stock
    GROUP BY user_id
),

-- aggregation web / activivity user
web_metrics AS (
    SELECT 
        user_id,
        COUNT(DISTINCT session_id) AS total_web_sessions,
        COUNT(id) AS total_page_views,
        
        --avg view per page
        COUNT(id) * 1.0 / NULLIF(COUNT(DISTINCT session_id), 0) AS avg_page_views_per_session,
        --cart abondenment indicator
        SUM(CASE WHEN event_type = 'cart' THEN 1 ELSE 0 END) AS total_cart_adds,
        SUM(CASE WHEN event_type = 'purchase' THEN 1 ELSE 0 END) AS total_purchases,
        MODE() WITHIN GROUP (ORDER BY browser) AS primary_browser
    FROM silver.events
    WHERE user_id IS NOT NULL
    GROUP BY user_id
)

-- build 1 user = 1 row
SELECT 
    --identifiers and target
    om.user_id,
    EXTRACT(EPOCH FROM (g.max_date - om.last_order_date)) / 86400.0 AS recency_days,
    -- LABEL / TARGET PREDIKSI
    CASE WHEN (EXTRACT(EPOCH FROM (g.max_date - om.last_order_date)) / 86400.0) > 90.0 THEN 1 ELSE 0 END AS is_churned,

    -- demographic
    u.age AS user_age,
    u.gender AS user_gender,
    u.country AS user_country,
    u.traffic_source AS primary_traffic_source,

    --RFM & TEMPORAL FEATURES
    om.frequency_total_orders,
    COALESCE(im.monetary_total_spent, 0) AS monetary_total_spent,

    COALESCE(im.monetary_total_spent, 0) / NULLIF(om.frequency_total_orders, 0) AS monetary_aov,

    EXTRACT(EPOCH FROM (om.last_order_date - om.first_order_date)) / 86400.0 AS customer_tenure_days,

    (EXTRACT(EPOCH FROM (om.last_order_date - om.first_order_date)) / 86400.0) / NULLIF(om.frequency_total_orders - 1, 0) AS avg_days_between_orders,

    CASE WHEN om.frequency_total_orders = 1 THEN 1 ELSE 0 END AS is_single_order_user,

    --PRODUCT AFFINITY FEATURES
    COALESCE(im.avg_item_price, 0) AS avg_item_price,
    COALESCE(im.total_discount_enjoyed, 0) AS total_discount_enjoyed,
    COALESCE(im.unique_categories_bought, 0) AS unique_categories_bought,
    im.favorite_category,

    -- OPERATIONAL & BAD EXPERIENCE FEATURES
    COALESCE(om.total_cancelled_orders, 0) AS total_cancelled_orders,
    COALESCE(om.total_returned_orders, 0) AS total_returned_orders,
    -- Return percentage
    COALESCE(om.total_returned_orders, 0) * 100.0 / NULLIF(om.frequency_total_orders, 0) AS return_rate_pct,
    COALESCE(om.late_deliveries_experienced, 0) AS late_deliveries_experienced,
    COALESCE(om.avg_delivery_time_days, 0) AS avg_delivery_time_days,
    COALESCE(oos.out_of_stock_experienced, 0) AS out_of_stock_experienced,

    --WEB BEHAVIOR FEATURES
    COALESCE(wm.total_web_sessions, 0) AS total_web_sessions,
    COALESCE(wm.total_page_views, 0) AS total_page_views,
    COALESCE(wm.avg_page_views_per_session, 0) AS avg_page_views_per_session,
    -- Estimation Cart Abandonment
    GREATEST((COALESCE(wm.total_cart_adds, 0) - COALESCE(wm.total_purchases, 0)), 0) AS cart_abandonment_count,
    wm.primary_browser

FROM order_metrics om
CROSS JOIN global_max_date g
JOIN silver.users u ON om.user_id = u.id
LEFT JOIN item_metrics im ON om.user_id = im.user_id
LEFT JOIN oos_metrics oos ON om.user_id = oos.user_id
LEFT JOIN web_metrics wm ON om.user_id = wm.user_id;

-- Index 
CREATE UNIQUE INDEX idx_gold_ml_churn_user_id ON gold.ml_customer_churn_features (user_id);