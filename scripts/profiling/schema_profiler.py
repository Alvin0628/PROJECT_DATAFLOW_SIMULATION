from pathlib import Path
import pandas as pd
import numpy as np

# ==========================================================
# Configuration
# ==========================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATASET_DIR = PROJECT_ROOT / "datasets" / "master"

REPORT_DIR = PROJECT_ROOT / "reports" / "schema_profile"

REPORT_DIR.mkdir(parents=True, exist_ok=True)


# ==========================================================
# PostgreSQL Type Mapping
# ==========================================================

def suggest_postgres_type(dtype, series):

    if pd.api.types.is_integer_dtype(dtype):
        return "INTEGER"

    if pd.api.types.is_float_dtype(dtype):
        return "NUMERIC(10,2)"

    if pd.api.types.is_bool_dtype(dtype):
        return "BOOLEAN"

    if pd.api.types.is_datetime64_any_dtype(dtype):
        return "TIMESTAMP"

    return "VARCHAR(255)"


# ==========================================================
# Profiling
# ==========================================================

def profile_dataframe(df: pd.DataFrame):

    profile = {}

    profile["rows"] = len(df)
    profile["columns"] = len(df.columns)
    profile["memory_mb"] = round(
        df.memory_usage(deep=True).sum() / 1024 / 1024,
        2
    )

    column_profiles = []

    for col in df.columns:

        s = df[col]

        column_profiles.append({

            "column": col,

            "csv_dtype": str(s.dtype),

            "postgres_type": suggest_postgres_type(
                s.dtype,
                s
            ),

            "null_count": int(s.isna().sum()),

            "null_percent": round(
                s.isna().mean() * 100,
                2
            ),

            "unique_values": int(s.nunique(dropna=True)),

            "duplicate_count":
                int(s.duplicated().sum()),

            "min":
                None if s.empty else (
                    s.min()
                    if pd.api.types.is_numeric_dtype(s)
                    else None
                ),

            "max":
                None if s.empty else (
                    s.max()
                    if pd.api.types.is_numeric_dtype(s)
                    else None
                )
        })

    profile["columns_profile"] = column_profiles

    return profile


# ==========================================================
# Markdown Writer
# ==========================================================

def save_markdown(file_name, profile):

    md = []

    md.append(f"# {file_name}")
    md.append("")

    md.append("## Dataset Summary")
    md.append("")
    md.append(f"- Rows : {profile['rows']}")
    md.append(f"- Columns : {profile['columns']}")
    md.append(f"- Memory : {profile['memory_mb']} MB")
    md.append("")

    md.append("## Column Profiling")
    md.append("")

    md.append("|Column|CSV Type|PostgreSQL|Null|Null %|Unique|Duplicate|Min|Max|")
    md.append("|---|---|---|---:|---:|---:|---:|---:|---:|")

    for c in profile["columns_profile"]:

        md.append(
            f"|{c['column']}|"
            f"{c['csv_dtype']}|"
            f"{c['postgres_type']}|"
            f"{c['null_count']}|"
            f"{c['null_percent']}|"
            f"{c['unique_values']}|"
            f"{c['duplicate_count']}|"
            f"{c['min']}|"
            f"{c['max']}|"
        )

    report_path = REPORT_DIR / f"{Path(file_name).stem}.md"

    report_path.write_text(
        "\n".join(md),
        encoding="utf-8"
    )

    print(f"✓ {report_path.name}")


# ==========================================================
# Main
# ==========================================================

def main():

    csv_files = sorted(DATASET_DIR.glob("*.csv"))

    if not csv_files:
        raise FileNotFoundError(
            f"No CSV files found in {DATASET_DIR}"
        )

    print("=" * 60)
    print("SCHEMA PROFILING")
    print("=" * 60)

    for csv in csv_files:

        print(f"Profiling {csv.name}...")

        df = pd.read_csv(csv)

        profile = profile_dataframe(df)

        save_markdown(csv.name, profile)

    print("")
    print("All profiling reports generated successfully.")


if __name__ == "__main__":
    main()