from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATASET_DIR = PROJECT_ROOT / "datasets" / "master"

REPORT_DIR = PROJECT_ROOT / "reports" / "schema_profile"

REPORT_DIR.mkdir(parents=True, exist_ok=True)