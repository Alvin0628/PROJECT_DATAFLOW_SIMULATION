from datetime import datetime
import pandas as pd
import io

from scripts.common.config import (
    SCHEMA,
    SIMULATION,
)

from scripts.common.logger import get_logger

logger = get_logger(__name__)


class OperationalRepository:
    """
    Repository for operational schema.
    
    Design:
    - Reads from operational_raw (immutable source)
    - Writes to operational (built incrementally)
    - No conflict handling (fail-fast on logic errors)
    - Graceful handling of out-of-stock items (no hard fails on FK)
    """
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
        """Execute query and return result as DataFrame."""
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
        """
        Direct insert without conflict handling.
        Errors indicate logic flaw - fail fast design.
        """
        if dataframe.empty:
            logger.info(f"{table} dataframe is empty. Skip insert.")
            return

        schema = schema or self.operational_schema
        logger.info(f"Inserting {len(dataframe)} rows into {schema}.{table}")

        # Create temporary table
        create_temp_sql = f"""
        CREATE TEMP TABLE tmp_{table}
        (LIKE {schema}.{table} INCLUDING DEFAULTS)
        ON COMMIT DROP;
        """
        self.db.execute(create_temp_sql)

        # Copy to temp table
        self.db.copy_dataframe_to_temp_table(
            dataframe=dataframe,
            table=f"tmp_{table}",
            columns=list(dataframe.columns),
        )
        
        # Direct insert - no ON CONFLICT (errors are failures)
        columns_sql = ", ".join(dataframe.columns)
        insert_sql = f"""
        INSERT INTO {schema}.{table}
        ({columns_sql})
        SELECT {columns_sql}
        FROM tmp_{table};
        """
        self.db.execute(insert_sql)
        logger.info(f"{len(dataframe)} rows inserted into {schema}.{table}")
    
    def get_total_users_in_raw(self) -> int:
        """Get total user count from operational_raw."""
        sql = f"SELECT COUNT(*) FROM {self.raw_schema}.users"
        self.db.execute(sql)
        return self.db.fetchone()[0]
    
    def get_user_batch(self, offset: int) -> pd.DataFrame:
        """Load next user batch from raw schema (OFFSET-based pagination)."""
        logger.info(f"Loading user batch | offset={offset}, batch_size={self.batch_size}")
        sql = f"""
        SELECT *
        FROM {self.raw_schema}.users
        ORDER BY created_at, id
        LIMIT %s OFFSET %s
        """
        users_df = self._query_dataframe(sql, (self.batch_size, offset))
        logger.info(f"{len(users_df)} users loaded from raw.")
        return users_df
    
    def get_orders_by_users(self, user_ids: list[int]) -> pd.DataFrame:
        """Load orders for specific users from raw schema."""
        if not user_ids:
            logger.info("No users found. Skip orders.")
            return pd.DataFrame()
        
        logger.info(f"Loading orders for {len(user_ids)} users...")
        sql = f"""
        SELECT *
        FROM {self.raw_schema}.orders
        WHERE user_id = ANY(%s)
        ORDER BY created_at, order_id
        """
        orders_df = self._query_dataframe(sql, (user_ids,))
        logger.info(f"{len(orders_df)} orders loaded from raw.")
        return orders_df
    
    def get_order_items_by_orders(self, order_ids: list[int]) -> pd.DataFrame:
        """Load order items for specific orders from raw schema."""
        if not order_ids:
            logger.info("No orders found. Skip order_items.")
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
    
    def get_events_by_users(self, user_ids: list[int]) -> pd.DataFrame:
        """Load events for specific users from raw schema."""
        if not user_ids:
            logger.info("No users found. Skip events.")
            return pd.DataFrame()
        
        logger.info(f"Loading events for {len(user_ids)} users...")
        sql = f"""
        SELECT *
        FROM {self.raw_schema}.events
        WHERE user_id = ANY(%s)
        ORDER BY created_at, id
        """
        events_df = self._query_dataframe(sql, (user_ids,))
        logger.info(f"{len(events_df)} events loaded from raw.")
        return events_df
    
    def get_inventory_by_ids(self, inventory_ids: list) -> pd.DataFrame:
        """
        Load specific inventory items by ID from raw schema.
        Used to ensure FK integrity for order_items in this batch.
        """
        if not inventory_ids:
            logger.info("No inventory IDs required. Returning empty dataframe.")
            return pd.DataFrame()
        
        logger.info(f"Loading {len(set(inventory_ids))} unique inventory items...")
        sql = f"""
        SELECT *
        FROM {self.raw_schema}.inventory_items
        WHERE id = ANY(%s)
        ORDER BY created_at, id
        """
        inventory_df = self._query_dataframe(sql, (inventory_ids,))
        logger.info(f"{len(inventory_df)} inventory items loaded from raw.")
        return inventory_df
    
    def detect_out_of_stock_items(self, order_items_df: pd.DataFrame, available_inventory_ids: list) -> tuple:
        """
        Detect order_items that reference inventory items NOT available (OUT OF STOCK).
        
        Returns:
            (in_stock_items_df, out_of_stock_items_df)
        """
        if order_items_df.empty:
            return order_items_df, pd.DataFrame()
        
        available_set = set(available_inventory_ids)
        requested_set = set(order_items_df["inventory_item_id"].tolist())
        
        missing_inventory_ids = requested_set - available_set
        
        if not missing_inventory_ids:
            logger.info("✓ All requested inventory items are available (in stock)")
            return order_items_df, pd.DataFrame()
        
        logger.warning(f"⚠ OUT OF STOCK DETECTED: {len(missing_inventory_ids)} inventory items not available")
        logger.warning(f"  Missing inventory IDs: {sorted(list(missing_inventory_ids))[:20]}")  # Show first 20
        
        # Split order_items into in-stock and out-of-stock
        in_stock_mask = order_items_df["inventory_item_id"].isin(available_set)
        in_stock_items = order_items_df[in_stock_mask].copy()
        out_of_stock_items = order_items_df[~in_stock_mask].copy()
        
        # Add reason column for out-of-stock items
        out_of_stock_items["reason"] = "inventory_item_not_available"
        
        logger.info(f"  In Stock:     {len(in_stock_items)} items")
        logger.info(f"  Out of Stock: {len(out_of_stock_items)} items")
        logger.info(f"  Out-of-Stock IDs: {out_of_stock_items['id'].tolist()[:10]}")  # Show first 10
        
        return in_stock_items, out_of_stock_items
    
    # ====================================================================
    # INSERT METHODS - Direct to operational schema
    # ====================================================================
    
    def insert_users(self, users_df: pd.DataFrame):
        """Insert users to operational schema."""
        if users_df.empty:
            logger.info("Users dataframe is empty. Skip insert.")
            return
        logger.info(f"Inserting {len(users_df)} users...")
        self._bulk_insert_dataframe(users_df, "users")
        logger.info("Users inserted successfully.")
    
    def insert_orders(self, orders_df: pd.DataFrame):
        """Insert orders to operational schema."""
        if orders_df.empty:
            logger.info("Orders dataframe is empty. Skip insert.")
            return
        logger.info(f"Inserting {len(orders_df)} orders...")
        self._bulk_insert_dataframe(orders_df, "orders")
        logger.info("Orders inserted successfully.")
    
    def insert_order_items(self, order_items_df: pd.DataFrame):
        """Insert order items (in-stock) to operational schema."""
        if order_items_df.empty:
            logger.info("Order items dataframe is empty. Skip insert.")
            return
        logger.info(f"Inserting {len(order_items_df)} in-stock order_items...")
        self._bulk_insert_dataframe(order_items_df, "order_items")
        logger.info("Order items inserted successfully.")
    
    def insert_order_items_out_of_stock(self, out_of_stock_df: pd.DataFrame):
        """Insert out-of-stock order items to operational schema."""
        if out_of_stock_df.empty:
            logger.info("No out-of-stock items to insert.")
            return
        
        logger.info(f"Inserting {len(out_of_stock_df)} out-of-stock order_items...")
        
        # Rename inventory_item_id -> requested_inventory_item_id for out-of-stock table
        out_of_stock_renamed = out_of_stock_df.copy()
        out_of_stock_renamed["requested_inventory_item_id"] = out_of_stock_renamed["inventory_item_id"]
        out_of_stock_renamed = out_of_stock_renamed.drop(columns=["inventory_item_id"])
        
        self._bulk_insert_dataframe(out_of_stock_renamed, "order_items_out_of_stock")
        logger.info("Out-of-stock items inserted successfully.")
    
    def insert_events(self, events_df: pd.DataFrame):
        """Insert events to operational schema."""
        if events_df.empty:
            logger.info("Events dataframe is empty. Skip insert.")
            return
        logger.info(f"Inserting {len(events_df)} events...")
        self._bulk_insert_dataframe(events_df, "events")
        logger.info("Events inserted successfully.")
    
    def insert_inventory(self, inventory_df: pd.DataFrame):
        """
        Insert inventory to operational schema.
        Uses ON CONFLICT UPDATE because sold_at will change over time.
        """
        if inventory_df.empty:
            logger.info("No inventory to insert.")
            return

        logger.info(f"Inserting {len(inventory_df)} inventory items...")
        
        create_temp_sql = f"""
        CREATE TEMP TABLE tmp_inventory_items
        (LIKE {self.operational_schema}.inventory_items INCLUDING DEFAULTS)
        ON COMMIT DROP;
        """
        self.db.execute(create_temp_sql)

        # Copy dataframe to temp table
        self.db.copy_dataframe_to_temp_table(
            dataframe=inventory_df,
            table="tmp_inventory_items",
            columns=list(inventory_df.columns),
        )
        
        # Insert with ON CONFLICT UPDATE for sold_at
        insert_sql = f"""
        INSERT INTO {self.operational_schema}.inventory_items
        SELECT *
        FROM tmp_inventory_items
        ON CONFLICT (id)
        DO UPDATE SET
            sold_at = EXCLUDED.sold_at
        WHERE EXCLUDED.sold_at IS NOT NULL;
        """
        self.db.execute(insert_sql)
        logger.info("Inventory items inserted/updated successfully.")
    
    def insert_master_data(self):
        """
        Load master tables (distribution_centers, products) once.
        Called during setup, not during incremental loading.
        """
        logger.info("Loading master data to operational...")
        
        for table in ["distribution_centers", "products"]:
            logger.info(f"  Loading {table}...")
            master_df = self._query_dataframe(
                f"SELECT * FROM {self.raw_schema}.{table}"
            )
            self._bulk_insert_dataframe(master_df, table)
        
        logger.info("Master data loaded successfully.")
    
    def update_inventory_sold_at(self, order_items_df: pd.DataFrame):
        """
        Update inventory_items.sold_at based on processed order_items.
        Only update if sold_at was NULL.
        """
        if order_items_df.empty:
            logger.info("No order items found. Skip inventory sold_at update.")
            return

        logger.info(f"Updating sold_at for {len(order_items_df)} inventory items...")
        
        # Prepare dataframe with inventory_item_id and sold_at
        sold_df = order_items_df[["inventory_item_id", "created_at"]].copy()
        sold_df.rename(columns={"created_at": "sold_at"}, inplace=True)
        
        create_temp_sql = """
        CREATE TEMP TABLE tmp_inventory_sold
        (inventory_item_id INTEGER PRIMARY KEY, sold_at TIMESTAMP)
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
        SET sold_at = temp.sold_at
        FROM tmp_inventory_sold AS temp
        WHERE inventory.id = temp.inventory_item_id
            AND inventory.sold_at IS NULL;
        """
        self.db.execute(update_sql)

        logger.info("Inventory sold_at updated successfully.")
