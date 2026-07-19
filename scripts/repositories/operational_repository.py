from datetime import datetime
import pandas as pd

from common.config import (
    SCHEMA,
    SIMULATION,
)

from common.logger import get_logger

logger = get_logger(__name__)


class OperationalRepository:
    def __init__(self, db):
        self.db = db
        self.raw_schema = SCHEMA["raw"]
        self.operational_schema = SCHEMA["operational"]
        self.batch_size = SIMULATION["batch_user_size"]
    
    def _query_dataframe(
        self,
        sql: str,
        params: tuple | None = None,
    ) -> pd.DataFrame:
        """
        Execute query and return result as DataFrame.
        """

        self.db.execute(sql, params)

        rows = self.db.fetchall()

        columns = [
            column[0]
            for column in self.db.cursor.description
        ]

        return pd.DataFrame(
            rows,
            columns=columns,
        )
        
    def _bulk_insert_dataframe(
        self,
        dataframe: pd.DataFrame,
        table: str,
    ):
        if dataframe.empty:
            logger.info(
                f"{table} dataframe is empty. Skip insert."
            )
            return

        self.db.copy_dataframe(
            dataframe=dataframe,
            schema=self.operational_schema,
            table=table,
        )
    
    def get_user_batch(
        self,
        offset: int,
    ) -> pd.DataFrame:

        logger.info(
            f"Loading user batch | offset={offset}"
        )

        sql = f"""
        SELECT *
        FROM {self.raw_schema}.users
        ORDER BY
            created_at,
            id
        LIMIT %s
        OFFSET %s
        """

        users_df = self._query_dataframe(
            sql,
            (self.batch_size,offset,),
        )
        logger.info(
            f"{len(users_df)} users loaded."
        )

        return users_df
    
    def get_orders_by_users(
        self,
        user_ids: list[int],
    ) -> pd.DataFrame:

        if not user_ids:
            logger.info(
                "No users found. Skip orders."
            )
            return pd.DataFrame()
        
        logger.info(
            f"Loading orders for {len(user_ids)} users..."
        )

        sql = f"""
        SELECT *
        FROM {self.raw_schema}.orders
        WHERE user_id = ANY(%s)
        ORDER BY
            created_at,
            order_id
        """

        orders_df = self._query_dataframe(
            sql,
            (user_ids,),
        )
        logger.info(
            f"{len(orders_df)} orders loaded."
        )

        return orders_df
    
    def get_order_items_by_orders(
        self,
        order_ids: list[int],
    ) -> pd.DataFrame:

        if not order_ids:

            logger.info(
                "No orders found. Skip order_items."
            )

            return pd.DataFrame()

        logger.info(
            f"Loading order_items for {len(order_ids)} orders..."
        )

        sql = f"""
        SELECT *
        FROM {self.raw_schema}.order_items
        WHERE order_id = ANY(%s)
        ORDER BY
            order_id,
            id
        """

        order_items_df = self._query_dataframe(
            sql,
            (order_ids,),
        )

        logger.info(
            f"{len(order_items_df)} order_items loaded."
        )

        return order_items_df
    
    def get_events_by_users(
        self,
        user_ids: list[int],
    ) -> pd.DataFrame:

        if not user_ids:

            logger.info(
                "No users found. Skip events."
            )

            return pd.DataFrame()

        logger.info(
            f"Loading events for {len(user_ids)} users..."
        )

        sql = f"""
        SELECT *
        FROM {self.raw_schema}.events
        WHERE user_id = ANY(%s)
        ORDER BY
            created_at,
            id
        """

        events_df = self._query_dataframe(
            sql,
            (user_ids,),
        )

        logger.info(
            f"{len(events_df)} events loaded."
        )

        return events_df
    
    def get_inventory_until(
        self,
        max_created_at: datetime,
    ) -> pd.DataFrame:

        logger.info(
            f"Loading inventory until {max_created_at}"
        )

        sql = f"""
        SELECT *
        FROM {self.raw_schema}.inventory_items
        WHERE created_at <= %s
        ORDER BY
            created_at,
            id
        """

        inventory_df = self._query_dataframe(
            sql,
            (max_created_at,)
        )

        logger.info(
            f"{len(inventory_df)} inventory loaded."
        )

        return inventory_df
    
    