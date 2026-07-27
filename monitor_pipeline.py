#!/usr/bin/env python3
"""
Pipeline Status Monitor - Query current progress and batch info
Run this to check: how many users loaded, batch progress, etc.
"""

import sys
sys.path.insert(0, '/opt/airflow')

from scripts.common.postgres import Postgres
from scripts.common.metadata import PipelineMetadata
from scripts.repositories.operational_repository import OperationalRepository
from scripts.common.config import PIPELINE, SCHEMA, SIMULATION
from scripts.common.logger import get_logger

logger = get_logger(__name__)


def monitor_pipeline():
    """Query and display full pipeline status"""
    
    try:
        with Postgres() as db:
            metadata = PipelineMetadata(db)
            repo = OperationalRepository(db)
            
            # Get total users in raw data
            total_users_raw = repo.get_total_users_in_raw()
            
            # Get total users loaded in operational
            db.execute(f"SELECT COUNT(*) FROM {SCHEMA['operational']}.users")
            total_users_operational = db.fetchone()[0]
            
            # Get metadata progress
            progress = metadata.validate_progress(PIPELINE['pipeline_name'], total_users_raw)
            
            # Get last batch info
            state = metadata.get(PIPELINE['pipeline_name'])
            
            # Query other tables
            db.execute(f"SELECT COUNT(*) FROM {SCHEMA['operational']}.orders")
            total_orders = db.fetchone()[0]
            
            db.execute(f"SELECT COUNT(*) FROM {SCHEMA['operational']}.order_items")
            total_order_items = db.fetchone()[0]
            
            db.execute(f"SELECT COUNT(*) FROM {SCHEMA['operational']}.events")
            total_events = db.fetchone()[0]
            
            db.execute(f"SELECT COUNT(*) FROM {SCHEMA['operational']}.order_items_out_of_stock")
            total_oos_items = db.fetchone()[0]
            
            # Display output
            print("\n" + "=" * 100)
            print("PIPELINE STATUS MONITOR")
            print("=" * 100)
            
            print("\n[1] USER LOADING PROGRESS")
            print("-" * 100)
            print(f"  Total Users (Raw):        {total_users_raw:>12,} users")
            print(f"  Loaded Users (Operational): {total_users_operational:>12,} users")
            print(f"  Remaining Users:          {total_users_raw - total_users_operational:>12,} users")
            print(f"  Progress:                 {progress['progress_pct']:>12.2f}%")
            
            print("\n[2] BATCH INFORMATION")
            print("-" * 100)
            print(f"  Current Batch #:          {progress['batch_number']:>12}")
            print(f"  Batch Size Config:        {SIMULATION['batch_user_size']:>12,} users/batch")
            print(f"  Current Offset:           {progress['offset']:>12,} users")
            print(f"  Pipeline Status:          {('✓ COMPLETE' if progress['is_complete'] else '⏳ IN PROGRESS'):>12}")
            
            print("\n[3] RELATED TABLES LOADED")
            print("-" * 100)
            print(f"  Orders:                   {total_orders:>12,} rows")
            print(f"  Order Items (In-Stock):   {total_order_items:>12,} rows")
            print(f"  Events:                   {total_events:>12,} rows")
            print(f"  Order Items (Out-of-Stock): {total_oos_items:>12,} rows")
            
            print("\n[4] TIME ESTIMATE")
            print("-" * 100)
            if progress['is_complete']:
                print(f"  Status:                   ✓ PIPELINE COMPLETE")
                print(f"  Next Action:              None (loading finished)")
            else:
                remaining_users = total_users_raw - progress['offset']
                batches_remaining = (remaining_users + SIMULATION['batch_user_size'] - 1) // SIMULATION['batch_user_size']
                minutes_per_batch = 5  # DAG runs every 5 minutes
                est_time_minutes = batches_remaining * minutes_per_batch
                est_time_hours = est_time_minutes / 60
                
                print(f"  Remaining Users:          {remaining_users:>12,} users")
                print(f"  Remaining Batches:        {batches_remaining:>12} batches")
                print(f"  Est. Time (5min/batch):   {est_time_hours:>12.1f} hours (~{est_time_minutes} minutes)")
            
            print("\n[5] LAST BATCH DETAILS")
            print("-" * 100)
            if state['last_batch_user_min_created_at']:
                print(f"  Last Batch Min Date:      {str(state['last_batch_user_min_created_at']):>30}")
                print(f"  Last Batch Max Date:      {str(state['last_batch_user_max_created_at']):>30}")
            if state['last_run_at']:
                print(f"  Last Run Timestamp:       {str(state['last_run_at']):>30}")
            
            print("\n" + "=" * 100)
            print("QUICK COMMANDS:")
            print("  Monitor:     python monitor_pipeline.py")
            print("  Run Batch:   docker compose exec -T airflow-scheduler python /opt/airflow/test_dag_flow_direct.py")
            print("  Trigger DAG: docker compose exec -T airflow-scheduler airflow dags trigger operational_incremental_loading")
            print("=" * 100 + "\n")
            
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    monitor_pipeline()
