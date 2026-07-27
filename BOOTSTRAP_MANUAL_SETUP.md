"""
BOOTSTRAP SETUP - One-time manual setup (NOT a DAG)

This is the bootstrap sequence to run ONCE before incremental loading:

Step 1: Bootstrap Loader (manual docker run)
  docker-compose up bootstrap-loader
  
  Creates:
    - operational_raw schema
    - Loads all CSV data
    - Immutable source for incremental loader
  
  Takes: 5-30 minutes (depends on dataset size)

Step 2: Setup Operational Schema (manual docker run)
  docker-compose up setup-operational-schema
  
  Creates:
    - operational schema (empty)
    - All tables with FK constraints
    - Loads master data (distribution_centers, products)
  
  Takes: 1-2 minutes

Step 3: Verify Setup
  Query 1: operational_raw has data
    SELECT COUNT(*) FROM operational_raw.users;
    → should be large (e.g., 1M)
  
  Query 2: operational empty (except master)
    SELECT COUNT(*) FROM operational.users;
    → should be 0
  
  Query 3: Metadata initialized
    SELECT * FROM operational.pipeline_metadata;
    → offset=0, batch_number=0

Step 4: Enable Airflow DAG
  airflow dags unpause operational_incremental_loading
  
  Then Airflow will automatically run the DAG every 5 minutes
  and process batches incrementally until complete.

Notes:
  - Bootstrap is ONE-TIME ONLY
  - Run manually before enabling Airflow DAG
  - Do NOT use DAG for bootstrap (unnecessary complexity)
  - Airflow DAG only for incremental loading (recurring)
"""

# This is documentation only - not executable Python
