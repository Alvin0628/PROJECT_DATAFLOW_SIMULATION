from pathlib import Path
import zipfile

from logger import get_logger

logger = get_logger(__name__)
DATASET_DIR = Path("datasets/master")

def extract_dataset():
    csv_files = list(DATASET_DIR.glob("*.csv"))
    if csv_files:
        logger.info("Data already extracted. Skip extraction.")
        return

    zip_files = list(DATASET_DIR.glob("*.zip"))
    if not zip_files:
        raise FileNotFoundError("Dataset (.zip) not found.")

    zip_path = zip_files[0]
    logger.info(f"Extracting {zip_path.name}...")

    with zipfile.ZipFile(zip_path, "r") as zip_ref:
        zip_ref.extractall(DATASET_DIR)

    logger.info("Extraction completed.")