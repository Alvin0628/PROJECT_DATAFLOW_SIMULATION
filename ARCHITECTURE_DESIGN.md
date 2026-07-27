# Operational Data Pipeline Architecture

## Design Overview

```
CSV Files (Bootstrap)
    ↓
operational_raw (Immutable Raw Layer)
    ├── users (Master)
    ├── distribution_centers (Master)
    ├── products (Master)
    └── orders, order_items, events, inventory_items (Transactional)
    ↓
[INCREMENTAL LOADING - Batch by Batch]
    ↓
operational (Incremental Simulation Layer)
    ├── users (Built incrementally)
    ├── orders (Dependent on users)
    ├── order_items (Dependent on orders)
    ├── events (Dependent on users)
    ├── inventory_items (Updated incrementally)
    └── distribution_centers, products (Master - copied once)
    ↓
[METADATA TRACKING]
    ↓
pipeline_metadata (Progress Tracking)
    └── Tracks: offset, batch_number, created_at ranges
```

## Data Flow

### Phase 1: Bootstrap (One-time)
```
CSV → bootstrap-loader → operational_raw
  1. 7 tables loaded from CSV
  2. Master data: distribution_centers, products (10 + 29,120 rows)
  3. Transactional data: users, orders, order_items, events, inventory_items
```

### Phase 2: Setup Operational Schema (One-time)
```
operational_raw → setup-operational-schema → operational
  1. Create operational schema (empty)
  2. Load master data:
     - distribution_centers (10 rows)
     - products (29,120 rows)
  3. Other tables empty, will be filled incrementally
```

### Phase 3: Incremental Loading (Repeating - every 5 minutes)
```
Each DAG Run = ONE BATCH:

Step 1: Check Completion
  - Get current offset from metadata
  - If offset >= total_users → SKIP (pipeline complete)
  - Else → proceed to Step 2

Step 2: Load User Batch (Dependency #1)
  - Query: SELECT * FROM operational_raw.users LIMIT batch_size OFFSET last_offset
  - Default batch_size: 5000 users per run
  - Example: Run 1 loads users 0-4999, Run 2 loads users 5000-9999, etc.

Step 3: Load Dependencies (Dependent on users in this batch)
  - Orders: WHERE user_id IN (user_ids from Step 2)
  - Order Items: WHERE order_id IN (order_ids from Step 2)
  - Events: WHERE user_id IN (user_ids from Step 2)
  - Inventory: WHERE created_at <= max(batch users' created_at)
    * This ensures FK integrity: order_items → inventory_items

Step 4: Insert to operational (in FK dependency order)
  1. Insert users
  2. Insert orders (depends on users)
  3. Insert order_items (depends on orders + inventory)
  4. Insert events (depends on users)
  5. Insert inventory (inserted, then updated with sold_at)

Step 5: Update Metadata
  - last_user_offset += batch_size
  - batch_number += 1
  - batch_min_created_at = min(batch users' created_at)
  - batch_max_created_at = max(batch users' created_at)

Step 6: Report Status
  - Print progress: X / Total users
  - Print percentage complete
  - Indicate if pipeline complete or continue

Step 7: Next Run (5 minutes later)
  - Repeat from Step 1 with new offset
  - DAG runs independently, data accumulates in operational
```

## Key Design Decisions

### 1. Master Data Handling
- **What:** distribution_centers, products
- **Where:** Loaded ONCE to operational during setup
- **When:** setup-operational-schema (one-time manual task)
- **Why:** Master data doesn't change, no need to reload

### 2. Transactional Data Handling (Users-First)
- **Primary Entity:** Users (batch-driven)
  - Each run processes N users
  - Batch size: configurable (default 5000)
  - Order: FIFO from operational_raw (by user ID)
  
- **Dependent Entities:**
  1. Orders (load all orders for batch users)
  2. Order Items (load all items for batch orders)
  3. Events (load all events for batch users)
  4. Inventory (load items created up to max batch user's created_at)

### 3. Metadata Tracking
- **What:** pipeline_metadata table
- **Tracks:** 
  - last_user_offset (rows processed)
  - batch_number (iteration count)
  - batch_min_created_at (temporal range)
  - batch_max_created_at (temporal range)
- **Why:** 
  - Resume from where it stopped (offset-based)
  - Prevent re-processing (idempotent)
  - Track progress for monitoring

### 4. Foreign Key Integrity
- **Order:** Insert in dependency order
  1. Users (no dependencies)
  2. Orders (depends on users)
  3. Order Items (depends on orders + inventory)
  4. Events (depends on users)
  5. Inventory (independent, but updated after order_items)

- **Inventory Special Case:**
  - Loaded by max batch users' created_at
  - Why: Ensures all inventory items that could be sold in this batch are available
  - Updated: sold_at set based on order_items in this batch

## Execution Example

### Run 1 (0:00 AM - triggered manually or by schedule)
```
Batch 1: Users 0-4999
├── Load from operational_raw: 5000 users
├── Load dependencies:
│   ├── Orders for these 5000 users: 25,000 orders
│   ├── Order items: 75,000 items
│   ├── Events: 100,000 events
│   └── Inventory: all items created up to 2024-06-30 10:00
├── Insert to operational
├── Update metadata: offset=5000, batch_number=1
└── Status: 5000/500000 users (1%)

Metadata State:
  last_user_offset: 5000
  batch_number: 1
  batch_min_created_at: 2024-01-01 00:00
  batch_max_created_at: 2024-06-30 10:00
```

### Run 2 (0:05 AM - 5 minutes later, automatic)
```
Batch 2: Users 5000-9999
├── Load from operational_raw: 5000 users
├── Load dependencies:
│   ├── Orders for these 5000 users: 25,000 orders
│   ├── Order items: 75,000 items
│   ├── Events: 100,000 events
│   └── Inventory: all items created up to 2024-06-30 12:30
├── Insert to operational (no duplicates, offset-based)
├── Update metadata: offset=10000, batch_number=2
└── Status: 10000/500000 users (2%)

Operational Schema State After Run 2:
  users: 10,000 rows
  orders: 50,000 rows
  order_items: 150,000 rows
  events: 200,000 rows
  inventory_items: X rows (cumulative)
```

### Run N (when offset >= total_users)
```
Check: current offset (495000) >= total_users (500000)? NO
Load Batch N: Users 495000-499999 (only 5000 available)
├── Process and insert
├── Update metadata: offset=500000, batch_number=N
└── Status: 500000/500000 users (100%) ✓ COMPLETE

Next Run:
├── Check: 500000 >= 500000? YES
├── Skip all steps (AirflowSkipException)
└── Pipeline complete, awaiting manual re-trigger or config change
```

## DAG Schedule vs Manual Execution

- **Schedule:** Every 5 minutes (`*/5 * * * *` cron)
- **Manual Trigger:** Click "Trigger DAG" in Airflow UI
- **Behavior:** Same whether scheduled or manual - one batch per run
- **Pause/Resume:** 
  - Paused: runs don't execute
  - Unpaused: runs execute on schedule
  - Can still manually trigger when paused

## Configuration

### Batch Size (users per run)
- **Current:** 5000 users
- **File:** `scripts/common/config.py`
- **Configurable:** Yes, adjust `BATCH_SIZE` parameter

### Schedule
- **Current:** Every 5 minutes
- **File:** `airflow/dags/operational_incremental_loading.py`
- **Configurable:** Change `schedule="*/5 * * * *"` to any cron expression

### Schemas
- **Raw (Immutable):** `operational_raw`
- **Simulation (Incremental):** `operational`
- **Metadata:** `pipeline_metadata` (table inside same schema)

## Verification Commands

```bash
# Check pipeline progress
docker exec postgres_warehouse psql -U postgres_warehouse -d Looker_ECommerce \
  -c "SELECT * FROM pipeline_metadata;"

# Check row counts in operational
docker exec postgres_warehouse psql -U postgres_warehouse -d Looker_ECommerce \
  -c "SELECT 
        (SELECT COUNT(*) FROM operational.users) as users,
        (SELECT COUNT(*) FROM operational.orders) as orders,
        (SELECT COUNT(*) FROM operational.order_items) as order_items,
        (SELECT COUNT(*) FROM operational.events) as events,
        (SELECT COUNT(*) FROM operational.inventory_items) as inventory;"

# Check DAG status in Airflow
docker exec airflow-scheduler airflow dags list-runs --dag-id operational_incremental_loading
```

## Answer to Your Question

**Your Design:**
✅ CSV → Bootstrap to operational_raw
✅ Master data (products, distribution_centers) in operational_raw
✅ Incremental loading from operational_raw → operational_simulation (NOT operational_raw)
✅ Batch-based by users (batch size = 5000 users)
✅ User is dependency #1 (everything depends on users)
✅ Metadata tracking for progress

**Our Implementation:**
✅ Matches your design
✅ Schema named `operational` (not `operational_simulation`, but functionally same)
✅ Batch-based incremental loading (one batch = one DAG run)
✅ Users as primary entity (batch determined by user offset)
✅ Dependencies loaded for each batch
✅ Metadata table tracks progress
✅ FK integrity maintained through insertion order
✅ Idempotent: can resume from offset without re-processing

**Status:** ✅ ALIGNED with your design
