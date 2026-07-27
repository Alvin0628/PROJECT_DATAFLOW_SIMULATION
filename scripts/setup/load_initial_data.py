"""
Initial data loader - copy data from operational_raw to operational schema
for the first time before incremental loader starts.
"""
from scripts.common.postgres import Postgres
from scripts.common.config import SCHEMA
from scripts.common.logger import get_logger
import pandas as pd

logger = get_logger(__name__)


def load_initial_data():
    """
    Copy master data and initial transaction data from
    operational_raw to operational schema.
    
    Load order is important due to foreign key constraints:
    1. distribution_centers, products (master)
    2. inventory_items (product reference)
    3. users (no dependency)
    4. orders (user reference)
    5. order_items (orders + inventory reference)
    6. events (user reference)
    """
    logger.info("=" * 60)
    logger.info("INITIAL DATA LOADER STARTED")
    logger.info("=" * 60)

    with Postgres() as db:
        raw_schema = SCHEMA["raw"]
        operational_schema = SCHEMA["operational"]
        
        # 1. Master tables (no dependencies)
        logger.info("Loading master tables...")
        for table in ["distribution_centers", "products"]:
            logger.info(f"  Loading {table}...")
            sql = f"""
            INSERT INTO {operational_schema}.{table}
            SELECT * FROM {raw_schema}.{table}
            ON CONFLICT DO NOTHING;
            """
            db.execute(sql)
        logger.info("Master tables loaded successfully.")
        
        # 2. Load inventory_items (depends on products, which are already loaded)
        logger.info("Loading inventory_items...")
        sql = f"""
        INSERT INTO {operational_schema}.inventory_items
        SELECT * FROM {raw_schema}.inventory_items
        ON CONFLICT DO NOTHING;
        """
        db.execute(sql)
        logger.info("Inventory_items loaded successfully.")
        
        # 3. Load users
        logger.info("Loading users...")
        sql = f"""
        INSERT INTO {operational_schema}.users
        SELECT * FROM {raw_schema}.users
        ON CONFLICT DO NOTHING;
        """
        db.execute(sql)
        logger.info("Users loaded successfully.")
        
        # 4. Load orders (depends on users)
        logger.info("Loading orders...")
        sql = f"""
        INSERT INTO {operational_schema}.orders
        SELECT * FROM {raw_schema}.orders
        ON CONFLICT DO NOTHING;
        """
        db.execute(sql)
        logger.info("Orders loaded successfully.")
        
        # 5. Load order_items (depends on orders + inventory)
        logger.info("Loading order_items...")
        sql = f"""
        INSERT INTO {operational_schema}.order_items
        SELECT * FROM {raw_schema}.order_items
        ON CONFLICT DO NOTHING;
        """
        db.execute(sql)
        logger.info("Order_items loaded successfully.")
        
        # 6. Load events (depends on users)
        logger.info("Loading events...")
        sql = f"""
        INSERT INTO {operational_schema}.events
        SELECT * FROM {raw_schema}.events
        ON CONFLICT DO NOTHING;
        """
        db.execute(sql)
        logger.info("Events loaded successfully.")
        
        logger.info("=" * 60)
        logger.info("INITIAL DATA LOADER FINISHED")
        logger.info("=" * 60)


if __name__ == "__main__":
    load_initial_data()
