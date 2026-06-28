#!/usr/bin/env python3
"""Generate SQL to seed realistic like counts into feed_posts.

Run this locally, then paste the output into Supabase SQL Editor.

    source .venv/bin/activate
    python scripts/generate_likes_sql.py > /tmp/likes_seed.sql
    # Copy contents of /tmp/likes_seed.sql into Supabase SQL Editor → Run
"""

import os
import sys
import uuid
import random

try:
    from supabase import create_client
except ImportError as exc:  # pragma: no cover
    print("supabase not installed: pip install supabase")
    raise SystemExit(1) from exc

URL = os.environ.get("SUPABASE_URL")
KEY = os.environ.get("SUPABASE_SERVICE_KEY")
if not URL or not KEY:
    print("Error: set SUPABASE_URL and SUPABASE_SERVICE_KEY")
    raise SystemExit(1)

client = create_client(URL, KEY)


def generate_like_tier(post_id: str) -> int:
    seed = int(uuid.UUID(post_id).int % (2**32))
    rng = random.Random(seed)
    roll = rng.randint(0, 100)
    if roll < 45:
        return rng.randint(0, 50)
    elif roll < 75:
        return rng.randint(50, 300)
    elif roll < 93:
        return rng.randint(300, 1200)
    elif roll < 99:
        return rng.randint(1200, 5000)
    else:
        return rng.randint(5000, 25000)


def fetch_all_posts() -> list[dict]:
    all_rows: list[dict] = []
    start = 0
    batch = 1000
    while True:
        resp = (
            client.table("feed_posts")
            .select("id,likes")
            .range(start, start + batch - 1)
            .execute()
        )
        rows = resp.data or []
        if not rows:
            break
        all_rows.extend(rows)
        if len(rows) < batch:
            break
        start += batch
    return all_rows


def main() -> None:  # noqa: D401
    rows = fetch_all_posts()
    if not rows:
        print("-- No posts found.")
        return

    # Partition into chunks of 500 so each SQL statement stays manageable
    CHUNK = 500
    print("-- Auto-generated likes seed")
    print(f"-- {len(rows)} posts")
    print("BEGIN;")

    for start in range(0, len(rows), CHUNK):
        chunk = rows[start : start + CHUNK]
        cases: list[str] = []
        for row in chunk:
            pid = row["id"]
            likes = generate_like_tier(pid)
            # Escape single quotes in UUID just in case (UUIDs don't have them)
            cases.append(f"    WHEN '{pid}' THEN {likes}")
        pids = ", ".join(f"'{r['id']}'" for r in chunk)
        print(f"UPDATE public.feed_posts")
        print(f"  SET likes = CASE id")
        print("\n".join(cases))
        print(f"  END")
        print(f"  WHERE id IN ({pids});")

    print("COMMIT;")
    print(f"-- Done. {len(rows)} rows updated.")


if __name__ == "__main__":
    if sys.version_info < (3, 12):
        print("-- Python 3.12+ recommended")
    main()
