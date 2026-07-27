#!/bin/bash
# Quick commands for pipeline monitoring and control

# === MONITORING COMMANDS ===
# 1. Check current status
echo "=== COMMAND 1: Check Pipeline Status ==="
echo "docker compose exec -T airflow-scheduler python /opt/airflow/monitor_pipeline.py"
echo ""

# 2. Run single batch manually  
echo "=== COMMAND 2: Run Single Batch Manually ==="
echo "docker compose exec -T airflow-scheduler python /opt/airflow/test_dag_flow_direct.py"
echo ""

# 3. Trigger DAG from CLI
echo "=== COMMAND 3: Trigger DAG via CLI ==="
echo "docker compose exec -T airflow-scheduler airflow dags trigger operational_incremental_loading"
echo ""

# 4. List DAG status
echo "=== COMMAND 4: List DAG Status ==="
echo "docker compose exec -T airflow-scheduler airflow dags list"
echo ""

# 5. Check task status
echo "=== COMMAND 5: Check Task Status ==="
echo "docker compose exec -T airflow-scheduler airflow dags list-runs operational_incremental_loading"
echo ""

# 6. View scheduler logs
echo "=== COMMAND 6: View Scheduler Logs (Real-time) ==="
echo "docker compose logs -f airflow-scheduler"
echo ""

# 7. Access Airflow UI
echo "=== COMMAND 7: Access Airflow UI ==="
echo "Open browser: http://localhost:8080"
echo "Login: admin / AF720HDA"
echo ""

# 8. Reset pipeline (start from 0)
echo "=== COMMAND 8: Reset Pipeline Metadata ==="
echo "docker compose exec -T airflow-scheduler python -c \"\
import sys; sys.path.insert(0, '/opt/airflow')
from scripts.common.postgres import Postgres
from scripts.common.metadata import PipelineMetadata
from scripts.common.config import PIPELINE
with Postgres() as db:
    metadata = PipelineMetadata(db)
    metadata.reset(PIPELINE['pipeline_name'])
    print('✓ Pipeline metadata reset to initial state')
\""
echo ""

echo "=== QUICK SYNTAX REFERENCE ==="
echo ""
echo "Monitor Status (once):"
echo "  docker compose exec -T airflow-scheduler python /opt/airflow/monitor_pipeline.py"
echo ""
echo "Monitor Status (continuous every 10 seconds):"
echo "  watch -n 10 'docker compose exec -T airflow-scheduler python /opt/airflow/monitor_pipeline.py'"
echo ""
echo "Trigger DAG manually:"
echo "  docker compose exec -T airflow-scheduler airflow dags trigger operational_incremental_loading"
echo ""
echo "Run one batch manually:"
echo "  docker compose exec -T airflow-scheduler python /opt/airflow/test_dag_flow_direct.py"
echo ""
