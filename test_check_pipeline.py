#!/usr/bin/env python3
import sys
sys.path.insert(0, '/opt/airflow')

from scripts.common.postgres import Postgres
from scripts.common.metadata import PipelineMetadata
from scripts.repositories.operational_repository import OperationalRepository
from scripts.common.config import PIPELINE
from airflow.exceptions import AirflowSkipException

pipeline_name = PIPELINE["pipeline_name"]

print(f"[DEBUG] Pipeline name: {pipeline_name}")

try:
    with Postgres() as db:
        print("[DEBUG] Connected to PostgreSQL")
        
        metadata = PipelineMetadata(db)
        print("[DEBUG] PipelineMetadata initialized")
        
        repo = OperationalRepository(db)
        print("[DEBUG] OperationalRepository initialized")
        
        total_users = repo.get_total_users_in_raw()
        print(f"[DEBUG] Total users in raw: {total_users}")
        
        progress = metadata.validate_progress(pipeline_name, total_users)
        print(f"[DEBUG] Progress: {progress}")
        
        if progress["is_complete"]:
            print("Pipeline complete - would raise AirflowSkipException")
            raise AirflowSkipException("Pipeline complete")
        else:
            print(f"Pipeline NOT complete - would continue. Progress: {progress['progress_pct']:.2f}%")

except Exception as e:
    print(f"[ERROR] {type(e).__name__}: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("[SUCCESS] Task should work!")
