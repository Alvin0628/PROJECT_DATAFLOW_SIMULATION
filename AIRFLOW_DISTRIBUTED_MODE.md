# Airflow 3.3.0 Distributed Mode - Production Setup

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AIRFLOW DISTRIBUTED MODE                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │ WEBSERVER (8080) │         │ API SERVER (8081)│          │
│  │ • UI              │         │ • REST API       │          │
│  │ • Auth            │         │ • External Integrations │
│  └──────────────────┘         └──────────────────┘          │
│           │                             │                    │
│           └─────────────┬───────────────┘                    │
│                         ▼                                     │
│          ┌──────────────────────────┐                        │
│          │   PostgreSQL Metadata DB │                        │
│          │  • DAG definitions       │                        │
│          │  • Task instances        │                        │
│          │  • XCom data             │                        │
│          └──────────────────────────┘                        │
│                  ▲   ▲   ▲   ▲                               │
│                  │   │   │   │                               │
│      ┌───────────┘   │   │   └────────────┐                 │
│      │               │   │                │                 │
│  ┌───────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐
│  │ SCHEDULER │  │ DAG PROC.   │  │ TRIGGERER   │  │ (EXECUTOR) │
│  │ • Parse   │  │ • Parse DAG │  │ • Async     │  │ • Run Tasks│
│  │ • Trigger │  │ • Update DB │  │ • Deferred  │  │            │
│  │ • Queue   │  │             │  │   ops       │  │            │
│  └───────────┘  └─────────────┘  └─────────────┘  └────────────┘
│
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. **WEBSERVER** (airflow-webserver)
- **Port:** 8080
- **Function:** Serves Airflow UI, handles authentication, displays DAGs and task status
- **Health Check:** `curl http://localhost:8080/health`

### 2. **SCHEDULER** (airflow-scheduler)
- **Function:** Monitors DAG schedules, triggers DAG runs at appropriate times, queues tasks
- **Health Check:** `curl http://localhost:8974/health`
- **Key Configs:**
  - `AIRFLOW__CORE__PARALLELISM: 32` - Max parallel tasks across all DAGs
  - `AIRFLOW__CORE__DAG_CONCURRENCY: 16` - Max tasks per DAG
  - `AIRFLOW__CORE__MAX_ACTIVE_RUNS_PER_DAG: 3` - Max concurrent DAG runs

### 3. **DAG PROCESSOR** (airflow-dag-processor)
- **Function:** Continuously parses DAG files, updates database with DAG definitions
- **Behavior:** Runs in background, no external port
- **Interval:** Checks for new/updated DAGs every 30 seconds

### 4. **TRIGGERER** (airflow-triggerer)
- **Function:** Handles deferrable operators and async triggers
- **Health Check:** `curl http://localhost:8975/health`
- **Use Case:** For tasks that can yield control and resume later (not blocking)

### 5. **API SERVER** (airflow-apiserver)
- **Port:** 8081
- **Function:** Provides REST API (`/api/v2/...`) for external integrations
- **Health Check:** `curl http://localhost:8081/api/v2/version`

### 6. **PostgreSQL METADATA DB** (postgres_airflow)
- **Port:** 5432
- **Function:** Stores all Airflow metadata
- **Data:**
  - DAG definitions
  - Task instances and states
  - XCom communication data
  - Users and connections
  - Variable storage

## Startup Procedure

### Step 1: Initialize Database (One-time)
```bash
docker compose --profile init up airflow-init
```
This will:
- Run database migrations
- Create admin user with credentials from `.env`
  - Username: `${_AIRFLOW_WWW_USER_USERNAME}` (default: admin)
  - Password: `${_AIRFLOW_WWW_USER_PASSWORD}` (default: airflow)

### Step 2: Start All Services
```bash
docker compose up -d
```

### Step 3: Verify Services
```bash
docker compose ps
```

Expected output:
```
airflow-webserver       Up (healthy)
airflow-scheduler       Up (healthy)
airflow-dag-processor   Up
airflow-triggerer       Up (healthy)
airflow-apiserver       Up (healthy)
postgres_airflow        Up (healthy)
postgres_warehouse      Up (healthy)
```

## Accessing Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **Airflow UI** | http://localhost:8080 | admin / AF720HDA |
| **REST API** | http://localhost:8081/api/v2 | Use Webserver creds |
| **PostgreSQL (Airflow)** | localhost:5432 | postgres_airflow / AF720HDA |
| **PostgreSQL (Warehouse)** | localhost:5433 | postgres_warehouse / WH721HDA |

## Common Operations

### View Logs
```bash
# Webserver logs
docker compose logs -f airflow-webserver

# Scheduler logs
docker compose logs -f airflow-scheduler

# All Airflow services
docker compose logs -f airflow-webserver airflow-scheduler airflow-dag-processor airflow-triggerer
```

### Pause/Resume DAG
```bash
# Pause DAG
docker compose exec airflow-scheduler airflow dags pause operational_incremental_loading

# Unpause DAG
docker compose exec airflow-scheduler airflow dags unpause operational_incremental_loading
```

### Manually Trigger DAG
```bash
docker compose exec airflow-scheduler airflow dags trigger operational_incremental_loading
```

### Create New User
```bash
docker compose exec airflow-webserver airflow users create \
  --username newuser \
  --firstname First \
  --lastname Last \
  --role Admin \
  --email newuser@example.com \
  --password newpassword
```

### Reset Everything
```bash
# Stop all services
docker compose down

# Remove volumes (careful! deletes all data)
docker volume rm project_dataflow_simulation_postgres_airflow_data
docker volume rm project_dataflow_simulation_postgres_warehouse_data

# Start fresh
docker compose --profile init up airflow-init
docker compose up -d
```

## Key Differences from Standalone Mode

| Feature | Standalone | Distributed |
|---------|-----------|-------------|
| **Containers** | 1 | 5+ (webserver, scheduler, triggerer, dag-processor, api-server) |
| **Scalability** | Limited | Highly scalable |
| **Use Case** | Development/Testing | Production |
| **Single Point of Failure** | Yes (entire Airflow dies if container dies) | No (other services continue) |
| **Parallelism** | Limited by single container | High (multi-container execution) |
| **API Access** | Limited | Full REST API |
| **Executor** | LocalExecutor only | LocalExecutor, CeleryExecutor, KubernetesExecutor, etc |

## Production Recommendations

1. **Use CeleryExecutor + Redis** for true distributed task execution:
   - Replace LocalExecutor with CeleryExecutor
   - Add Redis as message broker
   - Scale Celery workers independently

2. **External Monitoring:**
   - Setup Prometheus + Grafana
   - Monitor container health
   - Alert on failures

3. **Persistent Storage:**
   - Use managed PostgreSQL (AWS RDS, GCP Cloud SQL)
   - Volume backups for logs and data

4. **Logging Centralization:**
   - Setup ELK Stack or CloudWatch
   - All container logs → centralized logging

5. **Kubernetes Deployment:**
   - Helm charts available
   - Auto-scaling
   - Better orchestration

## Troubleshooting

### Webserver shows "502 Bad Gateway"
```bash
# Check webserver health
docker compose logs airflow-webserver | grep -i error

# Restart webserver
docker compose restart airflow-webserver
```

### DAGs not showing in UI
```bash
# Check DAG processor logs
docker compose logs airflow-dag-processor

# Manually trigger DAG parsing
docker compose exec airflow-scheduler airflow dags list
```

### Tasks not running
```bash
# Check scheduler health
docker compose logs airflow-scheduler

# Verify DAG is unpaused
docker compose exec airflow-scheduler airflow dags list

# Check task logs
docker compose exec airflow-scheduler airflow tasks list operational_incremental_loading
```

### Database connection errors
```bash
# Check PostgreSQL is healthy
docker compose ps postgres_airflow

# Test connection
docker compose exec postgres_airflow pg_isready -U postgres_airflow
```
