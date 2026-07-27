#!/usr/bin/env python3
"""
Airflow DAG Run Monitor
Shows real-time status of DAG runs and pipeline progress.
"""

import time
import sys
from datetime import datetime
from scripts.common.postgres import Postgres
from scripts.repositories.operational_repository import OperationalRepository
from scripts.common.metadata import PipelineMetadata
from scripts.common.config import PIPELINE


def get_pipeline_status():
    """Get current pipeline status from database."""
    with Postgres() as db:
        repo = OperationalRepository(db)
        metadata = PipelineMetadata(db)
        
        total_users = repo.get_total_users_in_raw()
        state = metadata.get(PIPELINE["pipeline_name"])
        progress = metadata.validate_progress(PIPELINE["pipeline_name"], total_users)
        
        # Get table counts
        db.execute("SELECT COUNT(*) FROM operational.users")
        users_count = db.fetchone()[0]
        
        db.execute("SELECT COUNT(*) FROM operational.orders")
        orders_count = db.fetchone()[0]
        
        db.execute("SELECT COUNT(*) FROM operational.order_items")
        order_items_count = db.fetchone()[0]
        
        db.execute("SELECT COUNT(*) FROM operational.events")
        events_count = db.fetchone()[0]
        
        db.execute("SELECT COUNT(*) FROM operational.inventory_items")
        inventory_count = db.fetchone()[0]
        
        db.execute("SELECT COUNT(*) FROM operational.order_items_out_of_stock")
        oos_count = db.fetchone()[0]
        
        return {
            "total_users": total_users,
            "offset": progress["offset"],
            "batch_number": progress["batch_number"],
            "progress_pct": progress["progress_pct"],
            "is_complete": progress["is_complete"],
            "users_loaded": users_count,
            "orders_loaded": orders_count,
            "order_items_loaded": order_items_count,
            "events_loaded": events_count,
            "inventory_loaded": inventory_count,
            "out_of_stock": oos_count,
            "last_updated": state.get("updated_at"),
        }


def print_status(status):
    """Print formatted status."""
    print("\033[2J\033[H")  # Clear screen
    print("=" * 80)
    print(f"AIRFLOW DAG MONITOR - operational_incremental_loading")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    print()
    
    # Progress
    progress_bar_width = 50
    filled = int(progress_bar_width * status["progress_pct"] / 100)
    bar = "█" * filled + "░" * (progress_bar_width - filled)
    
    print(f"Progress: [{bar}] {status['progress_pct']:.2f}%")
    print(f"  {status['offset']:,}/{status['total_users']:,} users processed")
    print(f"  Batch #{status['batch_number']}")
    print(f"  Status: {'✓ COMPLETE' if status['is_complete'] else '⏳ IN PROGRESS'}")
    print()
    
    # Data loaded
    print("Data Loaded:")
    print(f"  Users:              {status['users_loaded']:>10,}")
    print(f"  Orders:             {status['orders_loaded']:>10,}")
    print(f"  Order Items:        {status['order_items_loaded']:>10,}")
    print(f"  Events:             {status['events_loaded']:>10,}")
    print(f"  Inventory:          {status['inventory_loaded']:>10,}")
    print(f"  Out of Stock:       {status['out_of_stock']:>10,}")
    print()
    
    print("=" * 80)
    print("📊 View full DAG in Airflow UI: http://localhost:8080")
    print("   Username: admin | Password: AF720HDA")
    print("=" * 80)
    print()
    print("(Refreshing every 30 seconds... Press Ctrl+C to exit)")


def monitor(refresh_interval: int = 30):
    """Monitor DAG runs continuously."""
    try:
        while True:
            try:
                status = get_pipeline_status()
                print_status(status)
                
                if status["is_complete"]:
                    print("\n✓✓✓ PIPELINE COMPLETE ✓✓✓")
                    print(f"All {status['total_users']:,} users have been processed!")
                    break
                
                time.sleep(refresh_interval)
            except KeyboardInterrupt:
                raise
            except Exception as e:
                print(f"Error: {e}")
                time.sleep(5)
    except KeyboardInterrupt:
        print("\n\nMonitoring stopped.")


if __name__ == "__main__":
    refresh = int(sys.argv[1]) if len(sys.argv) > 1 else 30
    monitor(refresh_interval=refresh)
