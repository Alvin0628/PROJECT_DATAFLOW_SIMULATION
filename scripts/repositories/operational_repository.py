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
            columns=dataframe.columns.tolist(),
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
    
    def insert_users(
        self,
        users_df: pd.DataFrame,
    ):

        logger.info(
            f"Inserting {len(users_df)} users..."
        )
        self._bulk_insert_dataframe(
            dataframe=users_df,
            table="users",
        )
        logger.info(
            "Users inserted successfully."
        )
    
    def insert_orders(
        self,
        orders_df: pd.DataFrame,
    ):

        logger.info(
            f"Inserting {len(orders_df)} orders..."
        )
        self._bulk_insert_dataframe(
            dataframe=orders_df,
            table="orders",
        )
        logger.info(
            "Orders inserted successfully."
        )
        
    def insert_order_items(
        self,
        order_items_df: pd.DataFrame,
    ):

        logger.info(
            f"Inserting {len(order_items_df)} order_items..."
        )
        self._bulk_insert_dataframe(
            dataframe=order_items_df,
            table="order_items",
        )
        logger.info(
            "Order items inserted successfully."
        )
    
    def insert_events(
        self,
        events_df: pd.DataFrame,
    ):

        logger.info(
            f"Inserting {len(events_df)} events..."
        )
        self._bulk_insert_dataframe(
            dataframe=events_df,
            table="events",
        )
        logger.info(
            "Events inserted successfully."
        )
    
    def insert_inventory(
        self,
        inventory_df: pd.DataFrame,
    ):

        if inventory_df.empty:
            logger.info(
                "No inventory to insert."
            )
            return

        logger.info(
            f"Inserting {len(inventory_df)} inventory items..."
        )

        create_temp_sql = f"""
        CREATE TEMP TABLE tmp_inventory_items
        (
            LIKE {self.operational_schema}.inventory_items
            INCLUDING DEFAULTS
        )
        ON COMMIT DROP;
        """
        self.db.execute(create_temp_sql)

        # COPY dataframe
        self.db.copy_dataframe_to_temp_table(
            dataframe=inventory_df,
            table="tmp_inventory_items",
            columns=list(inventory_df.columns),
        )
        
        # INSERT ON CONFLICT
        insert_sql = f"""
        INSERT INTO {self.operational_schema}.inventory_items
        SELECT *
        FROM tmp_inventory_items
        ON CONFLICT (id)
        DO NOTHING
        """

        self.db.execute(insert_sql)

        logger.info(
            "Inventory inserted successfully."
        )
        
    def update_inventory_sold_at(
        self,
        order_items_df: pd.DataFrame,
    ):
        """
        Update inventory_items.sold_at
        based on processed order_items.
        """

        if order_items_df.empty:
            logger.info(
                "No order items found. Skip inventory sold_at update."
            )
            return

        logger.info(
            f"Updating sold_at for {len(order_items_df)} inventory items..."
        )
        
        # Prepare dataframe
        sold_df = order_items_df[
            [
                "inventory_item_id",
                "created_at",
            ]
        ].copy()

        sold_df.rename(
            columns={
                "created_at": "sold_at",
            },
            inplace=True,
        )
        
        # Create temporary table
        create_temp_sql = """
        CREATE TEMP TABLE tmp_inventory_sold
        (
            inventory_item_id INTEGER PRIMARY KEY,
            sold_at TIMESTAMP
        )
        ON COMMIT DROP;
        """
        self.db.execute(create_temp_sql)
        
        # COPY dataframe to temporary table
        self.db.copy_dataframe_to_temp_table(
            dataframe=sold_df,
            table="tmp_inventory_sold",
            columns=list(sold_df.columns),
        )

        # UPDATE inventory_items
        update_sql = f"""
        UPDATE {self.operational_schema}.inventory_items AS inventory
        SET
            sold_at = temp.sold_at
        FROM tmp_inventory_sold AS temp
        WHERE
            inventory.id = temp.inventory_item_id
            AND inventory.sold_at IS NULL;
        """
        self.db.execute(update_sql)

        logger.info(
            "Inventory sold_at updated successfully."
        )