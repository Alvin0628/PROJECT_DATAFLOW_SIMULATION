CREATE SCHEMA IF NOT EXISTS silver;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE VIEW silver.users AS
SELECT 
    id,
    first_name,
    last_name,
    first_name || ' ' || last_name AS full_name,
    email AS raw_email, 
    ENCODE(DIGEST(email, 'sha256'), 'hex') AS hashed_email,
    age,
    gender,
    state,
    street_address,
    postal_code,
    city,
    country,
    latitude,
    longitude,
    traffic_source,
    created_at
FROM operational.users;

CREATE OR REPLACE VIEW silver.orders AS
WITH order_stock_check AS (
    -- Mengecek apakah ada SATU SAJA item dalam order tersebut yang 
    -- inventory created_at-nya lebih baru dari order created_at
    SELECT 
        o.order_id,
        MAX(CASE WHEN ii.created_at > o.created_at THEN 1 ELSE 0 END) AS has_invalid_stock
    FROM operational.orders o
    LEFT JOIN operational.order_items oi ON o.order_id = oi.order_id
    LEFT JOIN operational.inventory_items ii ON oi.inventory_item_id = ii.id
    GROUP BY o.order_id
)
SELECT 
    o.order_id,
    o.user_id,
    o.status AS original_status,
    CASE 
        WHEN chk.has_invalid_stock = 1 THEN 'Cancelled (Stock Not Exist)'
        ELSE o.status 
    END AS status,
    o.num_of_item,
    o.created_at,
    o.returned_at,
    o.shipped_at,
    o.delivered_at,
    (o.shipped_at - o.created_at) AS processing_time,
    (o.delivered_at - o.shipped_at) AS delivery_time
FROM operational.orders o
JOIN order_stock_check chk ON o.order_id = chk.order_id;

CREATE OR REPLACE VIEW silver.order_items AS
SELECT 
    id,
    order_id,
    inventory_item_id,
    product_id,
    sale_price

FROM operational.order_items;


CREATE OR REPLACE VIEW silver.inventory_items AS
SELECT 
    id,
    product_id,
    created_at,
    sold_at

FROM operational.inventory_items;

-- load only (master data (excepts: inventory items) + events)

CREATE OR REPLACE VIEW silver.products AS
SELECT * FROM operational.products;

CREATE OR REPLACE VIEW silver.distribution_centers AS
SELECT * FROM operational.distribution_centers;

CREATE OR REPLACE VIEW silver.events AS
SELECT * FROM operational.events;