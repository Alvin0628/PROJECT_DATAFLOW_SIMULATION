# DataFlow Simulation

> **A Modern End-to-End Data Engineering Pipeline Simulation using Apache Airflow, PostgreSQL, Docker, FastAPI, and Next.js.**

---

# 📌 Overview

DataFlow Simulation is a Data Engineering simulation project built to represent workflows commonly used in modern production environments.

This project aims to build an end-to-end data pipeline, from raw data collection, data cleansing, validation, transformation, storage to a Data Warehouse, to data presentation via a REST API and Dashboard.

In **Phase 0**, the main focus is building the infrastructure foundation using Docker so that the entire environment can run consistently across devices.

---

# 🚀 Phase Progress

| Phase                                         | Status       |
| --------------------------------------------- | ------------ |
| Phase 0 — Infrastructure Setup                | ✅ Completed |
| Phase 1 — Data Preparation & Warehouse Design | ⏳ Planned   |
| Phase 2 — ETL Pipeline Development            | ⏳ Planned   |
| Phase 3 — Backend API (FastAPI)               | ⏳ Planned   |
| Phase 4 — Frontend Dashboard (Next.js)        | ⏳ Planned   |
| Phase 5 — Deployment                          | ⏳ Planned   |

---

# 🛠 Tech Stack

- Apache Airflow 3.3.0
- PostgreSQL 18
- Docker
- Docker Compose
- Python

> FastAPI and Next.js will be added in the next phase.

---

# 📂 Project Structure

```text
project-root
│
├── airflow/
│ ├── config/
│ ├── dags/
│ ├── logs/
│ └── plugins/
│
├── datasets/
│ ├── master/
│ │ ├── customers.csv
│ │ ├── geolocation.csv
│ │ ├── order_items.csv
│ │ ├── order_payments.csv
│ │ ├── order_reviews.csv
│ │ ├── orders.csv
│ │ ├── products.csv
│ │ ├── product_category_name_translation.csv
│ │ └── sellers.csv
│ │
│ ├── staging/
│ ├── validation/
│ ├── processed/
│ ├── warehouse/
│ ├── exports/
│ └── archive/
│
├── docker/
│ └── airflow/
│ ├── Dockerfiles
│ ├── requirements-airflow.txt
│ └── scripts/
│ └── init.sh
│
├── scripts/
│ └── setup/
│
├── requirements. txt
├── docker-compose.yml
├── .env
├── .gitignore
└── README.md
```

---

# 📁 Folder Description

##airflow/

Contains all the resources used by Apache Airflow.

- `dags/` → Workflow (DAG) that Airflow will execute.
- `logs/` → DAG execution log.
- `plugins/` → Additional Airflow plugins.
- `config/` → Airflow configuration.

---

## dataset/

Stores the entire dataset lifecycle during the ETL process.

### master/

Raw dataset downloaded from Kaggle.

Characteristics:

- One CSV file represents one table.
- Never modified.
- Serves as a single source of truth.

---

### staging/

Results of cleaning each table individually.

Example process:

- Remove duplicates
- Missing value handling
- Data type conversion
- Format standardization
- CSV → Parquet

No joins between tables have been performed.

---

### validation/

Contains data quality validation results.

Examples:

- Foreign key validation
- Orphan records
- Invalid values
- Duplicate report
- Validation report

---

### processed/

Contains the transformed dataset.

Examples:

- Join between tables
- Feature Engineering
- Aggregation
- Business Metrics
- Analytics Dataset

---

### warehouse/

Contains the dataset that has been formed into a Data Warehouse schema (Fact & Dimension) before being loaded into PostgreSQL.

---

### exports/

Saves the export results.

Examples:

- CSV
- Excel
- PDF
- Dashboard dataset

---

### archive/

Backup the old dataset if there is a dataset version change.

---

## docker/

Contains the Docker configuration for each service.

Currently only used to build custom Apache Airflow images.

---

## scripts/

Contains utility scripts used during the project setup process.

For example:

- Download dataset from Kaggle.
- Extract dataset.
- Prepare folder structure.

---

# 🏗 Dataset Pipeline

The dataset in this project follows a layered ETL approach.

```text
Raw Dataset
│
▼
master/
│
▼
staging/
│
▼
validation/
│
▼
processed/
│
▼
warehouse/
│
▼
PostgreSQL
│
▼
API
│
▼
Dashboard
```

---

# 🐳 Docker Architecture

In Phase 0, Docker Compose runs the following services.

| Services              | Description                      |
| --------------------- | -------------------------------- |
| postgres_airflow      | Airflow Metadata Database        |
| postgres_warehouse    | PostgreSQL Data Warehouse        |
| airflow-init          | One-time database initialization |
| airflow-apiserver     | Airflow REST API + Web UI        |
| airflow-scheduler     | DAG Scheduler                    |
| airflow-triggerer     | Trigger asynchronous tasks       |
| airflow-dag-processor | DAG Parser                       |

---

# 🌐 Apache Airflow

This project uses **Apache Airflow 3.3.0**.
