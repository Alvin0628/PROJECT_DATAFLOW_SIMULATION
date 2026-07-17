# Phase 1.2 — Business Understanding

---

# Objective

Before designing the operational database, ELT pipeline, analytics layer, and machine learning workflows, it is essential to understand how the business operates.

This phase focuses on understanding the overall business domain represented by the Google Looker E-commerce dataset, including customer interactions, purchasing workflows, inventory management, warehouse operations, and logistics.

The knowledge gathered in this phase becomes the business foundation for every subsequent phase, including:

- Operational ERD Design
- ELT Pipeline
- Data Warehouse
- Analytics Dashboard
- Machine Learning Pipeline
- REST API
- Frontend Dashboard

---

# Business Overview

The Google Looker E-commerce dataset simulates the operational database of a modern e-commerce company.

Unlike a traditional sales dataset, this dataset captures the complete operational lifecycle of an online retail business—from customer registration and browsing behavior to purchasing, inventory allocation, shipping, delivery, and returns.

The operational nature of this dataset allows multiple disciplines to be implemented throughout the project, including:

- Data Engineering
- Business Intelligence
- Product Analytics
- Machine Learning
- Backend Engineering

---

# Business Domains

The operational database can be divided into four primary business domains.

## Customer Domain

**Purpose**

Manage customer information and customer interactions.

**Related Tables**

- users
- events

Responsible for:

- Customer registration
- Website activities
- Traffic acquisition
- Customer behavior

---

## Commerce Domain

**Purpose**

Manage purchasing transactions.

**Related Tables**

- orders
- order_items

Responsible for:

- Checkout
- Purchasing
- Order tracking
- Revenue generation

---

## Inventory Domain

**Purpose**

Manage physical inventory.

**Related Tables**

- products
- inventory_items

Responsible for:

- Product catalog
- Stock management
- Inventory lifecycle

---

## Logistics Domain

**Purpose**

Manage warehouse operations and product distribution.

**Related Tables**

- distribution_centers

Responsible for:

- Inventory storage
- Shipping
- Product distribution

---

# Business Actors

The operational workflow involves several business actors.

| Actor | Responsibility |
|---------|----------------|
| Customer | Browse products and place orders |
| Website | Records customer activities |
| Warehouse | Stores physical inventory |
| Distribution Center | Ships products |
| Inventory System | Tracks stock availability |

---

# Core Business Objects

The entire business revolves around several core entities.

| Business Object | Description |
|-----------------|-------------|
| User | Registered customer |
| Event | Website interaction |
| Product | Product catalog |
| Inventory Item | Physical product unit |
| Order | Customer purchase |
| Order Item | Purchased product |
| Distribution Center | Warehouse location |

---

# Customer Journey

The following diagram illustrates the complete customer purchasing lifecycle.

```text
Customer Registration
        │
        ▼
User Created
        │
        ▼
Browse Website
        │
        ▼
Events Logged
        │
        ▼
Product Selection
        │
        ▼
Checkout
        │
        ▼
Order Created
        │
        ▼
Order Items Created
        │
        ▼
Inventory Allocated
        │
        ▼
Shipping
        │
        ▼
Delivered
```

Throughout the process, every interaction is continuously recorded inside the operational database.

---

# Warehouse Journey

From the warehouse perspective, products follow a different lifecycle.

```text
Distribution Center
        │
        ▼
Product Catalog
        │
        ▼
Inventory Created
        │
        ▼
Available Stock
        │
        ▼
Purchased
        │
        ▼
Sold
        │
        ▼
Shipped
        │
        ▼
Delivered / Returned
```

---

# Business Event Lifecycle

Each operational event modifies one or more database tables.

| Business Event | Affected Tables |
|----------------|-----------------|
| Customer Registration | users |
| Website Visit | events |
| Product Browsing | events |
| Checkout | orders |
| Order Creation | orders |
| Product Allocation | inventory_items |
| Shipping | order_items |
| Delivery | orders, order_items |
| Return | orders, order_items |

---

# Business Questions

The operational database provides opportunities to answer numerous business questions.

These questions will become the primary objectives for subsequent phases, including SQL development, ELT transformation, dashboard implementation, REST API development, and machine learning models.

---

## Customer Analytics

### Customer Acquisition

- How many new customers register each day, week, and month?
- Which traffic source acquires the most customers?
- Which city, state, and country contribute the most customers?
- What is the customer acquisition trend over time?

### Customer Demographics

- What is the age distribution of customers?
- What is the gender distribution?
- Which demographic generates the highest revenue?

### Customer Behavior

- How often does each customer visit the platform?
- Which browsers are most frequently used?
- Which pages receive the highest traffic?
- What customer navigation patterns occur before purchasing?
- How many sessions occur before the first purchase?
- Which events are most common?

### Customer Retention

- Which customers become repeat buyers?
- Which customers become inactive?
- What is the customer retention rate?
- What is the customer churn rate?

### Customer Value

- Who are the highest-value customers?
- Which customers contribute the highest lifetime revenue?

---

## Sales Analytics

### Revenue

- Total revenue
- Revenue by day, week, month, and year
- Revenue growth trend
- Revenue contribution by category
- Revenue contribution by brand

### Orders

- Number of orders
- Average order value
- Average number of items per order
- Largest order
- Smallest order

### Purchasing Behavior

- Which products are purchased together?
- Which categories perform best?
- Which brands perform best?
- Which products rarely sell?

### Returns

- Overall return rate
- Return rate by product
- Return rate by category
- Return rate by customer
- Return rate by warehouse

---

## Inventory Analytics

- Current inventory availability
- Inventory aging
- Inventory turnover
- Fast moving products
- Slow moving products
- Dead stock
- Average selling duration
- Product availability by warehouse
- Products with no sales

---

## Logistics Analytics

- Warehouse utilization
- Distribution center performance
- Shipping duration
- Delivery duration
- Delivery success rate
- Warehouse return rate
- Customer distribution by warehouse

---

## Website Analytics

- Website traffic trend
- Visitor growth
- Returning visitors
- Traffic source effectiveness
- Browser usage
- Conversion funnel
- Geographic visitor distribution
- Most visited pages
- Most common customer journey

---

## Operational Analytics

- Order fulfillment time
- Shipping efficiency
- Delivery efficiency
- Return processing time
- Operational bottlenecks
- Order completion rate

---

## Machine Learning Opportunities

The operational dataset also supports predictive analytics.

Potential machine learning use cases include:

- Customer Segmentation
- Customer Churn Prediction
- Customer Lifetime Value Prediction
- Customer Purchase Prediction
- Product Recommendation
- Cross-selling Recommendation
- Sales Forecasting
- Revenue Forecasting
- Inventory Demand Forecasting
- Inventory Optimization
- Marketing Conversion Prediction
- Fraud Detection

---

# Dashboard Opportunities

Based on the identified business questions, the project can later implement several dashboards.

- Executive Dashboard
- Customer Analytics Dashboard
- Sales Dashboard
- Inventory Dashboard
- Logistics Dashboard
- Product Dashboard
- Website Analytics Dashboard
- Machine Learning Dashboard

---

# Summary

The Google Looker E-commerce dataset represents the complete operational workflow of a modern e-commerce business.

Rather than focusing solely on transactions, the dataset captures customer behavior, purchasing activities, inventory movement, warehouse operations, and logistics.

Understanding these business processes establishes the foundation for designing the operational database, implementing the ELT pipeline, constructing analytical dashboards, exposing REST APIs, and developing machine learning models throughout the subsequent phases of this project.