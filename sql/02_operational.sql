-- Description:
-- This script creates all operational (OLTP) tables used as
-- the source of truth for the entire data platform.
--
-- Schema:
--   operational
--
-- Notes:
-- - Tables follow the original Kaggle dataset structure.
-- - Relationships are enforced using foreign keys.
-- - Data loading is handled separately by the Bootstrap DAG.
-- - This DDL is created following dependencies
-- ==========================================================

-- ==========================================================
-- Project : E-Commerce Data Platform
-- File    : 02_operational_tables.sql
-- Purpose : Create Operational (OLTP) Database Schema
-- ==========================================================

-- ==========================================================
-- TABLE : distribution_centers
-- Grain : 1 row = 1 distribution center
-- ==========================================================

CREATE TABLE IF NOT EXISTS {{SCHEMA}}.distribution_centers (

    id INTEGER PRIMARY KEY,

    name VARCHAR(255),

    latitude DOUBLE PRECISION,

    longitude DOUBLE PRECISION

);

-- ==========================================================
-- TABLE : products
-- Grain : 1 row = 1 product
-- ==========================================================

CREATE TABLE IF NOT EXISTS {{SCHEMA}}.products (

    id INTEGER PRIMARY KEY,

    cost NUMERIC(10,2),

    category VARCHAR(255),

    name VARCHAR(255),

    brand VARCHAR(255),

    retail_price NUMERIC(10,2),

    department VARCHAR(255),

    sku VARCHAR(100),

    distribution_center_id INTEGER,

    CONSTRAINT fk_products_distribution_center
        FOREIGN KEY (distribution_center_id)
        REFERENCES {{SCHEMA}}.distribution_centers(id)

);

-- ==========================================================
-- TABLE : users
-- Grain : 1 row = 1 user
-- ==========================================================

CREATE TABLE IF NOT EXISTS {{SCHEMA}}.users (

    id INTEGER PRIMARY KEY,

    first_name VARCHAR(255),

    last_name VARCHAR(255),

    email VARCHAR(255),

    age SMALLINT,

    gender VARCHAR(20),

    state VARCHAR(255),

    street_address VARCHAR(255),

    postal_code VARCHAR(20),

    city VARCHAR(255),

    country VARCHAR(100),

    latitude DOUBLE PRECISION,

    longitude DOUBLE PRECISION,

    traffic_source VARCHAR(100),

    created_at TIMESTAMP

);

-- ==========================================================
-- TABLE : inventory_items
-- Grain : 1 row = 1 physical inventory item
-- ==========================================================

CREATE TABLE IF NOT EXISTS {{SCHEMA}}.inventory_items (

    id INTEGER PRIMARY KEY,

    product_id INTEGER,

    created_at TIMESTAMP,

    sold_at TIMESTAMP,

    cost NUMERIC(10,2),

    product_category VARCHAR(255),

    product_name VARCHAR(255),

    product_brand VARCHAR(255),

    product_retail_price NUMERIC(10,2),

    product_department VARCHAR(255),

    product_sku VARCHAR(100),

    product_distribution_center_id INTEGER,

    CONSTRAINT fk_inventory_product
        FOREIGN KEY (product_id)
        REFERENCES {{SCHEMA}}.products(id),

    CONSTRAINT fk_inventory_distribution_center
        FOREIGN KEY (product_distribution_center_id)
        REFERENCES {{SCHEMA}}.distribution_centers(id)

);

-- ==========================================================
-- TABLE : orders
-- Grain : 1 row = 1 order
-- ==========================================================

CREATE TABLE IF NOT EXISTS {{SCHEMA}}.orders (

    order_id INTEGER PRIMARY KEY,

    user_id INTEGER,

    status VARCHAR(50),

    gender VARCHAR(20),

    created_at TIMESTAMP,

    returned_at TIMESTAMP,

    shipped_at TIMESTAMP,

    delivered_at TIMESTAMP,

    num_of_item INTEGER,

    CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id)
        REFERENCES {{SCHEMA}}.users(id)

);

-- ==========================================================
-- TABLE : order_items
-- Grain : 1 row = 1 purchased item
-- ==========================================================

CREATE TABLE IF NOT EXISTS {{SCHEMA}}.order_items (

    id INTEGER PRIMARY KEY,

    order_id INTEGER,

    user_id INTEGER,

    product_id INTEGER,

    inventory_item_id INTEGER,

    status VARCHAR(50),

    created_at TIMESTAMP,

    shipped_at TIMESTAMP,

    delivered_at TIMESTAMP,

    returned_at TIMESTAMP,

    sale_price NUMERIC(10,2),

    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id)
        REFERENCES {{SCHEMA}}.orders(order_id),

    CONSTRAINT fk_order_items_user
        FOREIGN KEY (user_id)
        REFERENCES {{SCHEMA}}.users(id),

    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id)
        REFERENCES {{SCHEMA}}.products(id),

    CONSTRAINT fk_order_items_inventory
        FOREIGN KEY (inventory_item_id)
        REFERENCES {{SCHEMA}}.inventory_items(id)

);

-- ==========================================================
-- TABLE : events
-- Grain : 1 row = 1 website event
-- ==========================================================

CREATE TABLE IF NOT EXISTS {{SCHEMA}}.events (

    id INTEGER PRIMARY KEY,

    user_id INTEGER,

    sequence_number INTEGER,

    session_id VARCHAR(255),

    created_at TIMESTAMP,

    ip_address VARCHAR(50),

    city VARCHAR(255),

    state VARCHAR(255),

    postal_code VARCHAR(20),

    browser VARCHAR(100),

    traffic_source VARCHAR(100),

    uri TEXT,

    event_type VARCHAR(100),

    CONSTRAINT fk_events_user
        FOREIGN KEY (user_id)
        REFERENCES {{SCHEMA}}.users(id)

);

-- ==========================================================
-- TABLE : pipeline_metadata
-- ==========================================================

-- CREATE TABLE IF NOT EXISTS {{SCHEMA}}.pipeline_metadata (

--     pipeline_name VARCHAR(100) PRIMARY KEY,

--     last_user_offset INTEGER DEFAULT 0,

--     last_batch_number INTEGER DEFAULT 0,

--     last_run_at TIMESTAMP,

--     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

-- );

CREATE TABLE IF NOT EXISTS {{SCHEMA}}.pipeline_metadata (

    pipeline_name VARCHAR(100) PRIMARY KEY,

    last_user_offset INTEGER DEFAULT 0,

    last_batch_number INTEGER DEFAULT 0,

    last_batch_user_min_created_at TIMESTAMP,

    last_batch_user_max_created_at TIMESTAMP,

    last_run_at TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);