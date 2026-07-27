"""
Setup script to initialize operational database schema.
Runs once at startup, before incremental loader.

Steps:
1. Create operational schema and tables (empty)
2. Load master data (distribution_centers, products)
3. Metadata ready for incremental loader
"""
from scripts.common.postgres import Postgres
from scripts.common.config import SQL, SCHEMA
from scripts.common.logger import get_logger
from scripts.repositories.operational_repository import OperationalRepository

logger = get_logger(__name__)


def setup_operational_schema():
    """
    Create the operational schema and all required tables.
    Load master data that doesn't change.
    """
    logger.info("=" * 80)
    logger.info("OPERATIONAL SCHEMA SETUP STARTED")
    logger.info("=" * 80)

    with Postgres() as db:
        
        # ====================================================================
        # STEP 1: Create operational schema and all tables (empty)
        # ====================================================================
        logger.info("-" * 80)
        logger.info(f"Creating schema {SCHEMA['operational']}...")
        logger.info("-" * 80)
        
        db.execute_sql_template(
            sql_path=SQL["operational"],
            schema=SCHEMA["operational"],
        )
        
        logger.info(f"✓ Operational schema created: {SCHEMA['operational']}")
        
        # ====================================================================
        # STEP 2: Load master data (one-time, not incremental)
        # ====================================================================
        logger.info("-" * 80)
        logger.info("Loading master data...")
        logger.info("-" * 80)
        
        repository = OperationalRepository(db)
        repository.insert_master_data()
        
        logger.info("✓ Master data loaded")
        
    logger.info("=" * 80)
    logger.info("✓ OPERATIONAL SCHEMA SETUP COMPLETED")
    logger.info("=" * 80)


if __name__ == "__main__":
    setup_operational_schema()
