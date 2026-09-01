{{ config(
    materialized='table',
    indexes=[
      {'columns': ['order_item_id'], 'unique': True}
    ]
) }}

SELECT 
    oi.id AS order_item_id,
    o.order_id,
    o.user_id,
    oi.product_id,

    -- dimensions
    DATE(o.created_at) AS order_date,
    TO_CHAR(o.created_at, 'YYYY-MM') AS order_month,
    EXTRACT(YEAR FROM o.created_at) AS order_year,
    
    o.status AS order_status,
    
    p.category AS product_category,
    p.department AS product_department,
    p.brand AS product_brand,
    p.name AS product_name,
    
    u.country AS user_country,
    u.city AS user_city,
    u.gender AS user_gender,
    u.traffic_source AS user_traffic_source,

    -- metrics / facts
    p.retail_price,
    oi.sale_price,
    p.cost AS product_cost,

    -- profit
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
JOIN silver.users u ON o.user_id = u.id