from pathlib import Path
import psycopg

from common.config import POSTGRES
from common.logger import get_logger


logger = get_logger(__name__)


class Postgres:

    def __init__(self):

        self.conn = None
        self.cursor = None


    def connect(self):
        if self.conn is None:
            logger.info("Connecting to PostgreSQL...")
            self.conn = psycopg.connect(**POSTGRES)
            self.cursor = self.conn.cursor()
            logger.info("Connected successfully.")

        return self

    def __enter__(self):
        return self.connect()

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.rollback()
        else:
            self.commit()
        self.close()

    def execute(self, query, params=None):
        self.cursor.execute(query, params)

    def executemany(self, query, params):
        self.cursor.executemany(query, params)

    def fetchone(self):
        return self.cursor.fetchone()

    def fetchall(self):
        return self.cursor.fetchall()

    def execute_sql_file(self, sql_path: Path):
        logger.info(f"Executing {sql_path.name}")
        sql = sql_path.read_text(encoding="utf-8")
        self.cursor.execute(sql)
        
    def execute_sql_template(
        self,
        sql_path: Path,
        schema: str,
    ):

        logger.info(
            f"Executing template {sql_path.name} -> {schema}"
        )

        sql = sql_path.read_text(
            encoding="utf-8"
        )

        sql = sql.replace(
            "{{SCHEMA}}",
            schema
        )

        self.cursor.execute(sql)

    def copy_csv(
        self,
        csv_path: Path,
        schema: str,
        table: str,
        header: bool = True
    ):
        logger.info(f"COPY {table}")
        with self.cursor.copy(
            f"""
            COPY {schema}.{table}
            FROM STDIN
            WITH (
                FORMAT CSV,
                HEADER {'TRUE' if header else 'FALSE'}
            )
            """
        ) as copy:

            with open(csv_path, "r", encoding="utf-8") as f:
                while data := f.read(8192):
                    copy.write(data)
                    
        logger.info(f"{table} loaded successfully.")


    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()


    def close(self):
        if self.cursor:
            self.cursor.close()
            self.cursor = None

        if self.conn:
            self.conn.close()
            self.conn = None
            logger.info("Connection closed.")