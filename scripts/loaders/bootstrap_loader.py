from scripts.common.config import (
    SQL,
    SCHEMA,
    TABLES,
)

from scripts.common.logger import get_logger
from scripts.common.postgres import Postgres
from scripts.common.copy_utils import copy_table

logger = get_logger(__name__)


def bootstrap():

    logger.info("=" * 60)
    logger.info("BOOTSTRAP LOADER STARTED")
    logger.info("=" * 60)

    with Postgres() as db:

        logger.info("Executing master schema reset (01_schema.sql)...")
        with open(SQL["schema"], "r") as file:
            schema_sql = file.read()
            db.execute(schema_sql)
            db.commit()
        logger.info("All schemas dropped and recreated successfully.")
        logger.info("-" * 60)

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
