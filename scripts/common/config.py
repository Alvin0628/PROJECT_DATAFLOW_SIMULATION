from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()

#Project Paths

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATASET_DIR = PROJECT_ROOT / "datasets" / "master"
REPORT_DIR = PROJECT_ROOT / "reports"
LOG_DIR = PROJECT_ROOT / "logs"
SQL_DIR = PROJECT_ROOT / "sql"
AIRFLOW_DIR = PROJECT_ROOT / "airflow"
LOG_DIR.mkdir(parents=True, exist_ok=True)

#Postgres Configurations

POSTGRES = {
    "host": os.getenv("POSTGRES_HOST", "localhost"),
    "port": int(os.getenv("POSTGRES_PORT", 5432)),
    "dbname": os.getenv("POSTGRES_DB_warehouse"),
    "user": os.getenv("POSTGRES_USER_warehouse"),
    "password": os.getenv("POSTGRES_PASSWORD_warehouse"),
}

#Schema
SCHEMA = {
    "raw": "operational_raw",

    # Operational database simulation
    "operational": "operational",
    "silver": "silver",
    "gold": "gold",
}


SQL = {
    "schema": SQL_DIR / "01_schema.sql",
    "operational": SQL_DIR / "02_operational.sql",
    "silver": SQL_DIR / "03_silver_layer.sql",
    "gold": SQL_DIR / "04_gold_layer.sql",
}


SIMULATION = {
    "batch_user_size": int(
        os.getenv("SIM_BATCH_USER_SIZE", 5000)
    ),

    "interval_seconds": int(
        os.getenv("SIM_INTERVAL_SECONDS", 600)
    ),
}

PIPELINE = {

    "metadata_table": "pipeline_metadata",

}

CSV = {
    "encoding": "utf-8",
    "delimiter": ",",
    "header": True,
}

LOGGING = {
    "level": "INFO",
    "log_file": LOG_DIR / "pipeline.log",
}

TABLES = {

    "distribution_centers": {
        "type": "master",
        "bootstrap": True,
        "incremental": False,
        "driver": False,
    },

    "products": {
        "type": "master",
        "bootstrap": True,
        "incremental": False,
        "driver": False,
    },

    "inventory_items": {
        "type": "master",
        "bootstrap": True,
        "incremental": False,
        "driver": False,
        # sold_at will be update on simulator
        "stateful": True,
    },

    "users": {
        "type": "transaction",
        "bootstrap": True,
        "incremental": True,
        "driver": True,
        "watermark": "created_at",
    },

    "orders": {
        "type": "transaction",
        "bootstrap": True,
        "incremental": True,
        "driver": False,
        "depends_on": "users",
    },

    "order_items": {
        "type": "transaction",
        "bootstrap": True,
        "incremental": True,
        "driver": False,
        "depends_on": "orders",
    },

    "events": {
        "type": "transaction",
        "bootstrap": True,
        "incremental": True,
        "driver": False,
        "depends_on": "users",
    },
}