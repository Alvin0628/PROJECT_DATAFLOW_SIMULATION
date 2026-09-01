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
    logger.info(f"Membaca {schema}.{table_name} dari lokal...")
    df = pd.read_sql_table(table_name, con=local_engine, schema=schema)

    if df.empty:
        logger.warning(f"Tabel {table_name} kosong. Sinkronisasi dilewati.")
        return

    # FIX: 'date' dihapus dari include -- itu BUKAN dtype yang valid untuk
    # pandas (beda dari 'datetime64[ns]' yang valid). select_dtypes()
    # memvalidasi SEMUA string di include=[...] SEBELUM cek kolom apapun,
    # jadi 'date' yang tidak dikenal bikin TypeError instan, terlepas
    # apakah DataFrame-nya beneran punya kolom tanggal atau tidak -- ini
    # yang menjelaskan kenapa error-nya identik di ketiga tabel.
    #
    # Catatan: kolom SQL bertipe DATE murni (bukan TIMESTAMP) yang dibaca
    # via SQLAlchemy read_sql_table biasanya balik sebagai dtype 'object'
    # berisi objek Python datetime.date -- itu TIDAK perlu ditangani
    # manual di sini, karena df.to_csv() (dipanggil di dalam
    # copy_dataframe) otomatis serialize objek date jadi string ISO.
    datetime_cols = df.select_dtypes(include=['datetime64[ns]', 'datetime64[ns, UTC]', 'datetimetz']).columns
    for col in datetime_cols:
        df[col] = df[col].astype(str)

    logger.info(f"Mengosongkan tabel {table_name} di Supabase...")
    db.execute(f"TRUNCATE TABLE {schema}.{table_name}")

    logger.info(f"COPY {len(df)} baris ke Supabase...")
    db.copy_dataframe(
        dataframe=df,
        schema=schema,
        table=table_name,
        columns=list(df.columns),
    )

    logger.info(f"✅ Tabel {table_name} berhasil disinkronisasi ({len(df)} baris).")


def run_sync():
    logger.info("Memulai proses sinkronisasi Marts (Gold Layer) ke Supabase...")

    engine = create_engine(LOCAL_DB_URI)

    with SupabasePostgres() as db:
        for table_name in MART_TABLES:
            try:
                sync_table_to_supabase(engine, db, table_name=table_name, schema='public')
                db.commit()
            except Exception as e:
                logger.error(f"⚠️ Gagal sinkronisasi tabel {table_name}: {e}")
                db.rollback()


if __name__ == "__main__":
    run_sync()