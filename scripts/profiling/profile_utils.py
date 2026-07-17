from __future__ import annotations

import pandas as pd


# ==========================================================
# Semantic Type Detection
# ==========================================================

def infer_semantic_type(column_name: str, series: pd.Series):

    name = column_name.lower()

    # ------------------------------------------------------
    # Identifier
    # ------------------------------------------------------

    if name == "id" or name.endswith("_id"):
        return "Identifier", "INTEGER"

    # ------------------------------------------------------
    # Timestamp
    # ------------------------------------------------------

    datetime_keywords = [
        "_at",
        "created",
        "updated",
        "deleted",
        "returned",
        "shipped",
        "delivered",
        "sold",
        "timestamp",
        "datetime",
        "date",
        "time"
    ]

    if any(keyword in name for keyword in datetime_keywords):

        try:

            pd.to_datetime(series.dropna(), errors="raise")

            return "Timestamp", "TIMESTAMP"

        except Exception:

            pass

    # ------------------------------------------------------
    # Coordinates
    # ------------------------------------------------------

    if "latitude" in name:
        return "Coordinate", "DOUBLE PRECISION"

    if "longitude" in name:
        return "Coordinate", "DOUBLE PRECISION"

    # ------------------------------------------------------
    # Currency
    # ------------------------------------------------------

    currency_keywords = [
        "price",
        "cost",
        "amount",
        "sales",
        "revenue",
        "profit"
    ]

    if any(keyword in name for keyword in currency_keywords):
        return "Currency", "NUMERIC(10,2)"

    # ------------------------------------------------------
    # Age
    # ------------------------------------------------------

    if name == "age":
        return "Age", "SMALLINT"

    # ------------------------------------------------------
    # Postal Code
    # ------------------------------------------------------

    if "postal_code" in name:
        return "Postal Code", "VARCHAR(20)"

    # ------------------------------------------------------
    # Email
    # ------------------------------------------------------

    if "email" in name:
        return "Email", "VARCHAR(255)"

    # ------------------------------------------------------
    # SKU
    # ------------------------------------------------------

    if "sku" in name:
        return "SKU", "VARCHAR(100)"

    # ------------------------------------------------------
    # Integer
    # ------------------------------------------------------

    if pd.api.types.is_integer_dtype(series):
        return "Integer", "INTEGER"

    # ------------------------------------------------------
    # Float
    # ------------------------------------------------------

    if pd.api.types.is_float_dtype(series):
        return "Float", "DOUBLE PRECISION"

    # ------------------------------------------------------
    # Boolean
    # ------------------------------------------------------

    if pd.api.types.is_bool_dtype(series):
        return "Boolean", "BOOLEAN"

    return "Text", "VARCHAR(255)"