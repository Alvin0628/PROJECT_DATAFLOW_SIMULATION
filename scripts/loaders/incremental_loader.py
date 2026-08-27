"""
Incremental Loader for Operational Schema (Time-Based & Dependency Injection).

Architecture:
    - operational_raw: immutable source (all data from CSV)
    - operational: built incrementally, month by month (Time Window)
    - metadata: tracks the current time period (start_date to end_date)
    
Flow:
    1. Get current time window (current_period_start to current_period_end) from metadata.
    2. Load independent events for this month (users, orders, events).
    3. Load dependent entities based strictly on FK (order_items based on order_ids).
    4. Load physical inventory based strictly on FK (inventory_items based on order_items).
    5. Detect OUT-OF-STOCK items.
    6. Insert to operational schema gracefully.
    7. Update metadata to the next month.
    8. Repeat until the current_period reaches the latest data in raw.
"""

from scripts.common.postgres import Postgres
from scripts.repositories.operational_repository import OperationalRepository
from scripts.common.metadata import PipelineMetadata
from scripts.common.config import PIPELINE
from scripts.common.logger import get_logger

logger = get_logger(__name__)


class IncrementalLoader:
    def __init__(self):
        self.pipeline_name = PIPELINE["pipeline_name"]

    def run(self):
        """Execute one batch (1 month) of incremental loading."""
        logger.info("=" * 80)
        logger.info(f"INCREMENTAL LOADER STARTED | Pipeline: {self.pipeline_name}")
        logger.info("=" * 80)

        try:
            with Postgres() as db:
                metadata = PipelineMetadata(db)
                repository = OperationalRepository(db)

                # ====================================================================
                # STEP 1: Initialize metadata (idempotent - safe to run multiple times)
                # ====================================================================
                metadata.initialize(pipeline_name=self.pipeline_name)

                # ====================================================================
                # STEP 2: Get current time window state from metadata
                # ====================================================================
                state = metadata.get(pipeline_name=self.pipeline_name)
                start_date = state["current_period_start"]
                end_date = state["current_period_end"]
                batch_number = state["batch_number"]
                is_completed = state["is_completed"]

                if is_completed:
                    logger.info("=" * 80)
                    logger.info("✓ PIPELINE COMPLETE | All historical data has been processed.")
                    logger.info("=" * 80)
                    return

                logger.info("-" * 80)
                logger.info(f"Current Batch: #{batch_number + 1}")
                logger.info(f"Time Window  : {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
                logger.info("-" * 80)

                # ====================================================================
                # STEP 3: Load Independent Entities for this Time Window
                # ====================================================================
                users_df = repository.get_users_by_time(start_date=start_date, end_date=end_date)
                orders_df = repository.get_orders_by_time(start_date=start_date, end_date=end_date)
                events_df = repository.get_events_by_time(start_date=start_date, end_date=end_date)

                # ====================================================================
                # STEP 4: Load Dependencies (Dependency Injection / FK-based)
                # ====================================================================
                logger.info("-" * 80)
                logger.info("Loading Relational Dependencies...")
                logger.info("-" * 80)

                # Tarik order items yang bereferensi ke order di bulan ini
                order_ids = orders_df["order_id"].tolist() if not orders_df.empty else []
                order_items_df = repository.get_order_items_by_orders(order_ids=order_ids)
                
                # Tarik inventory yang bereferensi ke order items di bulan ini
                inventory_item_ids = order_items_df["inventory_item_id"].tolist() if not order_items_df.empty else []
                inventory_df = repository.get_inventory_by_ids(inventory_ids=inventory_item_ids)
                available_inventory_ids = inventory_df["id"].tolist() if not inventory_df.empty else []

                logger.info("-" * 80)
                logger.info("Data loaded for this window:")
                logger.info(f"  Users       : {len(users_df)}")
                logger.info(f"  Orders      : {len(orders_df)}")
                logger.info(f"  Order Items : {len(order_items_df)}")
                logger.info(f"  Events      : {len(events_df)}")
                logger.info(f"  Inventory   : {len(inventory_df)}")
                logger.info("-" * 80)

                # ====================================================================
                # STEP 5: Detect OUT-OF-STOCK items
                # ====================================================================
                in_stock_items, out_of_stock_items = repository.detect_out_of_stock_items(
                    order_items_df=order_items_df,
                    available_inventory_ids=available_inventory_ids
                )

                # ====================================================================
                # STEP 6: Insert data to operational schema
                # ====================================================================
                logger.info("=" * 80)
                logger.info("INSERTING TO OPERATIONAL SCHEMA")
                logger.info("=" * 80)

                # Urutan Load SANGAT PENTING untuk Foreign Key Integrity
                repository.insert_users(users_df=users_df)
                repository.insert_orders(orders_df=orders_df)
                
                repository.insert_order_items(order_items_df=in_stock_items)
                repository.insert_order_items_out_of_stock(out_of_stock_df=out_of_stock_items)
                repository.insert_events(events_df=events_df)

                # Update status barang jadi 'Sold'
                repository.update_inventory_sold_at(order_items_df=in_stock_items)

                # ====================================================================
                # STEP 7: Advance Time Window (Update Metadata)
                # ====================================================================
                logger.info("-" * 80)
                logger.info("Advancing Time Window to next month...")
                
                new_state = metadata.advance_time_window(pipeline_name=self.pipeline_name)
                
                logger.info(f"  Next Start : {new_state['new_start'].strftime('%Y-%m-%d')}")
                logger.info(f"  Next End   : {new_state['new_end'].strftime('%Y-%m-%d')}")
                logger.info("-" * 80)

                # ====================================================================
                # SUMMARY
                # ====================================================================
                logger.info("=" * 80)
                logger.info(f"✓ BATCH #{batch_number + 1} ({start_date.strftime('%b %Y')}) COMPLETED SUCCESSFULLY")
                if new_state["is_completed"]:
                    logger.info(f"  Status     : ✓ PIPELINE COMPLETE (Reached present/latest data)")
                else:
                    logger.info(f"  Status     : Continue to next month in next run")
                logger.info("=" * 80)

        except Exception as e:
            logger.error("=" * 80)
            logger.error(f"✗ INCREMENTAL LOADER FAILED")
            logger.error(f"Error: {str(e)}")
            logger.error("=" * 80)
            raise

        logger.info("=" * 80)
        logger.info("INCREMENTAL LOADER FINISHED")
        logger.info("=" * 80)


if __name__ == "__main__":
    IncrementalLoader().run()