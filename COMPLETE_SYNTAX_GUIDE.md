# PIPELINE MONITORING - COMPLETE SYNTAX REFERENCE

## 1️⃣ CHECK STATUS SEKARANG (Berapa user sudah loaded, progress, batch ke berapa)

```bash
# Quick status (single line)
docker compose exec -T airflow-scheduler python /opt/airflow/quick_status.py

# Full status (detailed)
docker compose exec -T airflow-scheduler python /opt/airflow/monitor_pipeline.py
```

**Output contoh**:
```
Loaded:  25,000 / Total: 100,000 | Progress:   25.0% | Batch # 5 | IN PROGRESS
```

---

## 2️⃣ RUN DAG DARI UI AIRFLOW

**URL**: http://localhost:8080

**Login**: 
- Username: `admin`
- Password: `AF720HDA`

**Steps**:
1. Klik DAG: `operational_incremental_loading`
2. Klik tombol ▶️ (Trigger)
3. Monitor di "Graph" tab

**DAG akan**:
- Jalan otomatis setiap 5 menit
- Satu kali run = satu batch (5000 users)
- Berjalan sampai habis data user (100,000 users)
- Progress terlihat di logs

---

## 3️⃣ RUN BATCH MANUAL VIA CLI (Simulasi satu batch)

```bash
# Run one batch manually
docker compose exec -T airflow-scheduler python /opt/airflow/test_dag_flow_direct.py
```

**Output**: Lihat progress batch loading dengan detail

---

## 4️⃣ TRIGGER DAG VIA CLI

```bash
# Trigger DAG sekali (akan run per 5 menit otomatis setelah ini)
docker compose exec -T airflow-scheduler airflow dags trigger operational_incremental_loading
```

**Output**:
```
Creating DagRun:
  dag_id=operational_incremental_loading
  run_id=manual__2026-07-22T12:56:53.251564+00:00
  state=queued
```

---

## 5️⃣ LIHAT STATUS DAG

```bash
# List semua DAGs
docker compose exec -T airflow-scheduler airflow dags list

# List runs untuk DAG ini
docker compose exec -T airflow-scheduler airflow dags list-runs operational_incremental_loading

# Get status task tertentu
docker compose exec -T airflow-scheduler airflow tasks state operational_incremental_loading check_pipeline_completion <run_id>
```

---

## 6️⃣ LIHAT LOGS REAL-TIME

```bash
# Scheduler logs (shows task execution)
docker compose logs -f airflow-scheduler

# Webserver logs (shows UI activity)
docker compose logs -f airflow-webserver
```

---

## 7️⃣ QUERY DATABASE DIRECT (SQL)

```bash
# Access PostgreSQL directly
docker compose exec -T postgres_warehouse psql -U postgres_warehouse -d Looker_ECommerce -c "
  SELECT 
    'raw' as schema,
    COUNT(*) as users
  FROM operational_raw.users
  UNION ALL
  SELECT 
    'operational',
    COUNT(*)
  FROM operational.users;
"
```

**Output**:
```
 schema    | users
-----------+--------
 raw       | 100000
 operational|  25000
```

---

## 8️⃣ RESET PIPELINE (Start from 0)

```bash
# Clear metadata (restart batching from user 0)
docker compose exec -T airflow-scheduler python -c "
import sys; sys.path.insert(0, '/opt/airflow')
from scripts.common.postgres import Postgres
from scripts.common.metadata import PipelineMetadata
from scripts.common.config import PIPELINE
with Postgres() as db:
    metadata = PipelineMetadata(db)
    metadata.reset(PIPELINE['pipeline_name'])
    print('✓ Pipeline metadata reset')
"

# Clear operational tables (delete loaded data)
docker compose exec -T postgres_warehouse psql -U postgres_warehouse -d Looker_ECommerce -c "
  TRUNCATE TABLE operational.order_items_out_of_stock;
  TRUNCATE TABLE operational.order_items;
  TRUNCATE TABLE operational.events;
  TRUNCATE TABLE operational.orders;
  TRUNCATE TABLE operational.users;
  TRUNCATE TABLE operational.inventory_items;
"
```

---

## 📊 EXAMPLE WORKFLOW

### Skenario: Monitor pipeline dari start sampai complete

```bash
# 1. Start monitoring (lihat awal)
docker compose exec -T airflow-scheduler python /opt/airflow/monitor_pipeline.py

# Output:
# Total Users (Raw):             100,000 users
# Loaded Users (Operational):            0 users
# Progress:                          0.00%
# Est. Time: ~20 hours


# 2. Trigger DAG via UI (atau via CLI)
docker compose exec -T airflow-scheduler airflow dags trigger operational_incremental_loading


# 3. Monitor progress every 5 minutes
# Terminal 1: Live logs
docker compose logs -f airflow-scheduler

# Terminal 2: Check status (jalankan berkali-kali)
docker compose exec -T airflow-scheduler python /opt/airflow/quick_status.py

# Expected output setelah 5 menit:
# Loaded:   5,000 / Total: 100,000 | Progress:    5.0% | Batch # 1 | IN PROGRESS

# Expected output setelah 10 menit:
# Loaded:  10,000 / Total: 100,000 | Progress:   10.0% | Batch # 2 | IN PROGRESS

# ... (continue every 5 minutes)

# Final output (setelah ~100 menit):
# Loaded: 100,000 / Total: 100,000 | Progress:  100.0% | Batch #20 | ✓ COMPLETE
```

---

## ⚡ QUICK CHEAT SHEET

| Action | Command |
|--------|---------|
| Check status now | `docker compose exec -T airflow-scheduler python /opt/airflow/quick_status.py` |
| Full status detail | `docker compose exec -T airflow-scheduler python /opt/airflow/monitor_pipeline.py` |
| Trigger DAG | `docker compose exec -T airflow-scheduler airflow dags trigger operational_incremental_loading` |
| View logs | `docker compose logs -f airflow-scheduler` |
| Run batch manually | `docker compose exec -T airflow-scheduler python /opt/airflow/test_dag_flow_direct.py` |
| Access UI | http://localhost:8080 (admin / AF720HDA) |
| List DAGs | `docker compose exec -T airflow-scheduler airflow dags list` |
| Query user count | `docker compose exec -T postgres_warehouse psql -U postgres_warehouse -d Looker_ECommerce -c "SELECT COUNT(*) FROM operational.users;"` |

---

## 🎯 UNTUK PERTANYAAN ANDA

**Q: "kalau saya run di UI airflow bisa?"**
✅ A: Ya, bisa! Di Airflow UI → click tombol ▶️ (trigger) → DAG akan jalan otomatis setiap 5 menit sampai complete

**Q: "syntax untuk tanya ada berapa user sekarang dan info batchingnya sampai mana di cmd?"**
✅ A: 
```bash
# Quick: semua info dalam satu baris
docker compose exec -T airflow-scheduler python /opt/airflow/quick_status.py

# Detail: penjelasan lengkap
docker compose exec -T airflow-scheduler python /opt/airflow/monitor_pipeline.py
```

Output akan tunjukin:
- Berapa user sudah loaded
- Total user
- Progress % 
- Batch ke berapa
- Estimasi selesai kapan
