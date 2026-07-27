#!/usr/bin/env python3
"""
Simple query script - dapat dijalankan dari host (tidak perlu docker exec)
Cukup run: python quick_status.py

Menampilkan:
- Berapa user sudah loaded
- Progress %
- Batch mana sekarang
- Estimasi selesai kapan
"""

import sys
sys.path.insert(0, '/opt/airflow')

from scripts.common.postgres import Postgres
from scripts.common.metadata import PipelineMetadata
from scripts.repositories.operational_repository import OperationalRepository
from scripts.common.config import PIPELINE, SCHEMA, SIMULATION


def get_status():
    """Get pipeline status - simple version"""
    try:
        with Postgres() as db:
            metadata = PipelineMetadata(db)
            repo = OperationalRepository(db)
            
            # Query counts
            total_raw = repo.get_total_users_in_raw()
            db.execute(f"SELECT COUNT(*) FROM {SCHEMA['operational']}.users")
            loaded = db.fetchone()[0]
            
            # Get progress
            progress = metadata.validate_progress(PIPELINE['pipeline_name'], total_raw)
            
            return {
                'total_users': total_raw,
                'loaded_users': loaded,
                'batch_number': progress['batch_number'],
                'progress_pct': progress['progress_pct'],
                'is_complete': progress['is_complete'],
                'offset': progress['offset'],
            }
    except Exception as e:
        print(f"Error: {e}")
        return None


def print_status(status):
    """Print status in single line"""
    if not status:
        return
    
    remaining = status['total_users'] - status['loaded_users']
    batches_left = (remaining + SIMULATION['batch_user_size'] - 1) // SIMULATION['batch_user_size']
    time_left = batches_left * 5  # 5 min per batch
    
    print(f"\n{'='*100}")
    print(f"Progress: {status['loaded_users']:,}/{status['total_users']:,} users " +
          f"({status['progress_pct']:.1f}%) | " +
          f"Batch #{status['batch_number']} | " +
          f"Status: {'✓ COMPLETE' if status['is_complete'] else f'~{time_left}min left'}")
    print(f"{'='*100}\n")


if __name__ == "__main__":
    status = get_status()
    if status:
        print_status(status)
        # Print simple line
        print(f"Loaded: {status['loaded_users']:>7,} / Total: {status['total_users']:>7,} | " +
              f"Progress: {status['progress_pct']:>6.1f}% | " +
              f"Batch #{status['batch_number']:>2} | " +
              f"{'COMPLETE ✓' if status['is_complete'] else 'IN PROGRESS'}")
