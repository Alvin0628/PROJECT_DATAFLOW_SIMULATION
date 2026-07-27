"""
Validation Tests for Architecture Redesign

Run this script after setup_operational_schema completes,
and after incremental_loading finishes (or on any batch).
"""

import sys
from scripts.common.postgres import Postgres
from scripts.common.config import SCHEMA, PIPELINE
from scripts.repositories.operational_repository import OperationalRepository
from scripts.common.metadata import PipelineMetadata
from scripts.common.logger import get_logger

logger = get_logger(__name__)


class ValidationTests:
    def __init__(self):
        self.db = Postgres().connect()
        self.passed = 0
        self.failed = 0
        self.schema_raw = SCHEMA["raw"]
        self.schema_operational = SCHEMA["operational"]
        self.pipeline_name = PIPELINE["pipeline_name"]

    def close(self):
        self.db.close()

    def assert_equal(self, actual, expected, test_name):
        """Assert actual equals expected."""
        if actual == expected:
            logger.info(f"✓ PASS: {test_name}")
            self.passed += 1
            return True
        else:
            logger.error(f"✗ FAIL: {test_name}")
            logger.error(f"  Expected: {expected}")
            logger.error(f"  Actual:   {actual}")
            self.failed += 1
            return False

    def assert_greater_than(self, actual, threshold, test_name):
        """Assert actual > threshold."""
        if actual > threshold:
            logger.info(f"✓ PASS: {test_name} (actual: {actual})")
            self.passed += 1
            return True
        else:
            logger.error(f"✗ FAIL: {test_name}")
            logger.error(f"  Expected > {threshold}")
            logger.error(f"  Actual:   {actual}")
            self.failed += 1
            return False

    def assert_zero_duplicates(self, table, id_col, test_name):
        """Assert no duplicate IDs in table."""
        sql = f"""
        SELECT COUNT(*) FROM (
            SELECT {id_col} FROM {self.schema_operational}.{table}
            GROUP BY {id_col} HAVING COUNT(*) > 1
        ) t;
        """
        self.db.execute(sql)
        dupe_count = self.db.fetchone()[0]
        
        if dupe_count == 0:
            logger.info(f"✓ PASS: {test_name}")
            self.passed += 1
            return True
        else:
            logger.error(f"✗ FAIL: {test_name} - Found {dupe_count} duplicates")
            self.failed += 1
            return False

    def assert_fk_integrity(self, table, fk_col, ref_table, ref_col, test_name):
        """Assert all FK references exist."""
        sql = f"""
        SELECT COUNT(*) FROM {self.schema_operational}.{table} t
        WHERE {fk_col} IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM {self.schema_operational}.{ref_table} r
            WHERE r.{ref_col} = t.{fk_col}
        );
        """
        self.db.execute(sql)
        orphaned_count = self.db.fetchone()[0]
        
        if orphaned_count == 0:
            logger.info(f"✓ PASS: {test_name}")
            self.passed += 1
            return True
        else:
            logger.error(f"✗ FAIL: {test_name} - Found {orphaned_count} orphaned records")
            self.failed += 1
            return False

    # ====================================================================
    # PHASE 1: Setup Validation (after bootstrap_and_setup)
    # ====================================================================

    def test_operational_raw_populated(self):
        """Test 1: operational_raw should have all CSV data."""
        logger.info("\n" + "=" * 80)
        logger.info("TEST 1: operational_raw Populated")
        logger.info("=" * 80)
        
        sql = f"SELECT COUNT(*) FROM {self.schema_raw}.users;"
        self.db.execute(sql)
        count = self.db.fetchone()[0]
        
        self.assert_greater_than(count, 0, "operational_raw.users has data")

    def test_operational_initially_empty(self):
        """Test 2: operational.users should start empty (before incremental)."""
        logger.info("\n" + "=" * 80)
        logger.info("TEST 2: operational Initially Empty (or growing)")
        logger.info("=" * 80)
        
        sql = f"SELECT COUNT(*) FROM {self.schema_operational}.users;"
        self.db.execute(sql)
        users_count = self.db.fetchone()[0]
        
        logger.info(f"  Users in operational: {users_count}")
        # After setup: should be 0
        # After first batch: should be > 0
        # We accept both (test can run at any time)

    def test_master_data_loaded(self):
        """Test 3: Master data (distribution_centers, products) should be loaded."""
        logger.info("\n" + "=" * 80)
        logger.info("TEST 3: Master Data Loaded")
        logger.info("=" * 80)
        
        sql = f"SELECT COUNT(*) FROM {self.schema_operational}.distribution_centers;"
        self.db.execute(sql)
        count = self.db.fetchone()[0]
        
        self.assert_greater_than(count, 0, "distribution_centers loaded")

    def test_metadata_initialized(self):
        """Test 4: Pipeline metadata should be initialized."""
        logger.info("\n" + "=" * 80)
        logger.info("TEST 4: Metadata Initialized")
        logger.info("=" * 80)
        
        metadata = PipelineMetadata(self.db)
        state = metadata.get(self.pipeline_name)
        
        self.assert_equal(
            state["last_user_offset"],
            0,
            "Metadata offset initialized to 0"
        )

    # ====================================================================
    # PHASE 2: Incremental Loading Validation (after batches load)
    # ====================================================================

    def test_operational_growing(self):
        """Test 5: operational.users should grow with each batch."""
        logger.info("\n" + "=" * 80)
        logger.info("TEST 5: operational Growing with Batches")
        logger.info("=" * 80)
        
        sql = f"SELECT COUNT(*) FROM {self.schema_operational}.users;"
        self.db.execute(sql)
        operational_count = self.db.fetchone()[0]
        
        sql = f"SELECT COUNT(*) FROM {self.schema_raw}.users;"
        self.db.execute(sql)
        raw_count = self.db.fetchone()[0]
        
        logger.info(f"  Loaded: {operational_count}/{raw_count} users ({operational_count/raw_count*100:.2f}%)")
        
        # At least some data should be loaded
        self.assert_greater_than(operational_count, 0, "operational.users has data")

    def test_metadata_incrementing(self):
        """Test 6: Metadata offset should increment with each batch."""
        logger.info("\n" + "=" * 80)
        logger.info("TEST 6: Metadata Offset Incrementing")
        logger.info("=" * 80)
        
        metadata = PipelineMetadata(self.db)
        state = metadata.get(self.pipeline_name)
        
        offset = state["last_user_offset"]
        batch_num = state["last_batch_number"]
        
        logger.info(f"  Offset: {offset}")
        logger.info(f"  Batch #: {batch_num}")
        
        # At least the first batch should have run
        self.assert_greater_than(offset, 0, "Metadata offset > 0")

    def test_no_duplicate_users(self):
        """Test 7: No duplicate users in operational."""
        logger.info("\n" + "=" * 80)
        logger.info("TEST 7: No Duplicate Users")
        logger.info("=" * 80)
        
        self.assert_zero_duplicates("users", "id", "users: no duplicate IDs")

    def test_no_duplicate_orders(self):
        """Test 8: No duplicate orders in operational."""
        logger.info("\n" + "=" * 80)
        logger.info("TEST 8: No Duplicate Orders")
        logger.info("=" * 80)
        
        self.assert_zero_duplicates("orders", "order_id", "orders: no duplicate order_ids")

    def test_fk_orders_to_users(self):
        """Test 9: All orders reference existing users (FK integrity)."""
        logger.info("\n" + "=" * 80)
        logger.info("TEST 9: FK Integrity - orders → users")
        logger.info("=" * 80)
        
        self.assert_fk_integrity("orders", "user_id", "users", "id",
                                  "orders.user_id references users.id")

    def test_fk_order_items_to_orders(self):
        """Test 10: All order_items reference existing orders (FK integrity)."""
        logger.info("\n" + "=" * 80)
        logger.info("TEST 10: FK Integrity - order_items → orders")
        logger.info("=" * 80)
        
        self.assert_fk_integrity("order_items", "order_id", "orders", "order_id",
                                  "order_items.order_id references orders.order_id")

    def test_fk_order_items_to_users(self):
        """Test 11: All order_items reference existing users (FK integrity)."""
        logger.info("\n" + "=" * 80)
        logger.info("TEST 11: FK Integrity - order_items → users")
        logger.info("=" * 80)
        
        self.assert_fk_integrity("order_items", "user_id", "users", "id",
                                  "order_items.user_id references users.id")

    def test_fk_events_to_users(self):
        """Test 12: All events reference existing users (FK integrity)."""
        logger.info("\n" + "=" * 80)
        logger.info("TEST 12: FK Integrity - events → users")
        logger.info("=" * 80)
        
        self.assert_fk_integrity("events", "user_id", "users", "id",
                                  "events.user_id references users.id")

    def test_data_consistency(self):
        """Test 13: operational should not exceed operational_raw counts."""
        logger.info("\n" + "=" * 80)
        logger.info("TEST 13: Data Consistency (operational ≤ operational_raw)")
        logger.info("=" * 80)
        
        for table in ["users", "orders", "order_items", "events"]:
            sql = f"""
            SELECT 
                (SELECT COUNT(*) FROM {self.schema_raw}.{table}) as raw_count,
                (SELECT COUNT(*) FROM {self.schema_operational}.{table}) as op_count;
            """
            self.db.execute(sql)
            raw_count, op_count = self.db.fetchone()
            
            logger.info(f"  {table}: operational={op_count}, raw={raw_count}")
            
            if op_count <= raw_count:
                logger.info(f"  ✓ {table} count OK")
                self.passed += 1
            else:
                logger.error(f"  ✗ {table} has MORE data than raw!")
                self.failed += 1

    # ====================================================================
    # PHASE 3: Completion Validation (when all users processed)
    # ====================================================================

    def test_pipeline_complete(self):
        """Test 14: When pipeline complete, counts should match."""
        logger.info("\n" + "=" * 80)
        logger.info("TEST 14: Pipeline Complete (optional - only if finished)")
        logger.info("=" * 80)
        
        repo = OperationalRepository(self.db)
        total_raw = repo.get_total_users_in_raw()
        
        sql = f"SELECT COUNT(*) FROM {self.schema_operational}.users;"
        self.db.execute(sql)
        total_operational = self.db.fetchone()[0]
        
        logger.info(f"  operational_raw.users: {total_raw}")
        logger.info(f"  operational.users: {total_operational}")
        
        if total_operational == total_raw:
            logger.info(f"  ✓ Pipeline complete - counts match!")
            self.passed += 1
        else:
            logger.info(f"  ℹ Pipeline in progress ({total_operational}/{total_raw})")
            # Don't fail - this is expected if not complete

    # ====================================================================
    # RUN ALL TESTS
    # ====================================================================

    def run_all(self):
        """Run all validation tests."""
        logger.info("\n\n")
        logger.info("╔" + "=" * 78 + "╗")
        logger.info("║" + " " * 78 + "║")
        logger.info("║" + "  VALIDATION TESTS - ARCHITECTURE REDESIGN".center(78) + "║")
        logger.info("║" + " " * 78 + "║")
        logger.info("╚" + "=" * 78 + "╝")

        # Phase 1: Setup
        self.test_operational_raw_populated()
        self.test_operational_initially_empty()
        self.test_master_data_loaded()
        self.test_metadata_initialized()

        # Phase 2: Incremental
        self.test_operational_growing()
        self.test_metadata_incrementing()
        self.test_no_duplicate_users()
        self.test_no_duplicate_orders()
        self.test_fk_orders_to_users()
        self.test_fk_order_items_to_orders()
        self.test_fk_order_items_to_users()
        self.test_fk_events_to_users()
        self.test_data_consistency()

        # Phase 3: Completion
        self.test_pipeline_complete()

        # Summary
        logger.info("\n\n")
        logger.info("╔" + "=" * 78 + "╗")
        logger.info("║" + f"  RESULTS: {self.passed} passed, {self.failed} failed".ljust(78) + "║")
        logger.info("╚" + "=" * 78 + "╝")

        return self.failed == 0


def main():
    """Run validation tests."""
    tester = ValidationTests()
    try:
        success = tester.run_all()
        tester.close()
        sys.exit(0 if success else 1)
    except Exception as e:
        logger.error(f"Test execution failed: {str(e)}", exc_info=True)
        tester.close()
        sys.exit(2)


if __name__ == "__main__":
    main()
