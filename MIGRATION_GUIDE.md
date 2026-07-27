"""
MIGRATION GUIDE: Step-by-Step Implementation

This guide walks through implementing the new incremental loading architecture.

============================================================================
PHASE 1: CODE UPDATES (No database changes)
============================================================================

Step 1.1: Backup current code
  Commands:
    git status
    git add -A
    git commit -m "backup: before architecture redesign"

Step 1.2: Update operational_repository.py
  What changed:
    - Removed _bulk_insert_dataframe_safe() with ON CONFLICT
    - Added _bulk_insert_dataframe() without conflict handling
    - Added get_total_users_in_raw()
    - Added insert_master_data()
  
  Files affected:
    - scripts/repositories/operational_repository.py (COMPLETE REWRITE)

Step 1.3: Update metadata.py
  What changed:
    - Added validate_progress() method
    - No breaking changes to existing methods
  
  Files affected:
    - scripts/common/metadata.py (UPDATED)

Step 1.4: Replace incremental_loader.py
  What changed:
    - Complete redesign with 7-step flow
    - Better logging and progress tracking
    - Fail-fast on errors
  
  Files affected:
    - scripts/loaders/incremental_loader.py (COMPLETE REWRITE)

Step 1.5: Update setup_operational_schema.py
  What changed:
    - Added master data loading
    - Calls repository.insert_master_data()
  
  Files affected:
    - scripts/setup/setup_operational_schema.py (UPDATED)

Step 1.6: Delete load_initial_data.py
  Command:
    rm scripts/setup/load_initial_data.py
  
  Or keep it for reference but mark as deprecated.

Step 1.7: Verify code compiles
  Commands:
    python -m py_compile scripts/loaders/incremental_loader.py
    python -m py_compile scripts/repositories/operational_repository.py
    python -m py_compile scripts/common/metadata.py
    python -m py_compile scripts/setup/setup_operational_schema.py

============================================================================
PHASE 2: DOCKER UPDATES
============================================================================

Step 2.1: Update docker-compose.yml
  What changed:
    - Removed load-initial-data service
    - Added comments for setup vs incremental services
  
  Files affected:
    - docker-compose.yml (UPDATED)

Step 2.2: Rebuild Docker image
  Commands:
    docker-compose build
  
  Note: This rebuilds all services but doesn't start them yet

Step 2.3: Test that image builds successfully
  Command:
    docker-compose build --no-cache
  
  Expected: Build completes without errors

============================================================================
PHASE 3: AIRFLOW DAG UPDATES
============================================================================

Step 3.1: Create new DAGs
  Files to create:
    - airflow/dags/bootstrap_and_setup.py (NEW)
    - airflow/dags/operational_incremental_loading.py (NEW)
  
  These replace the old pipeline DAG

Step 3.2: Archive or delete old DAG
  If you have old DAGs:
    - Move to backup folder or delete
    - Airflow will auto-detect removal
    - No manual cleanup needed

Step 3.3: Verify DAG syntax
  Commands:
    airflow dags list-import-errors
    airflow dags list
  
  Expected: New DAGs appear in list with no import errors

============================================================================
PHASE 4: DATABASE RESET (DESTRUCTIVE - Do this in DEV first!)
============================================================================

⚠️  WARNING: This will DELETE all data in operational and operational_raw

Step 4.1: Backup current database (CRITICAL!)
  Command:
    docker-compose exec postgres_warehouse pg_dump \
      -U postgres_warehouse \
      Looker_ECommerce > backup_before_redesign.sql
  
  Store backup_before_redesign.sql in safe location!

Step 4.2: Drop schemas
  Commands:
    docker-compose exec postgres_warehouse psql \
      -U postgres_warehouse \
      -d Looker_ECommerce \
      -c "DROP SCHEMA IF EXISTS operational CASCADE;"
    
    docker-compose exec postgres_warehouse psql \
      -U postgres_warehouse \
      -d Looker_ECommerce \
      -c "DROP SCHEMA IF EXISTS operational_raw CASCADE;"
  
  Verify:
    docker-compose exec postgres_warehouse psql \
      -U postgres_warehouse \
      -d Looker_ECommerce \
      -c "\dn"  -- list schemas
  
  Expected: operational and operational_raw gone

Step 4.3: Verify silver/gold schemas not affected
  Command:
    docker-compose exec postgres_warehouse psql \
      -U postgres_warehouse \
      -d Looker_ECommerce \
      -c "SELECT COUNT(*) FROM gold.fact_orders;"
  
  Expected: Still has data (if gold layer exists)

============================================================================
PHASE 5: RUN ONE-TIME SETUP
============================================================================

Step 5.1: Start Postgres and Airflow
  Commands:
    docker-compose up -d postgres_warehouse
    docker-compose up -d postgres_airflow
    docker-compose up -d airflow-init
    docker-compose up -d airflow-scheduler airflow-apiserver
  
  Wait for health checks to pass:
    docker-compose ps | grep -E "postgres|airflow"

Step 5.2: Run bootstrap_and_setup DAG
  In Airflow UI:
    1. Go to http://localhost:8080
    2. Find "bootstrap_and_setup" DAG
    3. Click "Trigger DAG" button
    4. Wait for completion
    5. Check logs for success
  
  Or via CLI:
    docker-compose exec airflow-scheduler airflow dags trigger bootstrap_and_setup
  
  Monitor:
    docker-compose exec airflow-scheduler airflow dags test bootstrap_and_setup
  
  Expected:
    - bootstrap-loader creates operational_raw + loads CSV
    - setup-operational-schema creates operational + loads master data
    - Both complete without errors

Step 5.3: Verify setup completed
  Query 1: Check operational_raw has data
    docker-compose exec postgres_warehouse psql \
      -U postgres_warehouse \
      -d Looker_ECommerce \
      -c "SELECT COUNT(*) FROM operational_raw.users;"
    Expected: Large number (e.g., 1000000)
  
  Query 2: Check operational has only master data
    docker-compose exec postgres_warehouse psql \
      -U postgres_warehouse \
      -d Looker_ECommerce \
      -c "SELECT COUNT(*) FROM operational.users;"
    Expected: 0 (no users yet)
    
    docker-compose exec postgres_warehouse psql \
      -U postgres_warehouse \
      -d Looker_ECommerce \
      -c "SELECT COUNT(*) FROM operational.distribution_centers;"
    Expected: > 0 (master data loaded)
  
  Query 3: Check metadata initialized
    docker-compose exec postgres_warehouse psql \
      -U postgres_warehouse \
      -d Looker_ECommerce \
      -c "SELECT * FROM operational.pipeline_metadata;"
    Expected: One row with offset=0, batch_number=0

============================================================================
PHASE 6: ENABLE INCREMENTAL LOADING
============================================================================

Step 6.1: Unpause operational_incremental_loading DAG
  In Airflow UI:
    1. Find "operational_incremental_loading" DAG
    2. Toggle "DAG" switch to ON (unpause)
    3. Or use CLI:
       airflow dags unpause operational_incremental_loading
  
  Expected:
    - DAG starts triggering every 5 minutes
    - First run: loads batch #1 (5000 users + dependencies)

Step 6.2: Monitor first batch
  In Airflow UI:
    1. Click on operational_incremental_loading
    2. Watch task run progress
    3. Check logs in task details
  
  Expected time: 5-15 minutes for first batch
  
  Log output should show:
    - check_pipeline_completion: PASSED
    - incremental_loader_batch: PASSED
    - validate_batch_processing: PASSED
    - report_pipeline_status: PASSED with progress info

Step 6.3: Verify first batch inserted
  Queries:
    docker-compose exec postgres_warehouse psql \
      -U postgres_warehouse \
      -d Looker_ECommerce \
      -c "SELECT COUNT(*) FROM operational.users;"
    Expected: 5000 (first batch)
    
    docker-compose exec postgres_warehouse psql \
      -U postgres_warehouse \
      -d Looker_ECommerce \
      -c "SELECT * FROM operational.pipeline_metadata;"
    Expected: offset=5000, batch_number=1
    
    docker-compose exec postgres_warehouse psql \
      -U postgres_warehouse \
      -d Looker_ECommerce \
      -c "SELECT COUNT(*) FROM operational.orders;"
    Expected: some > 0 (orders for these 5000 users)

Step 6.4: Monitor until completion
  Watch DAG runs:
    - Each run processes one batch (5000 users)
    - Every 5 minutes (schedule_interval)
    - Total time = (total_users / 5000) * 5 minutes
    - Example: 1M users = 200 batches = 1000 minutes ≈ 16 hours
  
  Track progress:
    SELECT 
      last_user_offset, 
      last_batch_number, 
      100.0 * last_user_offset / (SELECT COUNT(*) FROM operational_raw.users) as pct
    FROM operational.pipeline_metadata;
  
  Last batch will show:
    - offset >= total_raw_users
    - All subsequent DAG runs will skip (AirflowSkipException)
    - check_pipeline_completion reports "Pipeline complete"

============================================================================
PHASE 7: VALIDATION & CUTOVER
============================================================================

Step 7.1: Verify data consistency
  Query: Compare operational vs operational_raw
    docker-compose exec postgres_warehouse psql \
      -U postgres_warehouse \
      -d Looker_ECommerce \
      << EOF
    SELECT 
      (SELECT COUNT(*) FROM operational_raw.users) as raw_users,
      (SELECT COUNT(*) FROM operational.users) as operational_users,
      (SELECT COUNT(*) FROM operational_raw.orders) as raw_orders,
      (SELECT COUNT(*) FROM operational.orders) as operational_orders;
    EOF
  
  Expected: raw_users = operational_users, raw_orders = operational_orders

Step 7.2: Verify FK integrity
  Queries:
    -- Orders reference valid users
    SELECT COUNT(*) FROM operational.orders o
    WHERE NOT EXISTS (SELECT 1 FROM operational.users u WHERE u.id = o.user_id);
    Expected: 0
    
    -- Order items reference valid orders
    SELECT COUNT(*) FROM operational.order_items oi
    WHERE NOT EXISTS (SELECT 1 FROM operational.orders o WHERE o.order_id = oi.order_id);
    Expected: 0
    
    -- Events reference valid users
    SELECT COUNT(*) FROM operational.events e
    WHERE NOT EXISTS (SELECT 1 FROM operational.users u WHERE u.id = e.user_id);
    Expected: 0

Step 7.3: Verify no duplicates
  Queries:
    -- Check for duplicate users
    SELECT id, COUNT(*) FROM operational.users 
    GROUP BY id HAVING COUNT(*) > 1;
    Expected: 0 rows
    
    -- Check for duplicate orders
    SELECT order_id, COUNT(*) FROM operational.orders
    GROUP BY order_id HAVING COUNT(*) > 1;
    Expected: 0 rows

Step 7.4: Pause operational_incremental_loading
  After verification, pause DAG to stop scheduler:
    In Airflow UI:
      1. Find "operational_incremental_loading" DAG
      2. Toggle "DAG" switch to OFF
  
  Or CLI:
    airflow dags pause operational_incremental_loading

Step 7.5: Keep bootstrap_and_setup paused
  The bootstrap_and_setup DAG should remain paused
  (no need to re-run, one-time only)

============================================================================
PHASE 8: POST-MIGRATION CLEANUP
============================================================================

Step 8.1: Delete backup script
  Optional: After validation is complete:
    rm scripts/setup/load_initial_data.py (if not deleted in Phase 1)

Step 8.2: Archive old DAG files
  Create archive folder:
    mkdir airflow/dags_archived/
    mv airflow/dags/old_pipeline.py airflow/dags_archived/
  
  Airflow will reload and DAG disappears from UI

Step 8.3: Update documentation
  - Add notes about new architecture
  - Document DAG schedule intervals
  - List validation queries for ops team

Step 8.4: Git commit
  Commands:
    git add -A
    git commit -m "feat: redesigned incremental loading architecture
    
    - Removed load_initial_data.py (migration utility)
    - Redesigned incremental_loader with clean batch processing
    - Added bootstrap_and_setup DAG (one-time)
    - Added operational_incremental_loading DAG (recurring)
    - Removed ON CONFLICT DO NOTHING (fail-fast design)
    - Added metadata.validate_progress() method
    - operational now built truly incrementally
    
    BREAKING: Requires database reset + re-bootstrap"

============================================================================
ROLLBACK PLAN (If needed)
============================================================================

If something goes wrong during implementation:

Step 1: Restore database from backup
  Command:
    docker-compose exec postgres_warehouse psql \
      -U postgres_warehouse \
      -d Looker_ECommerce < backup_before_redesign.sql

Step 2: Revert code changes
  Command:
    git reset --hard HEAD~1  # or specific commit

Step 3: Rebuild Docker
  Command:
    docker-compose build --no-cache

Step 4: Restart services
  Command:
    docker-compose restart

============================================================================
TIMELINE ESTIMATE
============================================================================

Phase 1 (Code): 30 minutes
Phase 2 (Docker): 10 minutes
Phase 3 (DAGs): 15 minutes
Phase 4 (Database): 5 minutes (+ backup time)
Phase 5 (Setup): 30 minutes (depends on CSV size)
Phase 6 (Incremental): 16+ hours (depends on data volume)
Phase 7 (Validation): 30 minutes
Phase 8 (Cleanup): 10 minutes

TOTAL: ~17+ hours (dominated by Phase 6 for large datasets)

For 1M users with 5000 per batch: ~200 batches = 16-17 hours @ 5 min/batch

============================================================================
SUCCESS CRITERIA
============================================================================

Migration is successful when:

✓ bootstrap_and_setup DAG runs to completion
✓ operational_raw has all CSV data
✓ operational starts empty, builds incrementally
✓ operational_incremental_loading DAG runs and processes batches
✓ Metadata offset increments by batch_size each run
✓ operational.users count grows to match operational_raw.users
✓ No duplicate keys in operational tables
✓ FK constraints satisfied for all dependencies
✓ DAG stops when offset >= total_users
✓ Logs show clean, fault-free processing

============================================================================
"""

# This is documentation only - not executable Python
