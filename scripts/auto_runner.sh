#!/bin/bash
# Auto-run incremental loader until completion

cd /opt/airflow

TOTAL_RUNS=20
run_count=0

while [ $run_count -lt $TOTAL_RUNS ]; do
  run_count=$((run_count + 1))
  echo ""
  echo "=========================================="
  echo "RUN $run_count / $TOTAL_RUNS"
  echo "=========================================="
  
  # Run loader
  python -m scripts.loaders.incremental_loader 2>&1 | grep -E "BATCH|Out-of-Stock|SUCCESSFULLY|Users:|Progress:" | head -10
  
  # Check if pipeline complete
  COMPLETE=$(python -c "
from scripts.common.postgres import Postgres
from scripts.common.metadata import PipelineMetadata
from scripts.repositories.operational_repository import OperationalRepository
from scripts.common.config import PIPELINE

with Postgres() as db:
    metadata = PipelineMetadata(db)
    repo = OperationalRepository(db)
    total = repo.get_total_users_in_raw()
    progress = metadata.validate_progress(PIPELINE['pipeline_name'], total)
    print(progress['is_complete'])
")
  
  if [ "$COMPLETE" = "True" ]; then
    echo "Pipeline COMPLETE! All 100K users processed."
    break
  fi
  
  sleep 5
done
