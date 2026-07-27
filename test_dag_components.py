#!/usr/bin/env python3
import sys
sys.path.insert(0, '/opt/airflow')

try:
    print("[1] Testing PostgreSQL connection...")
    from scripts.common.postgres import Postgres
    with Postgres() as db:
        db.execute("SELECT 1")
        print("    ✓ PostgreSQL connection OK")
except Exception as e:
    print(f"    ✗ PostgreSQL Error: {e}")
    sys.exit(1)

try:
    print("[2] Testing metadata table...")
    from scripts.common.metadata import PipelineMetadata
    from scripts.common.postgres import Postgres
    with Postgres() as db:
        metadata = PipelineMetadata(db)
        metadata.initialize("operational_incremental_loading")
        print("    ✓ Metadata table OK")
except Exception as e:
    print(f"    ✗ Metadata Error: {e}")
    sys.exit(1)

try:
    print("[3] Testing repository...")
    from scripts.repositories.operational_repository import OperationalRepository
    from scripts.common.postgres import Postgres
    with Postgres() as db:
        repo = OperationalRepository(db)
        total = repo.get_total_users_in_raw()
        print(f"    ✓ Repository OK - Total users: {total}")
except Exception as e:
    print(f"    ✗ Repository Error: {e}")
    sys.exit(1)

print("\n✓ ALL CHECKS PASSED - DAG should work!")
