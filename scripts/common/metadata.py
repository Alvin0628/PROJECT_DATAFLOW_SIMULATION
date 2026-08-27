from datetime import datetime
from dateutil.relativedelta import relativedelta
from scripts.common.config import (
    PIPELINE,
    SCHEMA,
)
from scripts.common.logger import get_logger

logger = get_logger(__name__)


class PipelineMetadata:
    def __init__(self, db):
        self.db = db
        self.raw_schema = SCHEMA["raw"]
        self.schema = SCHEMA["operational"]
        self.table = PIPELINE["metadata_table"]

    @property
    def full_table(self):
        return f"{self.schema}.{self.table}"

    def get_earliest_order_date(self):
        """Fetch the absolute minimum order creation date from raw data to start simulation."""
        sql = f"SELECT MIN(created_at) FROM {self.raw_schema}.orders"
        self.db.execute(sql)
        row = self.db.fetchone()
        
        if not row or not row[0]:
            logger.warning("No orders found in raw schema. Defaulting to 2019-01-01.")
            return datetime(2019, 1, 1)
            
        # Optional: Start at the 1st of the month for cleaner batching (e.g., 2019-01-14 -> 2019-01-01)
        earliest_date = row[0]
        return earliest_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    def get_latest_order_date(self):
        """Fetch the absolute maximum order creation date from raw data to end simulation."""
        sql = f"SELECT MAX(created_at) FROM {self.raw_schema}.orders"
        self.db.execute(sql)
        row = self.db.fetchone()
        return row[0] if row else datetime.now()

    def initialize(self, pipeline_name: str):
        """
        Initialize metadata for a new pipeline (idempotent).
        Sets the starting time window based on the earliest order date.
        """
        earliest_date = self.get_earliest_order_date()
        
        # Default: 1 Month window
        first_period_end = earliest_date + relativedelta(months=1)
        
        logger.info(f"Initializing metadata. Simulation starts from: {earliest_date.strftime('%Y-%m-%d')}")

        sql = f"""
        INSERT INTO {self.full_table}
        (
            pipeline_name,
            current_period_start,
            current_period_end,
            batch_number,
            is_completed,
            last_run_at
        )
        VALUES
        (
            %s, %s, %s, 0, FALSE, NULL
        )
        ON CONFLICT (pipeline_name)
        DO NOTHING;
        """
        self.db.execute(sql, (pipeline_name, earliest_date, first_period_end))

    def get(self, pipeline_name: str):
        """Get current pipeline state (Time Window)."""
        sql = f"""
        SELECT
            current_period_start,
            current_period_end,
            batch_number,
            is_completed,
            last_run_at
        FROM {self.full_table}
        WHERE pipeline_name = %s
        """
        self.db.execute(sql, (pipeline_name,))
        row = self.db.fetchone()
        
        if row is None:
            earliest_date = self.get_earliest_order_date()
            return {
                "current_period_start": earliest_date,
                "current_period_end": earliest_date + relativedelta(months=1),
                "batch_number": 0,
                "is_completed": False,
                "last_run_at": None,
            }

        return {
            "current_period_start": row[0],
            "current_period_end": row[1],
            "batch_number": row[2],
            "is_completed": row[3],
            "last_run_at": row[4],
        }
        
    def advance_time_window(self, pipeline_name: str):
        """
        Shift the time window forward by 1 month.
        Checks if the new window exceeds the latest order in raw data.
        """
        current_state = self.get(pipeline_name)
        next_start = current_state["current_period_end"]
        next_end = next_start + relativedelta(months=1)
        next_batch_number = current_state["batch_number"] + 1
        
        # Check against the absolute end of our dataset
        latest_date_in_raw = self.get_latest_order_date()
        is_completed = next_start >= latest_date_in_raw

        sql = f"""
        UPDATE {self.full_table}
        SET
            current_period_start = %s,
            current_period_end = %s,
            batch_number = %s,
            is_completed = %s,
            last_run_at = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE pipeline_name = %s
        """
        self.db.execute(
            sql,
            (
                next_start,
                next_end,
                next_batch_number,
                is_completed,
                datetime.now(),
                pipeline_name,
            ),
        )
        
        return {
            "new_start": next_start,
            "new_end": next_end,
            "batch_number": next_batch_number,
            "is_completed": is_completed
        }

    def reset(self, pipeline_name: str):
        """Reset pipeline metadata to the very beginning of time."""
        earliest_date = self.get_earliest_order_date()
        first_period_end = earliest_date + relativedelta(months=1)
        
        sql = f"""
        UPDATE {self.full_table}
        SET
            current_period_start = %s,
            current_period_end = %s,
            batch_number = 0,
            is_completed = FALSE,
            last_run_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE pipeline_name = %s
        """
        self.db.execute(sql, (earliest_date, first_period_end, pipeline_name))