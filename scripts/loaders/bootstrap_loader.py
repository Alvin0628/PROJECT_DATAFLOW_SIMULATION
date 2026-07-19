from common.config import (
    SQL,
    SCHEMA,
    TABLES,
)

from common.logger import get_logger
from common.postgres import Postgres
from common.copy_utils import copy_table

logger = get_logger(__name__)


def bootstrap():

    logger.info("=" * 60)
    logger.info("BOOTSTRAP LOADER STARTED")
    logger.info("=" * 60)

    with Postgres() as db:

        logger.info("Creating operational_raw tables...")

        db.execute_sql_template(
            sql_path=SQL["operational"],
            schema=SCHEMA["raw"],
        )

        logger.info("Operational_raw tables created.")
        logger.info("-" * 60)
        logger.info("Loading CSV files into operational_raw...")
        total_tables = 0

        for table_name, metadata in TABLES.items():
            if not metadata["bootstrap"]:
                continue

            logger.info(
                f"Loading table : {table_name}"
            )
            copy_table(
                db=db,
                table=table_name,
                schema=SCHEMA["raw"],
            )
            total_tables += 1

        logger.info("-" * 60)
        logger.info("Bootstrap completed successfully.")
        logger.info(
            f"Total tables loaded : {total_tables}"
        )

    logger.info("=" * 60)
    logger.info("BOOTSTRAP LOADER FINISHED")
    logger.info("=" * 60)

if __name__ == "__main__":
    bootstrap()