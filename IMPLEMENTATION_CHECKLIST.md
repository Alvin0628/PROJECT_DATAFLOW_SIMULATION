"""
IMPLEMENTATION CHECKLIST
Complete Architecture Redesign - Incremental Loading v2.0

Use this checklist to track progress through all 8 phases.

============================================================================
PRE-IMPLEMENTATION CHECKLIST
============================================================================

Before you start:
  ☐ Read QUICK_REFERENCE.md
  ☐ Read IMPLEMENTATION_SUMMARY.md
  ☐ Understand the problem and solution
  ☐ Identified database backup location
  ☐ Scheduled maintenance window
  ☐ Notified stakeholders
  ☐ Tested in DEV environment first
  ☐ Confirmed rollback procedure understood

============================================================================
PHASE 1: CODE UPDATES (30 minutes)
============================================================================

Git & Backup:
  ☐ git status (check clean working directory)
  ☐ git add -A && git commit -m "backup: before architecture redesign"

File Updates:
  ☐ Replace scripts/repositories/operational_repository.py
    - Verify: _bulk_insert_dataframe() exists (not _bulk_insert_dataframe_safe)
    - Verify: get_total_users_in_raw() exists
    - Verify: insert_master_data() exists
    - Verify: No ON CONFLICT DO NOTHING in user/order/event inserts

  ☐ Update scripts/common/metadata.py
    - Verify: validate_progress() method added
    - Verify: Existing methods unchanged

  ☐ Replace scripts/loaders/incremental_loader.py
    - Verify: 7-step flow implemented
    - Verify: Better logging added
    - Verify: Fail-fast design (no ON CONFLICT)

  ☐ Update scripts/setup/setup_operational_schema.py
    - Verify: repository.insert_master_data() called
    - Verify: Logging added

  ☐ Delete scripts/setup/load_initial_data.py
    - Verify: File removed (or renamed to _deprecated)

Verification:
  ☐ python -m py_compile scripts/loaders/incremental_loader.py
  ☐ python -m py_compile scripts/repositories/operational_repository.py
  ☐ python -m py_compile scripts/common/metadata.py
  ☐ python -m py_compile scripts/setup/setup_operational_schema.py
  ☐ All compile without errors

Git Commit:
  ☐ git add -A
  ☐ git commit -m "phase1: code updates for architecture redesign"

============================================================================
PHASE 2: DOCKER UPDATES (10 minutes)
============================================================================

Docker Compose:
  ☐ Update docker-compose.yml
    - Verify: load-initial-data service removed
    - Verify: bootstrap-loader service unchanged
    - Verify: setup-operational-schema service unchanged
    - Verify: incremental-loader service unchanged

Build Docker:
  ☐ docker-compose build
  ☐ docker-compose build --no-cache
  ☐ Verify: Build completes successfully

Git Commit:
  ☐ git add docker-compose.yml
  ☐ git commit -m "phase2: docker updates (removed load-initial-data)"

============================================================================
PHASE 3: AIRFLOW DAG UPDATES (15 minutes)
============================================================================

Create New DAGs:
  ☐ Create airflow/dags/bootstrap_and_setup.py
    - Verify: bootstrap-loader task defined
    - Verify: setup-operational-schema task defined
    - Verify: Dependencies correct
    - Verify: schedule_interval="@once"

  ☐ Create airflow/dags/operational_incremental_loading.py
    - Verify: check_pipeline_completion task defined
    - Verify: incremental_loader_batch task defined
    - Verify: validate_batch_processing task defined
    - Verify: report_pipeline_status task defined
    - Verify: Dependencies correct
    - Verify: schedule_interval="*/5 * * * *"

Archive Old DAGs:
  ☐ Find old pipeline DAG (if exists)
  ☐ Move to airflow/dags_archived/ folder
  ☐ Or delete if not needed

Verify DAGs:
  ☐ airflow dags list-import-errors (no errors)
  ☐ airflow dags list (both new DAGs appear)
  ☐ bootstrap_and_setup visible
  ☐ operational_incremental_loading visible

Git Commit:
  ☐ git add airflow/dags/
  ☐ git commit -m "phase3: new airflow DAGs"

============================================================================
PHASE 4: DATABASE RESET (DESTRUCTIVE!) (5 minutes)
============================================================================

⚠️  WARNING: This deletes all data in operational and operational_raw

Backup (CRITICAL!):
  ☐ docker-compose exec postgres_warehouse pg_dump \
      -U postgres_warehouse Looker_ECommerce > backup_YYYYMMDD.sql
  ☐ Verify: backup file created and not empty
  ☐ Copy backup to safe location
  ☐ Test restore (optional but recommended):
      psql -U postgres_warehouse Looker_ECommerce < backup_YYYYMMDD.sql

Drop Schemas:
  ☐ Drop operational_raw:
      docker-compose exec postgres_warehouse psql \
        -U postgres_warehouse -d Looker_ECommerce \
        -c "DROP SCHEMA IF EXISTS operational_raw CASCADE;"

  ☐ Drop operational:
      docker-compose exec postgres_warehouse psql \
        -U postgres_warehouse -d Looker_ECommerce \
        -c "DROP SCHEMA IF EXISTS operational CASCADE;"

Verify:
  ☐ Both schemas gone:
      docker-compose exec postgres_warehouse psql \
        -U postgres_warehouse -d Looker_ECommerce \
        -c "\dn"  -- should not show operational or operational_raw

  ☐ Verify other schemas (silver, gold, etc.) still exist:
      docker-compose exec postgres_warehouse psql \
        -U postgres_warehouse -d Looker_ECommerce \
        -c "SELECT COUNT(*) FROM gold.fact_orders;" (if gold exists)

Notes:
  ☐ Store backup location info
  ☐ Document backup timestamp
  ☐ Have rollback procedure ready

============================================================================
PHASE 5: RUN ONE-TIME SETUP (30 minutes)
============================================================================

Start Services:
  ☐ docker-compose up -d postgres_warehouse
  ☐ docker-compose up -d postgres_airflow
  ☐ docker-compose up -d airflow-init
  ☐ Wait for init to complete:
      docker-compose exec airflow-init echo "ready" || sleep 10

  ☐ docker-compose up -d airflow-scheduler airflow-apiserver
  ☐ docker-compose ps | grep -E "postgres|airflow"
  ☐ All containers running

Trigger Setup DAG:
  ☐ Open Airflow UI: http://localhost:8080
  ☐ Find DAG: bootstrap_and_setup
  ☐ Click "Trigger DAG"
  ☐ Wait for DAG to complete
  ☐ Check logs for success messages

Monitor Bootstrap:
  ☐ bootstrap-loader task: Started → Completed
    - Expected time: 5-30 min (depends on CSV size)
    - Expected log: "BOOTSTRAP LOADER FINISHED"

  ☐ setup-operational-schema task: Started → Completed
    - Expected time: 1-2 min
    - Expected log: "OPERATIONAL SCHEMA SETUP COMPLETED"

Verify Setup Completed:
  ☐ Query 1: operational_raw populated
      docker-compose exec postgres_warehouse psql \
        -U postgres_warehouse -d Looker_ECommerce \
        -c "SELECT COUNT(*) FROM operational_raw.users;"
      Expected: Large number (e.g., 1000000)

  ☐ Query 2: operational empty (except master data)
      docker-compose exec postgres_warehouse psql \
        -U postgres_warehouse -d Looker_ECommerce \
        -c "SELECT COUNT(*) FROM operational.users;"
      Expected: 0

  ☐ Query 3: Master data loaded
      docker-compose exec postgres_warehouse psql \
        -U postgres_warehouse -d Looker_ECommerce \
        -c "SELECT COUNT(*) FROM operational.distribution_centers;"
      Expected: > 0

  ☐ Query 4: Metadata initialized
      docker-compose exec postgres_warehouse psql \
        -U postgres_warehouse -d Looker_ECommerce \
        -c "SELECT * FROM operational.pipeline_metadata;"
      Expected: offset=0, batch_number=0

Notes:
  ☐ Bootstrap time varies by dataset size
  ☐ Don't proceed until both tasks complete
  ☐ If failed, check logs for error details

============================================================================
PHASE 6: ENABLE INCREMENTAL LOADING (16+ hours)
============================================================================

Enable DAG:
  ☐ Open Airflow UI: http://localhost:8080
  ☐ Find DAG: operational_incremental_loading
  ☐ Toggle DAG to ON (unpause)
  ☐ Or via CLI:
      docker-compose exec airflow-scheduler \
        airflow dags unpause operational_incremental_loading

Monitor First Batch:
  ☐ Wait 5 minutes for first DAG run
  ☐ Check Airflow UI for DAG run started
  ☐ Tasks should execute:
    - check_pipeline_completion: ✓ PASSED
    - incremental_loader_batch: ✓ PASSED (takes 5-30 sec)
    - validate_batch_processing: ✓ PASSED
    - report_pipeline_status: ✓ PASSED

  ☐ First batch completed within expected time
  ☐ No errors in logs

Verify First Batch Inserted:
  ☐ Query 1: Users loaded
      docker-compose exec postgres_warehouse psql \
        -U postgres_warehouse -d Looker_ECommerce \
        -c "SELECT COUNT(*) FROM operational.users;"
      Expected: 5000 (first batch size)

  ☐ Query 2: Metadata updated
      docker-compose exec postgres_warehouse psql \
        -U postgres_warehouse -d Looker_ECommerce \
        -c "SELECT * FROM operational.pipeline_metadata;"
      Expected: offset=5000, batch_number=1

  ☐ Query 3: Orders loaded
      docker-compose exec postgres_warehouse psql \
        -U postgres_warehouse -d Looker_ECommerce \
        -c "SELECT COUNT(*) FROM operational.orders;"
      Expected: some > 0

Monitor Progress:
  ☐ DAG runs every 5 minutes (check Airflow UI)
  ☐ Each run loads 5000 more users (roughly)
  ☐ Metadata offset increments by ~5000 per run
  ☐ No failed tasks in DAG runs

Track Timeline:
  ☐ Calculate total batches needed:
      Total users / 5000 = X batches
      Example: 1M / 5000 = 200 batches

  ☐ Calculate total time:
      X batches * 5 minutes = Y minutes
      Example: 200 * 5 = 1000 min = 16-17 hours

  ☐ Estimated completion time:
      Current time + Y minutes

  ☐ Monitor progress periodically:
      SELECT last_user_offset FROM operational.pipeline_metadata;
      Calculate: 100 * offset / total_users_raw = % complete

Wait for Completion:
  ☐ DAG continues running every 5 minutes
  ☐ Progress visible in operational.users count
  ☐ When offset >= total_raw_users: COMPLETE
  ☐ Last DAG run will have all tasks pass
  ☐ Final logs show "Pipeline complete"

Time Estimate:
  ☐ 1M users @ 5k/batch: 200 batches = ~1000 min = 16-17 hours
  ☐ 100k users @ 5k/batch: 20 batches = ~100 min = 1.5-2 hours
  ☐ Actual time depends on:
    - Batch processing time
    - DAG schedule interval
    - System load
    - Data size

============================================================================
PHASE 7: VALIDATION (30 minutes)
============================================================================

Run Automated Tests:
  ☐ python -m scripts.tests.validation_tests
  ☐ All 14 tests should PASS
  ☐ Output shows:
    - PHASE 1: Setup Validation (4 tests)
    - PHASE 2: Incremental Validation (9 tests)
    - PHASE 3: Completion Validation (1 test)
  ☐ Final line: "Results: 14 passed, 0 failed"

Manual Validation Queries:

  Data Consistency:
  ☐ SELECT COUNT(*) FROM operational_raw.users;
    → Note the total count (e.g., 1000000)

  ☐ SELECT COUNT(*) FROM operational.users;
    → Should eventually equal operational_raw count

  ☐ SELECT COUNT(*) FROM operational.orders;
    → Should have orders for operational users

  FK Integrity:
  ☐ SELECT COUNT(*) FROM operational.orders o
     WHERE NOT EXISTS (SELECT 1 FROM operational.users u WHERE u.id = o.user_id);
    → Should return 0 (all orders have valid users)

  ☐ SELECT COUNT(*) FROM operational.order_items oi
     WHERE NOT EXISTS (SELECT 1 FROM operational.orders o WHERE o.order_id = oi.order_id);
    → Should return 0 (all order_items have valid orders)

  ☐ SELECT COUNT(*) FROM operational.events e
     WHERE NOT EXISTS (SELECT 1 FROM operational.users u WHERE u.id = e.user_id);
    → Should return 0 (all events have valid users)

  No Duplicates:
  ☐ SELECT COUNT(*) FROM (
      SELECT id FROM operational.users GROUP BY id HAVING COUNT(*) > 1
    ) t;
    → Should return 0

  ☐ SELECT COUNT(*) FROM (
      SELECT order_id FROM operational.orders GROUP BY order_id HAVING COUNT(*) > 1
    ) t;
    → Should return 0

Verify Completion:
  ☐ SELECT 
      (SELECT COUNT(*) FROM operational_raw.users) as raw,
      (SELECT COUNT(*) FROM operational.users) as operational;
    → raw should equal operational

  ☐ SELECT * FROM operational.pipeline_metadata;
    → last_user_offset should equal total_raw_users

  ☐ DAG last run:
    - All tasks PASSED
    - Status shows "Pipeline complete"

Pause DAG:
  ☐ Open Airflow UI
  ☐ Find operational_incremental_loading DAG
  ☐ Toggle DAG to OFF (pause)
  ☐ Or via CLI:
      docker-compose exec airflow-scheduler \
        airflow dags pause operational_incremental_loading

Notes:
  ☐ All automated tests must pass
  ☐ All manual validation queries must return expected results
  ☐ No errors in DAG logs
  ☐ FK constraints verified
  ☐ No duplicates found

============================================================================
PHASE 8: CLEANUP (10 minutes)
============================================================================

Archive/Delete Files:
  ☐ If scripts/setup/load_initial_data.py still exists:
    - Move to scripts/setup/_deprecated/load_initial_data.py.bak
    - Or delete completely

  ☐ If old DAG files exist:
    - Move to airflow/dags_archived/
    - Or delete

Documentation:
  ☐ Update team documentation with new architecture
  ☐ Add notes about:
    - Two-DAG approach (setup + recurring)
    - New Airflow URLs
    - New validation procedures
  ☐ Share QUICK_REFERENCE.md with ops team
  ☐ Share MIGRATION_GUIDE.md for reference

Final Git Commit:
  ☐ git add -A
  ☐ git commit -m "phase8: cleanup and documentation"

Deployment:
  ☐ All changes committed
  ☐ Code reviewed
  ☐ Ready for production merge

Notification:
  ☐ Notify stakeholders: Migration complete
  ☐ Share success metrics
  ☐ Update status tracking

Cleanup Tasks:
  ☐ Delete backup (if not needed in long term)
  ☐ Archive migration notes/logs
  ☐ Close related tickets/issues

============================================================================
POST-IMPLEMENTATION CHECKLIST
============================================================================

Success Verification:
  ☐ All 14 automated tests pass
  ☐ All FK constraints satisfied
  ☐ No duplicate keys
  ☐ Data counts match (operational == operational_raw)
  ☐ Metadata accurately tracks progress
  ☐ DAG stopped automatically when complete
  ☐ No errors in all DAG logs

Operations Ready:
  ☐ Ops team trained on new architecture
  ☐ Validation procedures documented
  ☐ Monitoring dashboards updated
  ☐ Alerting configured
  ☐ Backup procedure verified

Production Monitoring:
  ☐ DAG metrics tracked
  ☐ Database performance normal
  ☐ No data quality issues
  ☐ Stakeholders informed
  ☐ Team confident in changes

============================================================================
ISSUES & RESOLUTION
============================================================================

If DAG fails at any point:

Check logs:
  ☐ docker-compose logs airflow-scheduler
  ☐ Airflow UI → DAG → Task Logs
  ☐ Database logs (if applicable)

Common issues:

Issue: "Duplicate key violates constraint"
  ☐ Check that offset never goes backwards
  ☐ Verify metadata.reset() not called mid-run
  ☐ Use backup + rollback if needed

Issue: "Foreign key violation"
  ☐ Verify insert order (users → orders → order_items)
  ☐ Check that batch loaded completely
  ☐ Review incremental_loader logs

Issue: "Pipeline stuck (not progressing)"
  ☐ Verify operational_raw has data
  ☐ Check DAG is running (not paused)
  ☐ Run bootstrap_and_setup again if needed

If failures persist:
  ☐ Consult ARCHITECTURE_REDESIGN.md (Troubleshooting)
  ☐ Check QUICK_REFERENCE.md (Common Issues)
  ☐ Review MIGRATION_GUIDE.md (Rollback Plan)

============================================================================
SIGN-OFF
============================================================================

Implementation Completed: ☐ Date: ________
Successfully Validated: ☐ Date: ________
Deployed to Production: ☐ Date: ________
Operations Verified: ☐ Date: ________

Signed Off By:
  ☐ Project Lead: __________________ Date: ________
  ☐ Technical Lead: ________________ Date: ________
  ☐ DevOps Lead: ___________________ Date: ________

============================================================================
"""

# This is a checklist document - not executable Python
