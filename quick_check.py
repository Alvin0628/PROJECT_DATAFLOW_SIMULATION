#!/usr/bin/env python3
"""
Quick Validation Checklist

Use this as a quick reference to verify your incremental loading pipeline.
Run after bootstrap/setup is complete, and after each batch.
"""

import sys
sys.path.insert(0, '/opt/airflow')

from scripts.common.postgres import Postgres
from scripts.common.config import SCHEMA, PIPELINE, SIMULATION
from scripts.repositories.operational_repository import OperationalRepository
from scripts.common.metadata import PipelineMetadata

def check_all():
    print("\n" + "=" * 80)
    print("QUICK VALIDATION CHECKLIST")
    print("=" * 80)
    
    with Postgres() as db:
        repo = OperationalRepository(db)
        metadata = PipelineMetadata(db)
        
        # ====================================================================
        # 1. DATA VOLUMES
        # ====================================================================
        print("\n[1] DATA VOLUMES")
        print("-" * 80)
        
        db.execute(f"SELECT COUNT(*) FROM {SCHEMA['raw']}.users;")
        raw_users = db.fetchone()[0]
        
        db.execute(f"SELECT COUNT(*) FROM {SCHEMA['operational']}.users;")
        op_users = db.fetchone()[0]
        
        db.execute(f"SELECT COUNT(*) FROM {SCHEMA['raw']}.orders;")
        raw_orders = db.fetchone()[0]
        
        db.execute(f"SELECT COUNT(*) FROM {SCHEMA['operational']}.orders;")
        op_orders = db.fetchone()[0]
        
        print(f"  Raw Users:          {raw_users:,}")
        print(f"  Operational Users:  {op_users:,} ({op_users/raw_users*100:.1f}%)")
        print(f"  Raw Orders:         {raw_orders:,}")
        print(f"  Operational Orders: {op_orders:,} ({op_orders/raw_orders*100:.1f}%)")
        
        # ====================================================================
        # 2. PIPELINE PROGRESS
        # ====================================================================
        print("\n[2] PIPELINE PROGRESS")
        print("-" * 80)
        
        state = metadata.get(PIPELINE['pipeline_name'])
        progress = metadata.validate_progress(PIPELINE['pipeline_name'], raw_users)
        
        print(f"  Current Offset:    {progress['offset']:,}")
        print(f"  Total Users:       {progress['total']:,}")
        print(f"  Progress:          {progress['progress_pct']:.2f}%")
        print(f"  Batch Number:      {progress['batch_number']}")
        print(f"  Status:            {'✓ COMPLETE' if progress['is_complete'] else 'IN PROGRESS'}")
        
        # ====================================================================
        # 3. FK INTEGRITY (Spot Check)
        # ====================================================================
        print("\n[3] FK INTEGRITY (Spot Check)")
        print("-" * 80)
        
        # Orders → Users
        db.execute(f"""
            SELECT COUNT(*) FROM {SCHEMA['operational']}.orders o
            WHERE NOT EXISTS (SELECT 1 FROM {SCHEMA['operational']}.users u WHERE u.id = o.user_id);
        """)
        orphaned_orders = db.fetchone()[0]
        print(f"  Orders orphaned:   {orphaned_orders} {'✓' if orphaned_orders == 0 else '✗'}")
        
        # Order Items → Inventory
        db.execute(f"""
            SELECT COUNT(*) FROM {SCHEMA['operational']}.order_items oi
            WHERE NOT EXISTS (SELECT 1 FROM {SCHEMA['operational']}.inventory_items i WHERE i.id = oi.inventory_item_id);
        """)
        orphaned_items = db.fetchone()[0]
        print(f"  Order Items orphaned: {orphaned_items} {'✓' if orphaned_items == 0 else '✗'}")
        
        # ====================================================================
        # 4. DUPLICATES (Spot Check)
        # ====================================================================
        print("\n[4] DUPLICATES (Spot Check)")
        print("-" * 80)
        
        db.execute(f"""
            SELECT COUNT(*) FROM (
                SELECT id FROM {SCHEMA['operational']}.users GROUP BY id HAVING COUNT(*) > 1
            ) t;
        """)
        dupe_users = db.fetchone()[0]
        print(f"  Duplicate users:   {dupe_users} {'✓' if dupe_users == 0 else '✗'}")
        
        db.execute(f"""
            SELECT COUNT(*) FROM (
                SELECT order_id FROM {SCHEMA['operational']}.orders GROUP BY order_id HAVING COUNT(*) > 1
            ) t;
        """)
        dupe_orders = db.fetchone()[0]
        print(f"  Duplicate orders:  {dupe_orders} {'✓' if dupe_orders == 0 else '✗'}")
        
        # ====================================================================
        # 5. OUT-OF-STOCK ITEMS
        # ====================================================================
        print("\n[5] OUT-OF-STOCK ITEMS")
        print("-" * 80)
        
        db.execute(f"SELECT COUNT(*) FROM {SCHEMA['operational']}.order_items_out_of_stock;")
        oos_count = db.fetchone()[0]
        
        if oos_count > 0:
            db.execute(f"""
                SELECT reason, COUNT(*) FROM {SCHEMA['operational']}.order_items_out_of_stock
                GROUP BY reason ORDER BY count DESC;
            """)
            rows = db.fetchall()
            for reason, count in rows:
                print(f"  {reason}: {count:,}")
        else:
            print(f"  No out-of-stock items")
        
        # ====================================================================
        # 6. COMPLETION STATUS
        # ====================================================================
        print("\n[6] COMPLETION STATUS")
        print("-" * 80)
        
        if progress['is_complete']:
            print(f"  ✓ PIPELINE COMPLETE!")
            print(f"    All {raw_users:,} users have been loaded")
        else:
            remaining = raw_users - progress['offset']
            batches_left = (remaining + SIMULATION['batch_user_size'] - 1) // SIMULATION['batch_user_size']
            time_left_minutes = batches_left * 5  # Each batch runs every 5 minutes
            
            print(f"  Pipeline in progress:")
            print(f"    Remaining users:   {remaining:,}")
            print(f"    Batches left:      {batches_left}")
            print(f"    Est. time left:    ~{time_left_minutes} minutes")
        
        print("\n" + "=" * 80)


if __name__ == "__main__":
    try:
        check_all()
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
