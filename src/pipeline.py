"""
Apple Store Liquid Glass Analytics — Python Data Processing Pipeline
COMPROG1 Final Practical Project
Branch: `python` (Maintained by Python Engineering Team)
"""

import json
import re
from pathlib import Path
import numpy as np
import pandas as pd


def parse_product_metadata(product_name: str) -> pd.Series:
    """Extract Model, Series Family, Color Finish, and Storage Capacity from raw SKU string."""
    match = re.match(r"APPLE\s+(.*?)\s+\((.*?),\s*(.*?)\)", str(product_name), re.IGNORECASE)
    if match:
        model = match.group(1).strip()
        color = match.group(2).strip()
        storage = match.group(3).strip()
    else:
        model, color, storage = str(product_name).strip(), "Standard", "Unknown"

    if "iPhone 12" in model:
        series = "iPhone 12 Series"
    elif "iPhone 11" in model:
        series = "iPhone 11 Series"
    elif "iPhone SE" in model:
        series = "iPhone SE"
    elif "iPhone XR" in model:
        series = "iPhone XR"
    elif "iPhone XS" in model:
        series = "iPhone XS Series"
    elif "iPhone 8" in model:
        series = "iPhone 8 Series"
    else:
        series = "Other"

    return pd.Series([model, series, color, storage])


def run_pipeline(csv_path: str = "data/apple_products.csv", output_json: str = "data/processed_apple_data.json") -> dict:
    """Ingest, cleanse, compute sales ratios/KPIs, and export structured JSON for the frontend."""
    raw_path = Path(csv_path)
    if not raw_path.exists():
        raise FileNotFoundError(f"Dataset not found at {raw_path.resolve()}")

    df = pd.read_csv(raw_path)

    # Cleanse string fields & enforce numeric types
    df["Product Name"] = df["Product Name"].astype(str).str.strip()
    df["Ram"] = df["Ram"].astype(str).str.strip()
    numeric_cols = ["Sale Price", "Mrp", "Discount Percentage", "Number Of Ratings", "Number Of Reviews"]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)
    df["Star Rating"] = pd.to_numeric(df["Star Rating"], errors="coerce").fillna(0.0).astype(float)

    # Parse structured attributes
    df[["Model", "Series", "Color", "Storage"]] = df["Product Name"].apply(parse_product_metadata)

    # Derive financial & engagement ratios
    df["Savings"] = df["Mrp"] - df["Sale Price"]
    df["Actual Discount %"] = np.where(df["Mrp"] > 0, ((df["Savings"] / df["Mrp"]) * 100).round(2), 0.0)
    df["Review-to-Rating Ratio (%)"] = np.where(
        df["Number Of Ratings"] > 0,
        ((df["Number Of Reviews"] / df["Number Of Ratings"]) * 100).round(2),
        0.0,
    )
    df["Price per Star"] = np.where(df["Star Rating"] > 0, (df["Sale Price"] / df["Star Rating"]).round(2), 0.0)

    export_cols = [
        "Product Name", "Model", "Series", "Color", "Storage", "Ram",
        "Sale Price", "Mrp", "Discount Percentage", "Savings", "Actual Discount %",
        "Number Of Ratings", "Number Of Reviews", "Review-to-Rating Ratio (%)",
        "Star Rating", "Price per Star", "Upc"
    ]
    records = df[export_cols].to_dict(orient="records")

    out_path = Path(output_json)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)

    summary = {
        "total_skus": int(len(df)),
        "mean_sale_price": round(float(df["Sale Price"].mean()), 2),
        "median_sale_price": round(float(df["Sale Price"].median()), 2),
        "mean_mrp": round(float(df["Mrp"].mean()), 2),
        "mean_discount_pct": round(float(df["Discount Percentage"].mean()), 2),
        "mean_savings": round(float(df["Savings"].mean()), 2),
        "total_ratings": int(df["Number Of Ratings"].sum()),
        "total_reviews": int(df["Number Of Reviews"].sum()),
        "overall_review_to_rating_ratio": round(float(df["Number Of Reviews"].sum() / df["Number Of Ratings"].sum() * 100), 2),
        "mean_star_rating": round(float(df["Star Rating"].mean()), 2),
    }
    return summary


if __name__ == "__main__":
    kpis = run_pipeline()
    print("Pipeline completed successfully. Summary KPIs:")
    print(json.dumps(kpis, indent=2))
