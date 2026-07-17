# Phase 1.3 — Operational Data Model

---

# Overview

Based on the dataset understanding (Phase 1.1) and business understanding (Phase 1.2), the operational database schema has been reconstructed to represent the original transactional system used by the e-commerce platform.

The operational database consists of seven core entities responsible for customer management, product catalog, inventory management, purchasing transactions, customer activities, and warehouse distribution.

This schema serves as the operational source system (OLTP) that will later be ingested into PostgreSQL before entering the ELT pipeline.

---

# Operational Database Schema

| Table                | Business Domain   | Primary Key |
| -------------------- | ----------------- | ----------- |
| users                | Customer          | id          |
| events               | Customer Activity | id          |
| products             | Product Catalog   | id          |
| inventory_items      | Inventory         | id          |
| orders               | Commerce          | order_id    |
| order_items          | Commerce          | id          |
| distribution_centers | Logistics         | id          |

---

# Entity Relationship Diagram

The complete operational schema is illustrated below.

> **Files**

```
operational_erd.png
```

---

# Relationship Analysis

## Users → Orders

| Property     | Value                     |
| ------------ | ------------------------- |
| Relationship | One-to-Many (1:N)         |
| Parent Table | users                     |
| Child Table  | orders                    |
| Foreign Key  | orders.user_id → users.id |

### Business Justification

A registered customer may place multiple orders throughout their lifetime.

However, every order belongs to exactly one customer.

---

## Users → Events

| Property     | Value                     |
| ------------ | ------------------------- |
| Relationship | One-to-Many (1:N)         |
| Parent Table | users                     |
| Child Table  | events                    |
| Foreign Key  | events.user_id → users.id |

### Business Justification

Every interaction performed by a customer generates an event.

A customer can therefore produce thousands of events, while every event belongs to exactly one customer.

---

## Orders → Order Items

| Property     | Value                                  |
| ------------ | -------------------------------------- |
| Relationship | One-to-Many (1:N)                      |
| Parent Table | orders                                 |
| Child Table  | order_items                            |
| Foreign Key  | order_items.order_id → orders.order_id |

### Business Justification

One order may contain multiple purchased products.

Each purchased product is represented as one row inside **order_items**.

---

## Products → Inventory Items

| Property     | Value                                    |
| ------------ | ---------------------------------------- |
| Relationship | One-to-Many (1:N)                        |
| Parent Table | products                                 |
| Child Table  | inventory_items                          |
| Foreign Key  | inventory_items.product_id → products.id |

### Business Justification

A product represents the catalog.

Inventory Items represent the physical stock.

One product may therefore own many physical inventory units.

---

## Products → Order Items

| Property     | Value                                |
| ------------ | ------------------------------------ |
| Relationship | One-to-Many (1:N)                    |
| Parent Table | products                             |
| Child Table  | order_items                          |
| Foreign Key  | order_items.product_id → products.id |

### Business Justification

A product may be purchased multiple times across different customer orders.

---

## Distribution Centers → Products

| Property     | Value                                                     |
| ------------ | --------------------------------------------------------- |
| Relationship | One-to-Many (1:N)                                         |
| Parent Table | distribution_centers                                      |
| Child Table  | products                                                  |
| Foreign Key  | products.distribution_center_id → distribution_centers.id |

### Business Justification

Each product is assigned to one distribution center.

A distribution center stores many products.

---

## Distribution Centers → Inventory Items

| Property     | Value                                                                    |
| ------------ | ------------------------------------------------------------------------ |
| Relationship | One-to-Many (1:N)                                                        |
| Parent Table | distribution_centers                                                     |
| Child Table  | inventory_items                                                          |
| Foreign Key  | inventory_items.product_distribution_center_id → distribution_centers.id |

### Business Justification

Each physical inventory item belongs to one warehouse location.

---

## Inventory Items → Order Items

| Property     | Value                                              |
| ------------ | -------------------------------------------------- |
| Relationship | One-to-(Zero or One) (1:0..1)                      |
| Parent Table | inventory_items                                    |
| Child Table  | order_items                                        |
| Foreign Key  | order_items.inventory_item_id → inventory_items.id |

### Business Justification

An inventory item represents one unique physical product.

A physical product may remain unsold, or once sold, it can only appear in one order item.

---

# Cardinality Summary

| Parent Entity        | Child Entity    | Cardinality |
| -------------------- | --------------- | ----------- |
| users                | orders          | 1 : N       |
| users                | events          | 1 : N       |
| orders               | order_items     | 1 : N       |
| products             | inventory_items | 1 : N       |
| products             | order_items     | 1 : N       |
| distribution_centers | products        | 1 : N       |
| distribution_centers | inventory_items | 1 : N       |
| inventory_items      | order_items     | 1 : 0..1    |

---

# Primary Keys

| Table                | Primary Key |
| -------------------- | ----------- |
| users                | id          |
| events               | id          |
| products             | id          |
| inventory_items      | id          |
| orders               | order_id    |
| order_items          | id          |
| distribution_centers | id          |

---

# Foreign Keys

| Child Table     | Foreign Key                    | Parent Table            |
| --------------- | ------------------------------ | ----------------------- |
| orders          | user_id                        | users.id                |
| events          | user_id                        | users.id                |
| order_items     | order_id                       | orders.order_id         |
| order_items     | product_id                     | products.id             |
| order_items     | inventory_item_id              | inventory_items.id      |
| inventory_items | product_id                     | products.id             |
| products        | distribution_center_id         | distribution_centers.id |
| inventory_items | product_distribution_center_id | distribution_centers.id |

---

# Referential Integrity Rules

The operational database enforces the following logical constraints.

- An order cannot exist without a customer.
- An event cannot exist without a customer.
- An order item cannot exist without an order.
- An order item cannot reference a non-existing product.
- An inventory item must belong to one product.
- A product must belong to one distribution center.
- A physical inventory item can only be sold once.

---

# Normalization Assessment

| Table                | Expected Normal Form |
| -------------------- | -------------------- |
| users                | 3NF                  |
| events               | 3NF                  |
| products             | 3NF                  |
| inventory_items      | 3NF                  |
| orders               | 3NF                  |
| order_items          | 3NF                  |
| distribution_centers | 3NF                  |

The operational schema is highly normalized to minimize redundancy and maintain transactional consistency.

Analytical denormalization will be performed later during the ELT process when constructing the Silver and Gold layers.

---

# Deliverables

This phase produces the following artifacts.

```
1. Operational Data Model Documentation (README.md)
2. Operational ERD (.png)
```

---

# Conclusion

The operational data model successfully reconstructs the transactional database underlying the Google Looker E-commerce dataset.

The resulting schema defines the relationships between all operational entities and establishes the structural foundation required for implementing the PostgreSQL operational database, ELT pipeline, analytical warehouse, REST API, dashboards, and machine learning workflows in subsequent phases.
