# DataFlow Simulation

> **A Modern End-to-End Data Engineering Pipeline Simulation using Apache Airflow, PostgreSQL, Docker, FastAPI, and Next.js.**

---

# 📌 Overview

DataFlow Simulation merupakan proyek simulasi Data Engineering yang dibangun untuk merepresentasikan workflow yang umum digunakan pada lingkungan produksi modern.

Project ini bertujuan membangun sebuah pipeline data end-to-end mulai dari proses pengambilan data mentah, pembersihan data, validasi, transformasi, penyimpanan ke Data Warehouse, hingga penyajian data melalui REST API dan Dashboard.

Pada **Phase 0**, fokus utama adalah membangun fondasi infrastruktur menggunakan Docker sehingga seluruh environment dapat dijalankan secara konsisten di berbagai perangkat.

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

> FastAPI dan Next.js akan ditambahkan pada phase selanjutnya.

---

# 📂 Project Structure

```text
project-root
│
├── airflow/
│   ├── config/
│   ├── dags/
│   ├── logs/
│   └── plugins/
│
├── dataset/
│   ├── master/
│   │   ├── customers.csv
│   │   ├── geolocation.csv
│   │   ├── order_items.csv
│   │   ├── order_payments.csv
│   │   ├── order_reviews.csv
│   │   ├── orders.csv
│   │   ├── products.csv
│   │   ├── product_category_name_translation.csv
│   │   └── sellers.csv
│   │
│   ├── staging/
│   ├── validation/
│   ├── processed/
│   ├── warehouse/
│   ├── exports/
│   └── archive/
│
├── docker/
│   └── airflow/
│       ├── Dockerfile
│       ├── requirements-airflow.txt
│       └── scripts/
│           └── init.sh
│
├── scripts/
│   └── setup/
│
├── requirements.txt
├── docker-compose.yml
├── .env
├── .gitignore
└── README.md
```

---

# 📁 Folder Description

## airflow/

Berisi seluruh resource yang digunakan oleh Apache Airflow.

- `dags/` → Workflow (DAG) yang akan dijalankan Airflow.
- `logs/` → Log eksekusi DAG.
- `plugins/` → Plugin tambahan Airflow.
- `config/` → Konfigurasi Airflow.

---

## dataset/

Menyimpan seluruh lifecycle dataset selama proses ETL.

### master/

Raw dataset hasil download dari Kaggle.

Karakteristik:

- Satu file CSV merepresentasikan satu tabel.
- Tidak pernah dimodifikasi.
- Menjadi single source of truth.

---

### staging/

Hasil cleaning setiap tabel secara individual.

Contoh proses:

- Remove duplicate
- Missing value handling
- Data type conversion
- Standardisasi format
- CSV → Parquet

Belum dilakukan proses join antar tabel.

---

### validation/

Berisi hasil validasi kualitas data.

Contoh:

- Foreign key validation
- Orphan records
- Invalid values
- Duplicate report
- Validation report

---

### processed/

Berisi dataset hasil transformasi.

Contoh:

- Join antar tabel
- Feature Engineering
- Aggregation
- Business Metrics
- Analytics Dataset

---

### warehouse/

Berisi dataset yang telah dibentuk menjadi skema Data Warehouse (Fact & Dimension) sebelum dimuat ke PostgreSQL.

---

### exports/

Menyimpan hasil export.

Contoh:

- CSV
- Excel
- PDF
- Dashboard dataset

---

### archive/

Backup dataset lama apabila terjadi perubahan versi dataset.

---

## docker/

Berisi konfigurasi Docker untuk setiap service.

Saat ini hanya digunakan untuk membangun custom image Apache Airflow.

---

## scripts/

Berisi utility script yang digunakan selama proses setup project.

Contohnya:

- Download dataset dari Kaggle.
- Ekstraksi dataset.
- Persiapan struktur folder.

---

# 🏗 Dataset Pipeline

Dataset pada project ini mengikuti pendekatan ETL berlapis.

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

Pada Phase 0, Docker Compose menjalankan beberapa service berikut.

| Service               | Description                      |
| --------------------- | -------------------------------- |
| postgres_airflow      | Airflow Metadata Database        |
| postgres_warehouse    | PostgreSQL Data Warehouse        |
| airflow-init          | One-time database initialization |
| airflow-apiserver     | Airflow REST API + Web UI        |
| airflow-scheduler     | DAG Scheduler                    |
| airflow-triggerer     | Trigger asynchronous task        |
| airflow-dag-processor | DAG Parser                       |

---

# 🌐 Apache Airflow

Project ini menggunakan **Apache Airflow 3.3.0**.

Mulai versi 3.x, Airflow tidak lagi menggunakan service terpisah bernama **webserver**.

Sebagai gantinya, **airflow-apiserver** menjalankan dua fungsi sekaligus:

- REST API
- Web User Interface (UI)

Sehingga dashboard Airflow dapat langsung diakses melalui browser.

```
http://localhost:8080
```

---

# ⚙️ Installation

## 1. Clone Repository

```bash
git clone <repository-url>

cd project-root
```

---

## 2. Configure Environment Variables

Buat file `.env` sesuai kebutuhan project.

---

## 3. Build Docker Image

```bash
docker compose build
```

---

## 4. Start All Services

```bash
docker compose up -d
```

---

## 5. Verify Running Containers

```bash
docker ps
```

Service yang diharapkan berjalan:

- postgres_airflow
- postgres_warehouse
- airflow-apiserver
- airflow-scheduler
- airflow-triggerer
- airflow-dag-processor

---

## 6. Open Airflow

Buka browser.

```
http://localhost:8080
```

---

# ✅ Phase 0 Deliverables

Pada akhir Phase 0, project telah berhasil menyediakan:

- Dockerized Development Environment
- Apache Airflow 3.3.0
- Airflow Web UI
- Airflow REST API
- PostgreSQL Metadata Database
- PostgreSQL Data Warehouse
- Multi-container orchestration menggunakan Docker Compose
- Dataset setup dan struktur project yang siap digunakan untuk pengembangan ETL

---

# 🎯 Next Phase

Phase berikutnya akan berfokus pada:

- Mendesain skema Data Warehouse.
- Menyiapkan proses ETL pertama menggunakan Apache Airflow.
- Membangun pipeline mulai dari raw dataset hingga PostgreSQL Data Warehouse.
