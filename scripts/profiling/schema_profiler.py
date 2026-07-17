from pathlib import Path

import pandas as pd

from config import DATASET_DIR
from config import REPORT_DIR

from profile_utils import infer_semantic_type


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

    columns = []

    for column in df.columns:

        series = df[column]

        semantic_type, postgres_type = infer_semantic_type(
            column,
            series
        )

        minimum = None
        maximum = None

        if pd.api.types.is_numeric_dtype(series):

            minimum = series.min()

            maximum = series.max()

        columns.append({

            "column": column,

            "csv_dtype": str(series.dtype),

            "semantic_type": semantic_type,

            "postgres_type": postgres_type,

            "null_count": int(series.isna().sum()),

            "null_percent": round(
                series.isna().mean() * 100,
                2
            ),

            "unique_values": int(
                series.nunique(dropna=True)
            ),

            "duplicate_count": int(
                series.duplicated().sum()
            ),

            "min": minimum,

            "max": maximum

        })

    profile["columns_profile"] = columns

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

    md.append(
        "|Column|CSV Type|Semantic Type|PostgreSQL|Null|Null %|Unique|Duplicate|Min|Max|"
    )

    md.append(
        "|---|---|---|---|---:|---:|---:|---:|---:|---:|"
    )

    for c in profile["columns_profile"]:

        md.append(

            f"|{c['column']}|"

            f"{c['csv_dtype']}|"

            f"{c['semantic_type']}|"

            f"{c['postgres_type']}|"

            f"{c['null_count']}|"

            f"{c['null_percent']}|"

            f"{c['unique_values']}|"

            f"{c['duplicate_count']}|"

            f"{c['min']}|"

            f"{c['max']}|"

        )

    output = REPORT_DIR / f"{Path(file_name).stem}.md"

    output.write_text(
        "\n".join(md),
        encoding="utf-8"
    )

    print(f"✓ {output.name}")


# ==========================================================
# Main
# ==========================================================

def main():

    csv_files = sorted(DATASET_DIR.glob("*.csv"))

    if not csv_files:

        raise FileNotFoundError(
            f"No CSV found in {DATASET_DIR}"
        )

    print("=" * 60)

    print("SCHEMA PROFILER V2")

    print("=" * 60)

    for csv in csv_files:

        print(f"Profiling {csv.name}")

        df = pd.read_csv(csv)

        profile = profile_dataframe(df)

        save_markdown(csv.name, profile)

    print()

    print("All reports generated successfully.")


if __name__ == "__main__":

    main()