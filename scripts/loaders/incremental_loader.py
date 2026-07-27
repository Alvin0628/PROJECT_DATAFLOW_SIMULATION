"""
Incremental Loader for Operational Schema (New Design).

Architecture:
    - operational_raw: immutable source (all data from CSV)
    - operational: built incrementally, batch by batch
    - metadata: tracks offset into operational_raw
    
Flow:
    1. Get current offset from metadata
    2. Load next batch of users from operational_raw (OFFSET-based)
    3. Load dependencies (orders, order_items, events) for those users
    4. Load inventory items required by order_items (by ID, not by date)
    5. Detect OUT-OF-STOCK items (order_items referencing missing inventory)
    6. Split order_items: in_stock + out_of_stock
    7. Insert to operational schema (graceful handling, no hard failures)
    8. Update metadata offset
    9. Repeat until offset reaches total users in raw

Design principle:
    - Metadata offset is meaningful (tracks progress in raw)
    - operational starts empty, built incrementally
    - No duplicates (operational_raw is immutable source)
    - OUT-OF-STOCK items are BUSINESS INSIGHTS (track separately, don't fail)
    - FK integrity maintained through graceful out-of-stock detection
"""

from scripts.common.postgres import Postgres
from scripts.repositories.operational_repository import OperationalRepository
from scripts.common.metadata import PipelineMetadata
from scripts.common.config import PIPELINE
from scripts.common.logger import get_logger

logger = get_logger(__name__)


class IncrementalLoader:
    """
    Load data incrementally from operational_raw to operational.
    One run = one batch of users.
    
    Gracefully handles out-of-stock scenarios without hard failures.
    """

    def __init__(self):
        self.pipeline_name = PIPELINE["pipeline_name"]

    def run(self):
        """Execute one batch of incremental loading."""
        logger.info("=" * 80)
        logger.info(f"INCREMENTAL LOADER STARTED | Pipeline: {self.pipeline_name}")
        logger.info("=" * 80)

        try:
            with Postgres() as db:
                metadata = PipelineMetadata(db)
                repository = OperationalRepository(db)

                # ====================================================================
                # STEP 1: Initialize metadata (first run only)
                # ====================================================================
                metadata.initialize(pipeline_name=self.pipeline_name)

                # ====================================================================
                # STEP 2: Get current state from metadata
                # ====================================================================
                state = metadata.get(pipeline_name=self.pipeline_name)
                last_offset = state["last_user_offset"]
                last_batch_number = state["last_batch_number"]

                logger.info("-" * 80)
                logger.info(f"Current State:")
                logger.info(f"  Offset: {last_offset}")
                logger.info(f"  Batch #: {last_batch_number}")
                logger.info("-" * 80)

                # ====================================================================
                # STEP 3: Check total users and validate progress
                # ====================================================================
                total_users = repository.get_total_users_in_raw()
                progress = metadata.validate_progress(self.pipeline_name, total_users)

                logger.info(f"Pipeline Progress: {progress['offset']}/{progress['total']} users")
                logger.info(f"Progress: {progress['progress_pct']:.2f}%")
                logger.info(f"Completed: {progress['is_complete']}")

                if progress["is_complete"]:
                    logger.info("=" * 80)
                    logger.info("✓ PIPELINE COMPLETE | All users already processed")
                    logger.info("=" * 80)
                    return

                # ====================================================================
                # STEP 4: Load next batch from raw schema
                # ====================================================================
                logger.info("=" * 80)
                logger.info(f"LOADING BATCH #{last_batch_number + 1}")
                logger.info(f"Offset: {last_offset} | Batch Size: {repository.batch_size}")
                logger.info("=" * 80)

                users_df = repository.get_user_batch(offset=last_offset)

                # Check if there are more users to process
                if users_df.empty:
                    logger.info("=" * 80)
                    logger.info("✓ NO MORE USERS | Pipeline finished")
                    logger.info("=" * 80)
                    return

                logger.info(f"✓ Batch loaded: {len(users_df)} users")

                # ====================================================================
                # STEP 5: Load dependencies from raw schema
                # ====================================================================
                logger.info("-" * 80)
                logger.info("Loading dependencies...")
                logger.info("-" * 80)

                user_ids = users_df["id"].tolist()
                orders_df = repository.get_orders_by_users(user_ids=user_ids)
                order_ids = orders_df["order_id"].tolist() if not orders_df.empty else []
                order_items_df = repository.get_order_items_by_orders(order_ids=order_ids)
                events_df = repository.get_events_by_users(user_ids=user_ids)
                
                # Load inventory items referenced by order_items
                inventory_item_ids = order_items_df["inventory_item_id"].tolist() if not order_items_df.empty else []
                inventory_df = repository.get_inventory_by_ids(inventory_ids=inventory_item_ids)
                available_inventory_ids = inventory_df["id"].tolist() if not inventory_df.empty else []
                
                batch_min_created_at = users_df["created_at"].min()
                batch_max_created_at = users_df["created_at"].max()

                logger.info("-" * 80)
                logger.info("Dependencies loaded:")
                logger.info(f"  Users:       {len(users_df)}")
                logger.info(f"  Orders:      {len(orders_df)}")
                logger.info(f"  Order Items: {len(order_items_df)}")
                logger.info(f"  Events:      {len(events_df)}")
                logger.info(f"  Inventory:   {len(inventory_df)}")
                logger.info("-" * 80)

                # ====================================================================
                # STEP 6: Detect OUT-OF-STOCK items (graceful handling)
                # ====================================================================
                logger.info("-" * 80)
                logger.info("Checking inventory availability...")
                logger.info("-" * 80)

                in_stock_items, out_of_stock_items = repository.detect_out_of_stock_items(
                    order_items_df=order_items_df,
                    available_inventory_ids=available_inventory_ids
                )

                # ====================================================================
                # STEP 7: Insert data to operational schema
                # ====================================================================
                logger.info("=" * 80)
                logger.info("INSERTING TO OPERATIONAL SCHEMA")
                logger.info("=" * 80)

                # Load order of operations matters (FK dependencies)
                repository.insert_users(users_df=users_df)
                repository.insert_orders(orders_df=orders_df)
                repository.insert_inventory(inventory_df=inventory_df)
                repository.insert_order_items(order_items_df=in_stock_items)  # Only in-stock items
                repository.insert_order_items_out_of_stock(out_of_stock_df=out_of_stock_items)  # Out-of-stock items
                repository.insert_events(events_df=events_df)

                # Update inventory sold_at based on in-stock order_items
                repository.update_inventory_sold_at(order_items_df=in_stock_items)

                logger.info("=" * 80)
                logger.info("✓ BATCH DATA INSERTED SUCCESSFULLY")
                logger.info("=" * 80)

                # ====================================================================
                # STEP 8: Update metadata
                # ====================================================================
                logger.info("-" * 80)
                logger.info("Updating metadata...")
                logger.info("-" * 80)

                next_offset = last_offset + len(users_df)
                next_batch_number = last_batch_number + 1

                metadata.update(
                    pipeline_name=self.pipeline_name,
                    last_user_offset=next_offset,
                    batch_number=next_batch_number,
                    batch_min_created_at=batch_min_created_at,
                    batch_max_created_at=batch_max_created_at,
                )

                logger.info(f"  Offset:        {last_offset} → {next_offset}")
                logger.info(f"  Batch Number:  {last_batch_number} → {next_batch_number}")
                logger.info(f"  Progress:      {next_offset}/{total_users} users ({next_offset/total_users*100:.2f}%)")
                logger.info("-" * 80)

                # ====================================================================
                # SUMMARY
                # ====================================================================
                logger.info("=" * 80)
                logger.info(f"✓ BATCH #{next_batch_number} COMPLETED SUCCESSFULLY")
                logger.info(f"  Users:           {len(users_df)}")
                logger.info(f"  In-Stock Items:  {len(in_stock_items)}")
                logger.info(f"  Out-of-Stock:    {len(out_of_stock_items)}")
                logger.info(f"  Progress:        {next_offset}/{total_users} users ({next_offset/total_users*100:.2f}%)")
                logger.info(f"  Remaining:       {total_users - next_offset} users")
                if next_offset >= total_users:
                    logger.info(f"  Status:          ✓ PIPELINE COMPLETE")
                else:
                    logger.info(f"  Status:          Continue to next batch")
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
