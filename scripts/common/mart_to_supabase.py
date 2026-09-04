import os
import pandas as pd
from sqlalchemy import create_engine

from scripts.common.supabase_postgres import SupabasePostgres
from scripts.common.logger import get_logger

logger = get_logger(__name__)

LOCAL_DB_URI = os.environ.get(
    "LOCAL_DATA_WAREHOUSE_URI",
    "postgresql://postgres_warehouse:WH721HDA@postgres_warehouse:5432/Looker_ECommerce"
)

MART_TABLES = [
    "mart_user_funnel",
    "mart_sales_revenue",
    "mart_logistics_sla",
]


def sync_table_to_supabase(local_engine, db: SupabasePostgres, table_name: str, schema: str = 'public'):
    logger.info(f"Read {schema}.{table_name} from local...")
    df = pd.read_sql_table(table_name, con=local_engine, schema=schema)

    if df.empty:
        logger.warning(f"Table {table_name} is empty. Skipp Synchronization.")
        return

    datetime_cols = df.select_dtypes(include=['datetime64[ns]', 'datetime64[ns, UTC]', 'datetimetz']).columns
    for col in datetime_cols:
        df[col] = df[col].astype(str)

    logger.info(f"Clearing table {table_name} in Supabase...")
    db.execute(f"TRUNCATE TABLE {schema}.{table_name}")

    logger.info(f"COPY {len(df)} rows to Supabase...")
    db.copy_dataframe(
        dataframe=df,
        schema=schema,
        table=table_name,
        columns=list(df.columns),
    )

    logger.info(f"Table {table_name} successfully synchronized ({len(df)} rows).")


def run_sync():
    logger.info("Starting Marts (Gold Layer) synchronization process to Supabase...")

    engine = create_engine(LOCAL_DB_URI)

    with SupabasePostgres() as db:
        for table_name in MART_TABLES:
            try:
                sync_table_to_supabase(engine, db, table_name=table_name, schema='public')
                db.commit()
            except Exception as e:
                logger.error(f"Failed to synchronize table {table_name}: {e}")
                db.rollback()


if __name__ == "__main__":
    run_sync()