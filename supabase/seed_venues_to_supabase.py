#!/usr/bin/env python3
"""Seed venue data from web/src/data/venues.json into the Supabase venues table."""

import json
import os
import sys

from supabase import create_client


def main():
    # 1. Load environment variables
    try:
        supabase_url = os.environ["SUPABASE_URL"]
        supabase_key = os.environ["SUPABASE_SERVICE_KEY"]
    except KeyError as exc:
        print(
            f"Error: Missing required environment variable {exc}. "
            "Please set SUPABASE_URL and SUPABASE_SERVICE_KEY.",
            file=sys.stderr,
        )
        sys.exit(1)

    # 2. Initialize Supabase client
    try:
        client = create_client(supabase_url, supabase_key)
    except Exception as exc:
        print(f"Error: Failed to initialize Supabase client: {exc}", file=sys.stderr)
        sys.exit(1)

    # 3. Read source data (use backend full dataset, not frontend 10K fallback)
    data_path = os.path.join(
        os.path.dirname(__file__), "..", "src", "data", "venues.json"
    )
    data_path = os.path.abspath(data_path)

    try:
        with open(data_path, "r", encoding="utf-8") as f:
            venues = json.load(f)
    except FileNotFoundError:
        print(f"Error: File not found at {data_path}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as exc:
        print(f"Error: Failed to parse JSON: {exc}", file=sys.stderr)
        sys.exit(1)

    if not isinstance(venues, list):
        print("Error: Expected venues.json to contain a JSON array.", file=sys.stderr)
        sys.exit(1)

    # 4. Transform records
    rows = []
    transform_errors = []

    for idx, item in enumerate(venues):
        try:
            venue_id = item["venue_id"]
            name = item["name"]

            row = {
                "id": venue_id,
                "name": name,
                "address": item.get("address"),
                "location": {
                    "lat": item.get("lat"),
                    "lng": item.get("lng"),
                },
                "cuisines": item.get("cuisines") or [],
                "dietary_tags": item.get("dietary_tags") or [],
                "price_tier": item.get("price_tier"),
                "health_score": item.get("health_score"),
                "source_url": item.get("source_url"),
                "image_url": item.get("image_url"),
                "rating": item.get("rating"),
                "review_count": item.get("review_count"),
            }

            # Only include `source` if present and non-null so the DB default
            # ('synthetic') applies when it is missing.
            if item.get("source"):
                row["source"] = item["source"]

            rows.append(row)
        except KeyError as exc:
            transform_errors.append(
                f"Item at index {idx} is missing required key: {exc}"
            )
        except Exception as exc:
            transform_errors.append(
                f"Item at index {idx} caused an unexpected error: {exc}"
            )

    # 5. Upsert into Supabase in batches to avoid statement timeout
    BATCH_SIZE = 1000
    total_upserted = 0
    if rows:
        for i in range(0, len(rows), BATCH_SIZE):
            batch = rows[i : i + BATCH_SIZE]
            try:
                response = (
                    client.table("venues").upsert(batch, on_conflict="id").execute()
                )
                count = len(response.data) if response.data else 0
                total_upserted += count
                print(f"[batch {i//BATCH_SIZE + 1}] Upserted {count} venues (total {total_upserted})")
            except Exception as exc:
                print(f"Error: Supabase upsert failed at batch {i//BATCH_SIZE + 1}: {exc}", file=sys.stderr)
                sys.exit(1)
        print(f"Successfully upserted {total_upserted} venue(s) total.")
    else:
        print("No valid venue rows to upsert.")

    # 6. Print any transformation errors as part of the summary
    if transform_errors:
        print(f"\nTransform errors ({len(transform_errors)}):")
        for err in transform_errors:
            print(f"  - {err}")


if __name__ == "__main__":
    main()
