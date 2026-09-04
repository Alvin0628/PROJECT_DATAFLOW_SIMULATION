"""
Setup script to initialize the Silver Layer schema and views.
Runs once at startup, after the operational schema is ready.
"""
import os
from scripts.common.postgres import Postgres
from scripts.common.config import SQL, SCHEMA
from scripts.common.logger import get_logger

logger = get_logger(__name__)

def setup_silver_schema():
    logger.info("=" * 80)
    logger.info("SILVER LAYER SETUP STARTED")
    logger.info("=" * 80)

    with Postgres() as db:
        sql_file_path = SQL["silver"]
        
        if not os.path.exists(sql_file_path):
            logger.error(f"File not found: {sql_file_path}")
            raise FileNotFoundError(f"Missing {sql_file_path}")

        logger.info("-" * 80)
        logger.info(f"Executing DDL from {sql_file_path}...")
        logger.info("-" * 80)

        with open(sql_file_path, "r") as file:
            silver_sql = file.read()
            db.execute(silver_sql)
            
        logger.info(f"✓ Silver schema and views created successfully.")
        
    logger.info("=" * 80)
    logger.info("✓ SILVER LAYER SETUP COMPLETED")
    logger.info("=" * 80)

if __name__ == "__main__":
    setup_silver_schema()