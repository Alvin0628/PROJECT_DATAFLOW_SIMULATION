from datetime import datetime
from scripts.common.config import (
    PIPELINE,
    SCHEMA,
)
from scripts.common.logger import get_logger

logger = get_logger(__name__)


class PipelineMetadata:
    def __init__(self, db):
        self.db = db
        self.schema = SCHEMA["operational"]
        self.table = PIPELINE["metadata_table"]

    @property
    def full_table(self):
        return f"{self.schema}.{self.table}"

    def initialize(self, pipeline_name: str):
        """Initialize metadata for new pipeline (idempotent)."""
        sql = f"""
        INSERT INTO {self.full_table}
        (
            pipeline_name,
            last_user_offset,
            last_batch_number,
            last_batch_user_min_created_at,
            last_batch_user_max_created_at,
            last_run_at
        )
        VALUES
        (
            %s,
            0,
            0,
            NULL,
            NULL,
            NULL
        )
        ON CONFLICT (pipeline_name)
        DO NOTHING;
        """
        self.db.execute(sql, (pipeline_name,))

    def get(self, pipeline_name: str):
        """Get current pipeline state."""
        sql = f"""
        SELECT
            last_user_offset,
            last_batch_number,
            last_batch_user_min_created_at,
            last_batch_user_max_created_at,
            last_run_at
        FROM {self.full_table}
        WHERE pipeline_name = %s
        """
        self.db.execute(sql, (pipeline_name,))
        row = self.db.fetchone()
        
        if row is None:
            return {
                "last_user_offset": 0,
                "last_batch_number": 0,
                "last_batch_user_min_created_at": None,
                "last_batch_user_max_created_at": None,
                "last_run_at": None,
            }

        return {
            "last_user_offset": row[0],
            "last_batch_number": row[1],
            "last_batch_user_min_created_at": row[2],
            "last_batch_user_max_created_at": row[3],
            "last_run_at": row[4],
        }
        
    def update(
        self,
        pipeline_name: str,
        last_user_offset: int,
        batch_number: int,
        batch_min_created_at,
        batch_max_created_at,
    ):
        """Update metadata after batch processing."""
        sql = f"""
        UPDATE {self.full_table}
        SET
            last_user_offset = %s,
            last_batch_number = %s,
            last_batch_user_min_created_at = %s,
            last_batch_user_max_created_at = %s,
            last_run_at = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE pipeline_name = %s
        """
        self.db.execute(
            sql,
            (
                last_user_offset,
                batch_number,
                batch_min_created_at,
                batch_max_created_at,
                datetime.now(),
                pipeline_name,
            ),
        )

    def reset(self, pipeline_name: str):
        """Reset pipeline metadata to initial state."""
        sql = f"""
        UPDATE {self.full_table}
        SET
            last_user_offset = 0,
            last_batch_number = 0,
            last_batch_user_min_created_at = NULL,
            last_batch_user_max_created_at = NULL,
            last_run_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE pipeline_name = %s
        """
        self.db.execute(sql, (pipeline_name,))
    
    def validate_progress(self, pipeline_name: str, total_users_raw: int) -> dict:
        """
        Validate pipeline progress and determine completion status.
        
        Args:
            pipeline_name: Name of the pipeline
            total_users_raw: Total users in operational_raw
            
        Returns:
            dict with keys:
                - offset: current offset in raw schema
                - total: total users in raw
                - progress_pct: percentage progress (0-100)
                - is_complete: whether pipeline is finished
                - batch_number: current batch number
        """
        state = self.get(pipeline_name)
        offset = state["last_user_offset"]
        batch_number = state["last_batch_number"]
        is_complete = offset >= total_users_raw
        
        progress_pct = (offset / total_users_raw * 100) if total_users_raw > 0 else 0
        
        return {
            "offset": offset,
            "total": total_users_raw,
            "progress_pct": progress_pct,
            "is_complete": is_complete,
            "batch_number": batch_number,
        }
