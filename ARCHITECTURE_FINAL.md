FINAL ARCHITECTURE - INCREMENTAL LOADING v2.0
================================================

FIXED: Bootstrap is NOW manual (not DAG), only incremental loading uses DAG.

============================================================================
ARCHITECTURE FINAL
============================================================================

PHASE 1: BOOTSTRAP (One-time manual, NOT a DAG)
  
  Step 1: Load operational_raw (CSV → raw schema)
    Command: docker-compose up bootstrap-loader
    Time: 5-30 minutes (depends on dataset)
    Result: operational_raw schema with all CSV data (immutable)
  
  Step 2: Setup operational schema + master data
    Command: docker-compose up setup-operational-schema
    Time: 1-2 minutes
    Result: operational schema (empty) + master tables loaded

PHASE 2: INCREMENTAL LOADING (Airflow DAG, recurring)
  
  DAG: operational_incremental_loading
  Schedule: Every 5 minutes
  One run = one batch of users (~5000)
  
  Flow per DAG run:
    1. check_pipeline_completion
       → Skip if already complete
       → Continue if more users to load
    
    2. incremental_loader_batch
       → Load next batch from operational_raw
       → Load dependencies (orders, events, inventory, etc.)
       → Insert to operational
       → Update metadata offset
    
    3. validate_batch_processing
       → Verify batch inserted correctly
       → Check FK constraints
    
    4. report_pipeline_status
       → Print progress (offset / total)
       → Print percentage complete

============================================================================
FILES MODIFIED (7 files)
============================================================================

✓ scripts/repositories/operational_repository.py
  - Redesigned with direct inserts (fail-fast)
  - Removed ON CONFLICT DO NOTHING
  - Added get_total_users_in_raw()
  - Added insert_master_data()

✓ scripts/common/metadata.py
  - Added validate_progress() method

✓ scripts/loaders/incremental_loader.py
  - Redesigned with 7-step flow
  - Better logging and progress tracking

✓ scripts/setup/setup_operational_schema.py
  - Added master data loading

✓ docker-compose.yml
  - Removed load-initial-data service
  - Added comments for bootstrap vs incremental services

✓ airflow/dags/operational_incremental_loading.py
  - NEW: Only 1 DAG (recurring incremental loading)

✓ airflow/dags/bootstrap_and_setup.py
  - DEPRECATED (bootstrap is manual, not DAG)

FILES DELETED:
  ✗ scripts/setup/load_initial_data.py (no longer needed)

============================================================================
COMPLETE FLOW
============================================================================

1. Start project:
   docker-compose up -d postgres_warehouse airflow-init airflow-scheduler airflow-apiserver

2. Run bootstrap (ONCE, manually):
   docker-compose up bootstrap-loader
   (wait for completion)
   
   docker-compose up setup-operational-schema
   (wait for completion)

3. Verify setup:
   SELECT COUNT(*) FROM operational_raw.users;        -- should be large
   SELECT COUNT(*) FROM operational.users;             -- should be 0
   SELECT * FROM operational.pipeline_metadata;        -- offset=0

4. Enable incremental loading (in Airflow UI or CLI):
   airflow dags unpause operational_incremental_loading

5. Watch DAG run:
   - Runs every 5 minutes
   - Each run loads ~5000 users
   - Progress tracked in metadata
   - Auto-stops when complete

============================================================================
VALIDATION
============================================================================

14 automated tests:
  python -m scripts.tests.validation_tests

Manual queries:
  - Data consistency check
  - FK integrity check
  - No duplicates check
  - Progress tracking

============================================================================
KEY IMPROVEMENTS
============================================================================

✓ No duplicates (operational starts empty)
✓ Metadata meaningful (real progress tracking)
✓ Fail-fast design (errors visible)
✓ FK integrity maintained (dependencies per batch)
✓ Bootstrap = manual (simpler, no DAG overhead)
✓ Incremental = DAG (automated, recurring)

============================================================================
TIME ESTIMATE
============================================================================

Manual setup: 30-40 minutes (bootstrap)
Incremental load: ~16-17 hours for 1M users @ 5k/batch
Total: ~17+ hours

============================================================================
READY TO IMPLEMENT
============================================================================

All files are production-ready. Start with:
  1. BOOTSTRAP_MANUAL_SETUP.md (step-by-step manual bootstrap)
  2. docker-compose commands
  3. Airflow UI to unpause DAG
  4. Monitor via Airflow + validation queries

============================================================================
