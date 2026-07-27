# Operational Incremental Loading DAG - Task Breakdown

## DAG Architecture

```
┌─────────────────────────────────────────────────────────┐
│    operational_incremental_loading DAG                  │
│    Schedule: Every 5 minutes (*/5 * * * *)              │
│    Type: Idempotent (can be triggered multiple times)   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │ Task 1: check_pipeline_completion   │ ← SKIP if complete
        │ Type: PythonOperator                │
        │ Runtime: ~2-5 seconds               │
        │ Retry: 3x on failure                │
        └─────────────────────────────────────┘
                          │
              (if not complete, continue)
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │ Task 2: incremental_loader_batch    │ ← MAIN WORK
        │ Type: BashOperator                  │
        │ Command: python -m scripts.loaders..│
        │ Runtime: ~10-30 seconds (depends)   │
        │ Retry: 3x on failure                │
        └─────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │ Task 3: validate_batch_processing   │ ← QA CHECK
        │ Type: PythonOperator                │
        │ Runtime: ~2-5 seconds               │
        │ Trigger Rule: NONE_FAILED_MIN_ONE   │
        │ Retry: 3x on failure                │
        └─────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │ Task 4: report_pipeline_status      │ ← LOG PROGRESS
        │ Type: PythonOperator                │
        │ Runtime: ~2-5 seconds               │
        │ Trigger Rule: NONE_FAILED_MIN_ONE   │
        │ Retry: 3x on failure                │
        └─────────────────────────────────────┘
                          │
                          ▼
                    DAG Run Complete
```

## Task Details

### Task 1: `check_pipeline_completion`
**Purpose:** Check if pipeline already finished loading all users

**Inputs:**
- `pipeline_metadata` table
- `operational_raw.users` count

**Process:**
```
1. Query metadata: SELECT * FROM pipeline_metadata WHERE pipeline_name = 'operational_incremental_loading'
2. Get current offset from metadata (e.g., 5000)
3. Get total users in raw: SELECT COUNT(*) FROM operational_raw.users (e.g., 500000)
4. Calculate progress:
   - Progress % = (offset / total) * 100
   - Is Complete = (offset >= total)
5. If complete:
   - Print: "Pipeline already complete. Skipping incremental load."
   - Raise: AirflowSkipException → Skip downstream tasks
6. Else:
   - Print progress and batch number
   - Continue to Task 2
```

**Output:**
- Logs progress percentage
- Returns progress dict or raises AirflowSkipException

**Failure Cases:**
- PostgreSQL connection error
- Metadata table doesn't exist (first run might fail here)
- Query syntax error

**Status Codes:**
- ✅ SUCCESS: Metadata found, pipeline not complete → continue
- ⏭️  SKIPPED: Metadata found, pipeline complete → skip downstream
- ❌ FAILED: Connection error, query error → retry 3x

---

### Task 2: `incremental_loader_batch`
**Purpose:** Load one batch of users + dependencies from raw → operational

**Inputs:**
- Last offset from metadata
- Batch size (default 5000)

**Process:**
```
1. Initialize metadata (first run only)
2. Get last_offset and last_batch_number from metadata
3. Query users:
   SELECT * FROM operational_raw.users LIMIT 5000 OFFSET <last_offset>
4. If users empty:
   - Print "No more users"
   - Return early (pipeline will be marked complete next run)
5. Load dependencies:
   a) Orders:
      SELECT * FROM operational_raw.orders WHERE user_id IN (user_ids)
   b) Order Items:
      SELECT * FROM operational_raw.order_items WHERE order_id IN (order_ids)
   c) Events:
      SELECT * FROM operational_raw.events WHERE user_id IN (user_ids)
   d) Inventory:
      SELECT * FROM operational_raw.inventory_items 
      WHERE created_at <= max(batch users' created_at)
6. Insert in FK dependency order:
   a) INSERT INTO operational.users
   b) INSERT INTO operational.orders
   c) INSERT INTO operational.order_items
   d) INSERT INTO operational.events
   e) INSERT INTO operational.inventory_items
   f) UPDATE operational.inventory_items SET sold_at = ... (based on order_items)
7. Update metadata:
   - last_user_offset = offset + loaded_user_count
   - batch_number += 1
   - batch_min_created_at, batch_max_created_at
8. Print summary:
   - Batch size
   - Progress %
   - Remaining users
```

**Output:**
- Inserted rows to operational schema
- Updated metadata
- Detailed logs of batch processing

**Data Loaded per Batch (example):**
```
Batch 1: Users 0-4999
├── Users: 5,000 rows
├── Orders: ~25,000 rows (avg 5 orders per user)
├── Order Items: ~75,000 rows (avg 3 items per order)
├── Events: ~50,000 rows (avg 10 events per user)
└── Inventory: ~50,000 rows (up to batch max created_at)
Total: ~205,000 rows per batch
```

**Failure Cases:**
- Connection error
- FK constraint violation (missing user or order)
- Inventory timing issue (order_items reference non-existent inventory)
- Metadata update fails

**Status Codes:**
- ✅ SUCCESS: Batch loaded and inserted
- ❌ FAILED: FK violation, connection error → retry 3x

---

### Task 3: `validate_batch_processing`
**Purpose:** QA Check - Verify batch was processed correctly

**Inputs:**
- Counts from operational schema
- Counts from raw schema

**Process:**
```
1. Query operational.users count: SELECT COUNT(*) FROM operational.users
2. Query operational_raw.users count: SELECT COUNT(*) FROM operational_raw.users
3. Assertions:
   - Assert operational_users > 0: "No users loaded to operational"
   - Assert operational_users <= raw_users: "Operational has more than raw"
4. Print:
   - Users in operational_raw: X
   - Users in operational: Y
   - Progress: Y/X
5. If assertions pass: Task SUCCESS
6. If assertions fail: Task FAILED → retry 3x
```

**Output:**
- Validation status logs
- Counts comparison

**Trigger Rule:** `NONE_FAILED_MIN_ONE_SUCCESS`
- Means: Run even if Task 2 is skipped
- Why: If Task 2 skipped, we still want to know current state

**Failure Cases:**
- operational_users == 0 (Task 2 didn't insert)
- operational_users > raw_users (data corruption)
- Connection error

---

### Task 4: `report_pipeline_status`
**Purpose:** Print final progress report and pipeline status

**Inputs:**
- Metadata
- Row counts from operational schema

**Process:**
```
1. Get metadata state
2. Get total_users from raw
3. Get operational counts:
   - users
   - orders
   - order_items
   - events
   - inventory_items
4. Calculate progress:
   - Total: X users in raw
   - Loaded: Y users in operational
   - Progress: Y/X (%)
   - Batch: N
   - Status: Complete or In Progress
5. Print report:
   ================================
   Pipeline Status Report
   
   Total Users (raw): 500,000
   Loaded Users (operational): 10,000
   Current Offset: 10,000
   Current Batch: 2
   Progress: 2.00%
   Status: IN PROGRESS
   ================================
```

**Output:**
- Human-readable status report
- Useful for monitoring

**Trigger Rule:** `NONE_FAILED_MIN_ONE_SUCCESS`
- Run even if earlier task skipped
- For visibility into current state

---

## Task Execution Flow

### Scenario 1: First Run (offset = 0)
```
Task 1: check_pipeline_completion
├── offset = 0 (no metadata yet, initialize)
├── total = 500,000
├── is_complete = False
└── → Continue to Task 2 ✓

Task 2: incremental_loader_batch
├── Load users 0-4999 (5000 rows)
├── Load dependencies (25k orders, 75k items, 50k events, 50k inventory)
├── Insert all to operational
├── Update metadata: offset=5000, batch=1
└── → SUCCESS ✓

Task 3: validate_batch_processing
├── operational.users = 5,000
├── operational_raw.users = 500,000
├── Assert: 5000 > 0 ✓
├── Assert: 5000 <= 500000 ✓
└── → SUCCESS ✓

Task 4: report_pipeline_status
├── Offset: 5000
├── Batch: 1
├── Progress: 1%
├── Status: IN PROGRESS
└── → SUCCESS ✓

RESULT: DAG Run Successful ✅
  Loaded: 5000 users
  Progress: 1% complete
```

### Scenario 2: Second Run (offset = 5000)
```
Task 1: check_pipeline_completion
├── offset = 5000 (from metadata)
├── total = 500,000
├── is_complete = False
└── → Continue to Task 2 ✓

Task 2: incremental_loader_batch
├── Load users 5000-9999 (5000 rows)
├── Load dependencies
├── Insert to operational (NO DUPLICATES - offset-based)
├── Update metadata: offset=10000, batch=2
└── → SUCCESS ✓

Task 3: validate_batch_processing
├── operational.users = 10,000 (5000 + 5000)
├── Assert: 10000 > 0 ✓
├── Assert: 10000 <= 500000 ✓
└── → SUCCESS ✓

Task 4: report_pipeline_status
├── Offset: 10000
├── Batch: 2
├── Progress: 2%
├── Status: IN PROGRESS
└── → SUCCESS ✓

RESULT: DAG Run Successful ✅
  Cumulative loaded: 10,000 users
  Progress: 2% complete
```

### Scenario 3: Last Run (offset = 495000, total = 500000)
```
Task 1: check_pipeline_completion
├── offset = 495000 (from metadata)
├── total = 500,000
├── is_complete = False (495k < 500k)
└── → Continue to Task 2 ✓

Task 2: incremental_loader_batch
├── Load users 495000-499999 (5000 rows available)
├── Load dependencies
├── Insert to operational
├── Update metadata: offset=500000, batch=N
└── → SUCCESS ✓

Task 3: validate_batch_processing
├── operational.users = 500,000
├── Assert: 500000 > 0 ✓
├── Assert: 500000 <= 500000 ✓
└── → SUCCESS ✓

Task 4: report_pipeline_status
├── Offset: 500000
├── Batch: N
├── Progress: 100%
├── Status: ✓ COMPLETE
└── → SUCCESS ✓

RESULT: DAG Run Successful ✅
  Pipeline Complete!
```

### Scenario 4: Next Run After Complete (offset = 500000, total = 500000)
```
Task 1: check_pipeline_completion
├── offset = 500000 (from metadata)
├── total = 500,000
├── is_complete = True (500k >= 500k)
├── Raise AirflowSkipException("Pipeline complete")
└── → SKIPPED ⏭️ (downstream tasks also skip)

Task 2: incremental_loader_batch
└── → SKIPPED (upstream was skipped) ⏭️

Task 3: validate_batch_processing
└── → SKIPPED (upstream was skipped) ⏭️

Task 4: report_pipeline_status
└── → SKIPPED (upstream was skipped) ⏭️

RESULT: DAG Run Successful (with skipped tasks) ⏭️
  No work done - pipeline already complete
  Next trigger: Need manual configuration change or reset
```

---

## Task Execution: SEQUENTIAL vs PARALLEL

**Current Design:** ▶️ **SEQUENTIAL** (One after another)

```
┌─────────────────────────────────────────────────────┐
│ Current Flow (Series):                              │
│                                                     │
│  Check → Load → Validate → Report                   │
│  └──────────────────────────────────────┘           │
│  Total time per run: ~30-50 seconds                 │
└─────────────────────────────────────────────────────┘
```

**Why Sequential?**
1. Task 1 must complete before Task 2 (gate check)
2. Task 2 must complete before Task 3 (need data to validate)
3. Task 3 must complete before Task 4 (need validation results)
4. Data dependency: Each task uses output of previous

**Could They Be Parallel?**
❌ **NO** - They have hard dependencies:
- Task 1 → Task 2: Check must know offset before loading
- Task 2 → Task 3: Load must insert data before validating
- Task 3 → Task 4: Validate must confirm before reporting

**However, could modularize differently:**
If you wanted parallelism, you'd need separate DAGs:
```
DAG 1: incremental_load (Task 2 only)
DAG 2: validate_and_report (Task 3 + 4 parallel, trigger after DAG 1)

Or:
DAG 1: Check + Load (sequential)
DAG 2: Validate + Report (parallel) ← Trigger after DAG 1
```

**Realistic Timeline per Run:**
```
Task 1 (Check):    ~2-5 sec     ████
Task 2 (Load):     ~15-30 sec   ██████████████████
Task 3 (Validate): ~2-5 sec     ████
Task 4 (Report):   ~2-5 sec     ████
                   ─────────────────
Total per run:     ~21-45 sec (sequential)
If parallel:       ~15-30 sec (Task 2 is bottleneck)
```

---

## Debugging: Why "Up for Retry"?

**"Up for Retry" means:**
- Task failed
- Airflow will retry (still has retries left)
- Task is queued again after retry_delay

**Common reasons check_pipeline_completion fails:**
1. ❌ PostgreSQL connection error
   - Solution: Check postgres_airflow container is running
   
2. ❌ Import error (scripts module not found)
   - Solution: Check sys.path.insert in DAG
   
3. ❌ Metadata table doesn't exist (first run)
   - Solution: Ensure setup-operational-schema ran successfully
   
4. ❌ Config import error
   - Solution: Check PIPELINE config exists

**To Debug:**
1. Open Airflow UI → operational_incremental_loading DAG
2. Find failed task instance
3. Click on task
4. Click "Logs" tab
5. Read error message from bottom of logs
6. Fix issue
7. Click "Clear" or "Mark Failed as Success" (careful!)
8. Re-trigger DAG

---

## Future: Silver Layer & Analytics

```
operational (incremental)
        ↓ (batch_id based)
silver (transformed)
        ├─→ analytics (BI tools)
        └─→ ml_features (ML DAG - every 30 min)

DAG: operational_incremental_loading (every 5 min)
DAG: silver_transformation (triggered after operational)
DAG: analytics_aggregation (triggered after silver)
DAG: ml_training (triggered after silver, schedule every 30 min)
```

**Current Scope:** Just get operational incremental loading working first ✓
