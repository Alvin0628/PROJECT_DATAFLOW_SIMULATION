from pathlib import Path
import subprocess

from logger import get_logger

logger = get_logger(__name__)
DATASET = "mustafakeser4/looker-ecommerce-bigquery-dataset"
OUTPUT_DIR = Path("datasets/master")

def download_dataset():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    zip_files = list(OUTPUT_DIR.glob("*.zip"))

    if zip_files:
        logger.info("Dataset (.zip) already exists. Skip download!")
        return

    logger.info("Downloading dataset...")
    subprocess.run(
        [
            "kaggle",
            "datasets",
            "download",
            "-d",
            DATASET,
            "-p",
            str(OUTPUT_DIR)
        ],
        check=True
    )
    logger.info("Download completed.")