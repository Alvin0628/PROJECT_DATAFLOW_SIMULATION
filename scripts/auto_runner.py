"""
Continuous auto-runner: Executes incremental loader until all 100K users are processed.
Simulates the 5-minute schedule for testing/demo purposes.
"""

import time
from scripts.common.postgres import Postgres
from scripts.common.metadata import PipelineMetadata
from scripts.repositories.operational_repository import OperationalRepository
from scripts.common.config import PIPELINE
from scripts.common.logger import get_logger
from scripts.loaders.incremental_loader import IncrementalLoader

logger = get_logger(__name__)


def run_continuously(max_runs: int = 20, sleep_between_runs: int = 2):
    """
    Run incremental loader until completion or max_runs.
    
    Args:
        max_runs: Maximum number of runs to execute
        sleep_between_runs: Seconds to wait between runs
    """
    logger.info("=" * 80)
    logger.info("CONTINUOUS AUTO-RUNNER STARTED")
    logger.info("=" * 80)
    
    loader = IncrementalLoader()
    run_count = 0
    
    while run_count < max_runs:
        run_count += 1
        
        logger.info("")
        logger.info("=" * 80)
        logger.info(f"RUN #{run_count}/{max_runs}")
        logger.info("=" * 80)
        
        try:
            # Execute one batch
            loader.run()
            
            # Check if pipeline complete
            with Postgres() as db:
                metadata = PipelineMetadata(db)
                repo = OperationalRepository(db)
                total_users = repo.get_total_users_in_raw()
                progress = metadata.validate_progress(PIPELINE["pipeline_name"], total_users)
                
                logger.info("")
                logger.info("-" * 80)
                logger.info(f"PROGRESS CHECK (After Run #{run_count}):")
                logger.info(f"  Offset: {progress['offset']}/{progress['total']} users")
                logger.info(f"  Progress: {progress['progress_pct']:.2f}%")
                logger.info(f"  Batch #: {progress['batch_number']}")
                logger.info(f"  Complete: {progress['is_complete']}")
                logger.info("-" * 80)
                
                if progress["is_complete"]:
                    logger.info("")
                    logger.info("=" * 80)
                    logger.info("✓✓✓ PIPELINE COMPLETE ✓✓✓")
                    logger.info(f"All {progress['total']} users processed!")
                    logger.info(f"Completed in {run_count} runs")
                    logger.info("=" * 80)
                    return
            
            if run_count < max_runs:
                logger.info(f"Sleeping {sleep_between_runs} seconds before next run...")
                time.sleep(sleep_between_runs)
        
        except Exception as e:
            logger.error(f"Run #{run_count} failed: {str(e)}")
            raise
    
    logger.info("")
    logger.info("=" * 80)
    logger.info(f"Reached max runs ({max_runs}). Pipeline still in progress.")
    logger.info("=" * 80)


if __name__ == "__main__":
    import sys
    max_runs = int(sys.argv[1]) if len(sys.argv) > 1 else 20
    run_continuously(max_runs=max_runs, sleep_between_runs=1)
