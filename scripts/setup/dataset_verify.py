from pathlib import Path
from logger import get_logger

logger = get_logger(__name__)

DATASET_DIR = Path("datasets/master")

REQUIRED_FILES = [
    "users.csv",
    "orders.csv",
    "order_items.csv",
    "products.csv",
    "inventory_items.csv",
    "distribution_centers.csv",
    "events.csv"
]

def dataset_verify():
    logger.info("Verifying dataset...")
    missing = []

    for filename in REQUIRED_FILES:
        file_path = DATASET_DIR / filename
        if file_path.exists():
            logger.info(f"✓ {filename}")
        else:
            missing.append(filename)

    if missing:
        logger.error("Dataset verification failed.")
        for file in missing:
            logger.error(f"Missing : {file}")

        raise FileNotFoundError("Dataset verification failed.")

    logger.info("Dataset verification successful.")