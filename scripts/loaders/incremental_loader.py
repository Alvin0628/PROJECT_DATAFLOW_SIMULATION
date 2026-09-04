"""
Incremental Loader for the Operational Schema.

The loader processes data month by month using the time period stored in
the metadata table.

Data flow:
    - operational_raw: source data loaded from CSV and kept unchanged.
    - operational: target schema populated incrementally by month.
    - metadata: keeps track of the current processing period.

Process:
    1. Read the current processing period from metadata.
    2. Load users, orders, and events for the current month.
    3. Load order_items only for orders that were loaded in this period.
    4. Load inventory_items based on the related order_items.
    5. Check for items that are out of stock.
    6. Insert the processed data into the operational schema.
    7. Move the processing period to the next month.
    8. Continue until all available data in operational_raw has been processed.
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

                # initialize metadata
                metadata.initialize(pipeline_name=self.pipeline_name)

                #get current time window state
                state = metadata.get(pipeline_name=self.pipeline_name)
                start_date = state["current_period_start"]
                end_date = state["current_period_end"]
                batch_number = state["batch_number"]
                is_completed = state["is_completed"]

                if is_completed:
                    logger.info("=" * 80)
                    logger.info("PIPELINE COMPLETE | All historical data has been processed.")
                    logger.info("=" * 80)
                    return

                logger.info("-" * 80)
                logger.info(f"Current Batch: #{batch_number + 1}")
                logger.info(f"Time Window  : {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
                logger.info("-" * 80)

                # load entities
                users_df = repository.get_users_by_time(start_date=start_date, end_date=end_date)
                orders_df = repository.get_orders_by_time(start_date=start_date, end_date=end_date)
                events_df = repository.get_events_by_time(start_date=start_date, end_date=end_date)

                #load dependencies
                logger.info("-" * 80)
                logger.info("Loading Relational Dependencies...")
                logger.info("-" * 80)

                order_ids = orders_df["order_id"].tolist() if not orders_df.empty else []
                order_items_df = repository.get_order_items_by_orders(order_ids=order_ids)
                
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

                # added logic out of stock for order status (business logic implementation)
                in_stock_items, out_of_stock_items = repository.detect_out_of_stock_items(
                    order_items_df=order_items_df,
                    available_inventory_ids=available_inventory_ids
                )

                # insert data to operational
                logger.info("=" * 80)
                logger.info("INSERTING TO OPERATIONAL SCHEMA")
                logger.info("=" * 80)
                
                repository.insert_users(users_df=users_df)
                repository.insert_orders(orders_df=orders_df)
                repository.insert_order_items(order_items_df=in_stock_items)
                repository.insert_order_items_out_of_stock(out_of_stock_df=out_of_stock_items)
                repository.insert_events(events_df=events_df)
                repository.update_inventory_sold_at(order_items_df=in_stock_items)

                # update metadata
                logger.info("-" * 80)
                logger.info("Advancing Time Window to next month...")
                
                new_state = metadata.advance_time_window(pipeline_name=self.pipeline_name)
                
                logger.info(f"  Next Start : {new_state['new_start'].strftime('%Y-%m-%d')}")
                logger.info(f"  Next End   : {new_state['new_end'].strftime('%Y-%m-%d')}")
                logger.info("-" * 80)

                # summary pipelines
                logger.info("=" * 80)
                logger.info(f"✓ BATCH #{batch_number + 1} ({start_date.strftime('%b %Y')}) COMPLETED SUCCESSFULLY")
                if new_state["is_completed"]:
                    logger.info(f"  Status     : PIPELINE COMPLETE (Reached present/latest data)")
                else:
                    logger.info(f"  Status     : Continue to next month in next run")
                logger.info("=" * 80)

        except Exception as e:
            logger.error("=" * 80)
            logger.error(f"INCREMENTAL LOADER FAILED")
            logger.error(f"Error: {str(e)}")
            logger.error("=" * 80)
            raise

        logger.info("=" * 80)
        logger.info("INCREMENTAL LOADER FINISHED")
        logger.info("=" * 80)


if __name__ == "__main__":
    IncrementalLoader().run()