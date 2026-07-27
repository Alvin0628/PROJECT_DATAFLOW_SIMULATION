#!/usr/bin/env python3
"""
Direct DAG Logic Test
Test the incremental loading pipeline logic WITHOUT Airflow execution environment
Ini adalah validasi end-to-end dari business logic saja
"""

import sys
sys.path.insert(0, '/opt/airflow')

from scripts.common.postgres import Postgres
from scripts.repositories.operational_repository import OperationalRepository
from scripts.common.metadata import PipelineMetadata
from scripts.common.config import PIPELINE, SCHEMA, SIMULATION
from scripts.loaders.incremental_loader import IncrementalLoader
from scripts.common.logger import get_logger

logger = get_logger(__name__)


def test_dag_flow():
    """
    Test complete DAG flow without Airflow:
    1. Check completion → Continue if not complete
    2. Load batch → incremental_loader_batch
    3. Validate batch → validate_batch_processing  
    4. Report status → report_pipeline_status
    """
    
    print("\n" + "=" * 100)
    print("DIRECT DAG LOGIC TEST - Incremental Loading Pipeline")
    print("=" * 100)
    
    try:
        with Postgres() as db:
            metadata = PipelineMetadata(db)
            repo = OperationalRepository(db)
            
            # ====================================================================
            # STEP 1: RESET for fresh test
            # ====================================================================
            print("\n[SETUP] Resetting metadata for fresh test...")
            metadata.reset(PIPELINE['pipeline_name'])
            
            # Clear operational tables for fresh start
            for table in ["order_items_out_of_stock", "order_items", "events", "orders", "users"]:
                db.execute(f"DELETE FROM {SCHEMA['operational']}.{table};")
            logger.info("✓ Operational tables cleared")
            
            # ====================================================================
            # BATCH 1: TASK 1 - Check Pipeline Completion
            # ====================================================================
            print("\n" + "-" * 100)
            print("BATCH #1: Task 1 - check_pipeline_completion")
            print("-" * 100)
            
            total_users = repo.get_total_users_in_raw()
            progress = metadata.validate_progress(PIPELINE['pipeline_name'], total_users)
            
            print(f"Status Check:")
            print(f"  Progress: {progress['offset']}/{progress['total']} users ({progress['progress_pct']:.2f}%)")
            print(f"  Batch #: {progress['batch_number']}")
            print(f"  Is Complete: {progress['is_complete']}")
            
            if progress['is_complete']:
                print("  → Pipeline already complete, would SKIP batch")
                return True
            else:
                print("  → Pipeline NOT complete, proceed to load batch")
            
            # ====================================================================
            # BATCH 1: TASK 2 - Incremental Loader Batch
            # ====================================================================
            print("\n" + "-" * 100)
            print("BATCH #1: Task 2 - incremental_loader_batch")
            print("-" * 100)
            
            # Run incremental loader manually
            loader = IncrementalLoader()
            loader.run()
            
            # ====================================================================
            # BATCH 1: TASK 3 - Validate Batch Processing
            # ====================================================================
            print("\n" + "-" * 100)
            print("BATCH #1: Task 3 - validate_batch_processing")
            print("-" * 100)
            
            db.execute(f"SELECT COUNT(*) FROM {SCHEMA['operational']}.users")
            op_users = db.fetchone()[0]
            
            db.execute(f"SELECT COUNT(*) FROM {SCHEMA['raw']}.users")
            raw_users_count = db.fetchone()[0]
            
            print(f"Validation:")
            print(f"  Users in operational: {op_users}")
            print(f"  Users in raw: {raw_users_count}")
            print(f"  Progress: {op_users}/{raw_users_count} ({op_users/raw_users_count*100:.2f}%)")
            
            assert op_users > 0, "No users loaded to operational"
            assert op_users <= raw_users_count, "Operational has more users than raw"
            print("  ✓ Validation passed")
            
            # ====================================================================
            # BATCH 1: TASK 4 - Report Pipeline Status
            # ====================================================================
            print("\n" + "-" * 100)
            print("BATCH #1: Task 4 - report_pipeline_status")
            print("-" * 100)
            
            state = metadata.get(PIPELINE['pipeline_name'])
            progress = metadata.validate_progress(PIPELINE['pipeline_name'], total_users)
            
            print(f"Pipeline Status Report:")
            print(f"  Total Users (raw): {total_users:,}")
            print(f"  Loaded Users (operational): {op_users:,}")
            print(f"  Current Offset: {progress['offset']:,}")
            print(f"  Current Batch: {progress['batch_number']}")
            print(f"  Progress: {progress['progress_pct']:.2f}%")
            print(f"  Status: {'✓ COMPLETE' if progress['is_complete'] else 'IN PROGRESS'}")
            
            # ====================================================================
            # BATCH 2+: Simulate multiple batches
            # ====================================================================
            batch_count = 1
            max_batches = 5  # Limit to 5 batches for testing
            
            while not progress['is_complete'] and batch_count < max_batches:
                batch_count += 1
                print("\n" + "=" * 100)
                print(f"BATCH #{batch_count}: Task 1-4")
                print("=" * 100)
                
                # Task 1
                progress = metadata.validate_progress(PIPELINE['pipeline_name'], total_users)
                print(f"[Task 1] Check completion: {progress['progress_pct']:.2f}%")
                
                if progress['is_complete']:
                    print(f"[Task 1] Pipeline complete - SKIP remaining tasks")
                    break
                
                # Task 2
                print(f"[Task 2] Loading batch #{batch_count}...")
                loader.run()
                
                # Task 3
                db.execute(f"SELECT COUNT(*) FROM {SCHEMA['operational']}.users")
                op_users = db.fetchone()[0]
                print(f"[Task 3] Validation: {op_users:,} users in operational")
                
                # Task 4
                progress = metadata.validate_progress(PIPELINE['pipeline_name'], total_users)
                print(f"[Task 4] Report: {progress['offset']:,}/{total_users:,} ({progress['progress_pct']:.2f}%) - Batch #{progress['batch_number']}")
            
            # ====================================================================
            # FINAL SUMMARY
            # ====================================================================
            print("\n" + "=" * 100)
            print("FINAL SUMMARY")
            print("=" * 100)
            
            progress = metadata.validate_progress(PIPELINE['pipeline_name'], total_users)
            
            print(f"\nTotal Batches Executed: {batch_count}")
            print(f"Final Progress: {progress['offset']:,}/{total_users:,} users ({progress['progress_pct']:.2f}%)")
            print(f"Status: {'✓ COMPLETE' if progress['is_complete'] else 'IN PROGRESS'}")
            
            if progress['is_complete']:
                print("\n✓ DAG FLOW COMPLETE - All users loaded successfully!")
                return True
            else:
                print(f"\n⚠ DAG Flow reached batch limit ({max_batches}) but pipeline not complete")
                print(f"  Remaining: {total_users - progress['offset']:,} users")
                print(f"  Would continue running every 5 minutes until complete")
                return True
                
    except Exception as e:
        print(f"\n✗ DAG Flow Test FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    try:
        success = test_dag_flow()
        sys.exit(0 if success else 1)
    except Exception as e:
        logger.error(f"Test execution failed: {e}", exc_info=True)
        sys.exit(2)
