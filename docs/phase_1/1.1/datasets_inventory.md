# Phase 1 — Dataset Inventory

## Overview

This dataset is a simulation of a modern e-commerce platform that includes customer data, products, inventory, transactions, user activity (clickstream), and product distribution.

---

# Dataset Summary

| No | Dataset | Domain | Type | PK | FK |
|----|----------|------------|-----------|-------------|-------------|
| 1 | users | Customer | Master | id | - |
| 2 | products | Product Catalog | Master | id | distribution_center_id |
| 3 | distribution_centers | Logistics | Master | id | - |
| 4 | inventory_items | Inventory | Transaction | id | product_id |
| 5 | orders | Sales | Transaction | order_id | user_id |
| 6 | order_items | Sales Detail | Transaction | id | order_id, user_id, product_id, inventory_item_id |
| 7 | events | Customer Activity | Transaction | id | user_id |

---

## 1. users.csv

### Description

Master data that stores all customer information registered on the e-commerce platform. This table is the primary source of user identities used by all business processes, from browsing activity to purchasing transactions.

### Domain

Customer

### Category

Master Data

### Granularity

**1 row = 1 customer**

### Primary Key

`id`

### Foreign Key

-

### Referenced By

- orders.user_id
- order_items.user_id
- events.user_id

### Business Purpose

Provides customer identity information used for user behavior analysis, customer segmentation, transaction history, and service personalization.

---

## 2. products.csv

### Description

Master data that stores the entire product catalog available on the platform. Each row represents a single product type and its business attributes.

### Domain

Product Catalog

### Category

Master Data

### Granularity

**1 row = 1 product**

### Primary Key

`id`

### Foreign Key

`distribution_center_id`

### Referenced By

- inventory_items.product_id
- order_items.product_id

### Business Purpose

Serves as the primary reference for all product information, such as category, brand, department, SKU, selling price, and the location of the distribution center that handles the product.

---

## 3. distribution_centers.csv

### Description

Master data that stores information about each distribution center (warehouse) used to store and distribute products.

### Domain

Logistics

### Category

Master Data

### Granularity

**1 row = 1 distribution center**

### Primary Key

`id`

### Foreign Key

-

### Referenced By

- products.distribution_center_id

### Business Purpose

Provides warehouse location information so that each product can be linked to the distribution center responsible for its storage and distribution.

--

## 4. inventory_items.csv

### Description

Transactional data that stores each physical unit of goods available in inventory. Unlike the products table, which represents product types, this table represents each unit of goods individually.

### Domain

Inventory

### Category

Transactional Data

### Granularity

**1 row = 1 physical inventory item**

### Primary Key

`id`

### Foreign Key

`product_id`

### Referenced By

- order_items.inventory_item_id

### Business Purpose

Tracks the lifecycle of each inventory unit from creation to sale. This information is used for stock monitoring, inventory turnover, and distribution analysis.

---

## 5. orders.csv

### Description

Transactional data that stores the main information for each customer purchase transaction. This table serves as a transaction header that summarizes general information about an order.

### Domain

Sales

### Category

Transactional Data

### Granularity

**1 row = 1 order**

### Primary Key

`order_id`

### Foreign Key

`user_id`

### Referenced By

- order_items.order_id

### Business Purpose

Records customer purchase transactions and order processing statuses such as shipping, delivery, and returns. This table serves as the parent table for transaction details in order_items.

---

## 6. order_items.csv

### Description

Transactional details store each product item included in an order. A single order can consist of multiple order items, making this table the most detailed representation of sales activity.

### Domain

Sales Detail

### Category

Transactional Data

### Granularity

**1 row = 1 purchased item**

### Primary Key

`id`

### Foreign Key

- order_id
- user_id
- product_id
- inventory_item_id

### Referenced By

-

### Business Purpose

Records every product successfully purchased by a customer. This table is the primary source for sales analysis because each row represents one unit of goods sold.

---

## 7. events.csv

### Description

Transactional data that stores all user activity while interacting with the platform, from opening pages, viewing products, to other activities before and after a transaction.

### Domain

Customer Activity

### Category

Behavioral / Clickstream Data

### Granularity

**1 row = 1 user event**

### Primary Key

`id`

### Foreign Key

`user_id`

### Referenced By

-

### Business Purpose

Used to analyze customer behavior, user journey, traffic sources, marketing campaign effectiveness, and the conversion funnel from browsing activity to purchase.