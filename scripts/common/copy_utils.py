from pathlib import Path

from common.config import (
    DATASET_DIR,
    TABLES,
    SCHEMA,
)

from common.logger import get_logger
logger = get_logger(__name__)

def get_csv_path(table: str) -> Path:
    """
    Return CSV path for a table.
    """
    csv_path = DATASET_DIR / f"{table}.csv"
    if not csv_path.exists():
        raise FileNotFoundError(
            f"CSV not found : {csv_path}"
        )

    return csv_path

def validate_table(table: str):
    if table not in TABLES:
        raise ValueError(
            f"Unknown table : {table}"
        )

def copy_table(
    db,
    table: str,
    schema: str = SCHEMA["raw"]
):
    """
    Copy a single CSV file into PostgreSQL.
    """
    validate_table(table)
    csv_path = get_csv_path(table)
    logger.info(f"Loading {table}...")
    db.copy_csv(
        csv_path=csv_path,
        schema=schema,
        table=table,
    )
    logger.info(f"{table} loaded successfully.")


def copy_tables(
    db,
    tables: list[str],
    schema: str = SCHEMA["raw"]
):
    """
    Copy multiple tables.
    """
    for table in tables:
        copy_table(
            db=db,
            table=table,
            schema=schema
        )

def copy_master_tables(
    db,
    schema: str = SCHEMA["raw"]
):
    """
    Copy all master tables.
    """

    tables = [
        table
        for table, meta in TABLES.items()
        if meta["type"] == "master"

    ]

    copy_tables(
        db=db,
        tables=tables,
        schema=schema
    )


def copy_transaction_tables(
    db,
    schema: str = SCHEMA["raw"]
):
    """
    Copy all transaction tables.
    """
    tables = [
        table
        for table, meta in TABLES.items()
        if meta["type"] == "transaction"
    ]

    copy_tables(
        db=db,
        tables=tables,
        schema=schema
    )