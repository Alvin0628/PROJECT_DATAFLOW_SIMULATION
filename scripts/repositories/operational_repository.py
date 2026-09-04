import pandas as pd
from datetime import datetime

from scripts.common.config import (
    SCHEMA,
)
from scripts.common.logger import get_logger

logger = get_logger(__name__)


class OperationalRepository:
    def __init__(self, db):
        self.db = db
        self.raw_schema = SCHEMA["raw"]
        self.operational_schema = SCHEMA["operational"]
    
    def _query_dataframe(
        self,
        sql: str,
        params: tuple | None = None,
    ) -> pd.DataFrame:
        self.db.execute(sql, params)
        rows = self.db.fetchall()
        columns = [column[0] for column in self.db.cursor.description]
        return pd.DataFrame(rows, columns=columns)
        
    def _bulk_insert_dataframe(
        self,
        dataframe: pd.DataFrame,
        table: str,
        schema: str = None,
    ):
        if dataframe.empty:
            logger.info(f"{table} dataframe is empty. Skip insert.")
            return

        schema = schema or self.operational_schema
        logger.info(f"Inserting {len(dataframe)} rows into {schema}.{table}")

        create_temp_sql = f"""
        CREATE TEMP TABLE tmp_{table}
        (LIKE {schema}.{table} INCLUDING DEFAULTS)
        ON COMMIT DROP;
        """
        self.db.execute(create_temp_sql)

        self.db.copy_dataframe_to_temp_table(
            dataframe=dataframe,
            table=f"tmp_{table}",
            columns=list(dataframe.columns),
        )
        
        columns_sql = ", ".join(dataframe.columns)
        insert_sql = f"""
        INSERT INTO {schema}.{table}
        ({columns_sql})
        SELECT {columns_sql}
        FROM tmp_{table};
        """
        self.db.execute(insert_sql)
        logger.info(f"{len(dataframe)} rows inserted into {schema}.{table}")
    
    
    def get_users_by_time(self, start_date: datetime, end_date: datetime) -> pd.DataFrame:
        """Load users registered within the current time window."""
        logger.info(f"Loading users between {start_date.strftime('%Y-%m-%d')} and {end_date.strftime('%Y-%m-%d')}")
        sql = f"""
        SELECT *
        FROM {self.raw_schema}.users
        WHERE created_at >= %s AND created_at < %s
        ORDER BY created_at, id
        """
        users_df = self._query_dataframe(sql, (start_date, end_date))
        logger.info(f"{len(users_df)} users loaded from raw.")
        return users_df
    
    def get_orders_by_time(self, start_date: datetime, end_date: datetime) -> pd.DataFrame:
        """Load orders created within the current time window."""
        logger.info(f"Loading orders between {start_date.strftime('%Y-%m-%d')} and {end_date.strftime('%Y-%m-%d')}")
        sql = f"""
        SELECT *
        FROM {self.raw_schema}.orders
        WHERE created_at >= %s AND created_at < %s
        ORDER BY created_at, order_id
        """
        orders_df = self._query_dataframe(sql, (start_date, end_date))
        logger.info(f"{len(orders_df)} orders loaded from raw.")
        return orders_df

    def get_events_by_time(self, start_date: datetime, end_date: datetime) -> pd.DataFrame:
        """Load events created within the current time window."""
        logger.info(f"Loading events between {start_date.strftime('%Y-%m-%d')} and {end_date.strftime('%Y-%m-%d')}")
        sql = f"""
        SELECT *
        FROM {self.raw_schema}.events
        WHERE created_at >= %s AND created_at < %s
        ORDER BY created_at, id
        """
        events_df = self._query_dataframe(sql, (start_date, end_date))
        logger.info(f"{len(events_df)} events loaded from raw.")
        return events_df

    def get_order_items_by_orders(self, order_ids: list[int]) -> pd.DataFrame:
        """Load order items for specific orders from raw schema."""
        if not order_ids:
            return pd.DataFrame()
        
        logger.info(f"Loading order_items for {len(order_ids)} orders...")
        sql = f"""
        SELECT *
        FROM {self.raw_schema}.order_items
        WHERE order_id = ANY(%s)
        ORDER BY order_id, id
        """
        order_items_df = self._query_dataframe(sql, (order_ids,))
        logger.info(f"{len(order_items_df)} order_items loaded from raw.")
        return order_items_df
    
    def get_inventory_by_ids(self, inventory_ids: list) -> pd.DataFrame:
        """
        Load specific inventory items by ID from operational schema.
        (Master Data).
        """
        if not inventory_ids:
            return pd.DataFrame()
        
        logger.info(f"Checking {len(set(inventory_ids))} requested inventory items against Operational Master Data...")
        sql = f"""
        SELECT id
        FROM {self.operational_schema}.inventory_items
        WHERE id = ANY(%s)
            AND sold_At IS NULL
        """
        inventory_df = self._query_dataframe(sql, (inventory_ids,))
        logger.info(f"{len(inventory_df)} inventory items available in stock.")
        return inventory_df

    def detect_out_of_stock_items(self, order_items_df: pd.DataFrame, available_inventory_ids: list) -> tuple:
        """Detect order_items that reference missing inventory items."""
        if order_items_df.empty:
            return order_items_df, pd.DataFrame()
        
        available_set = set(available_inventory_ids)
        requested_set = set(order_items_df["inventory_item_id"].tolist())
        
        missing_inventory_ids = requested_set - available_set
        
        if not missing_inventory_ids:
            logger.info("✓ All requested inventory items are available (in stock)")
            return order_items_df, pd.DataFrame()
        
        logger.warning(f"OUT OF STOCK DETECTED: {len(missing_inventory_ids)} inventory items not available")
        
        in_stock_mask = order_items_df["inventory_item_id"].isin(available_set)
        in_stock_items = order_items_df[in_stock_mask].copy()
        out_of_stock_items = order_items_df[~in_stock_mask].copy()
        
        out_of_stock_items["reason"] = "inventory_item_not_available"
        
        return in_stock_items, out_of_stock_items
    
    
    def insert_users(self, users_df: pd.DataFrame):
        self._bulk_insert_dataframe(users_df, "users")
    
    def insert_orders(self, orders_df: pd.DataFrame):
        self._bulk_insert_dataframe(orders_df, "orders")
    
    def insert_order_items(self, order_items_df: pd.DataFrame):
        self._bulk_insert_dataframe(order_items_df, "order_items")
    
    def insert_order_items_out_of_stock(self, out_of_stock_df: pd.DataFrame):
        if out_of_stock_df.empty:
            return
        out_of_stock_renamed = out_of_stock_df.copy()
        out_of_stock_renamed["requested_inventory_item_id"] = out_of_stock_renamed["inventory_item_id"]
        out_of_stock_renamed = out_of_stock_renamed.drop(columns=["inventory_item_id"])
        self._bulk_insert_dataframe(out_of_stock_renamed, "order_items_out_of_stock")
    
    def insert_events(self, events_df: pd.DataFrame):
        self._bulk_insert_dataframe(events_df, "events")
    
    
    def insert_master_data(self):
        for table in ["distribution_centers", "products"]:
            master_df = self._query_dataframe(f"SELECT * FROM {self.raw_schema}.{table}")
            self._bulk_insert_dataframe(master_df, table)
            
        logger.info("Loading master data for inventory_items (excluding orphan/sold data)...")
        sql_inventory = f"""
        SELECT *
        FROM {self.raw_schema}.inventory_items
        WHERE sold_at IS NULL
        """
        inventory_master_df = self._query_dataframe(sql_inventory)
        self._bulk_insert_dataframe(inventory_master_df, "inventory_items")
    
    def update_inventory_sold_at(self, order_items_df: pd.DataFrame):
        if order_items_df.empty:
            return
            
        sold_df = order_items_df[["inventory_item_id", "order_id"]].copy()
        
        create_temp_sql = """
        CREATE TEMP TABLE tmp_inventory_sold
        (inventory_item_id INTEGER PRIMARY KEY, order_id INTEGER)
        ON COMMIT DROP;
        """
        self.db.execute(create_temp_sql)
        
        self.db.copy_dataframe_to_temp_table(
            dataframe=sold_df,
            table="tmp_inventory_sold",
            columns=list(sold_df.columns),
        )

        update_sql = f"""
        UPDATE {self.operational_schema}.inventory_items AS inventory
        SET sold_at = o.created_at
        FROM tmp_inventory_sold AS temp
        JOIN {self.operational_schema}.orders AS o ON temp.order_id = o.order_id
        WHERE inventory.id = temp.inventory_item_id
            AND inventory.sold_at IS NULL;
        """
        self.db.execute(update_sql)