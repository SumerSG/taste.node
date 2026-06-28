#!/usr/bin/env python3
"""Seed realistic like counts to Supabase feed_posts.

Power-law distribution (just like real social feeds):
  - 45%  → 0–50 likes      (casual posts)
  - 30%  → 50–300 likes    (popular posts)
  - 18%  → 300–1200 likes  (trending posts)
  - 6%   → 1200–5000 likes (viral posts)
  - 1%   → 5000–25000 likes (super-viral)

Run:
  source .venv/bin/activate
  SUPABASE_URL=https://zhygstfypymsspfinhqc.supabase.co \
  SUPABASE_SERVICE_KEY=YOUR_KEY \
  python scripts/seed_likes_to_supabase.py
"""

import os
import sys
import uuid
import random
from collections import Counter

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
    """Deterministic power-law tier from post UUID."""
    # Convert UUID string to a stable numeric seed
    seed = int(uuid.UUID(post_id).int % (2**32))
    rng = random.Random(seed)
    roll = rng.randint(0, 100)

    if roll < 45:                           # Tier 1: casual
        return rng.randint(0, 50)
    elif roll < 75:                         # Tier 2: popular
        return rng.randint(50, 300)
    elif roll < 93:                         # Tier 3: trending
        return rng.randint(300, 1200)
    elif roll < 99:                         # Tier 4: viral
        return rng.randint(1200, 5000)
    else:                                   # Tier 5: super-viral
        return rng.randint(5000, 25000)


def fetch_all_posts() -> list[dict]:
    """Paginate through feed_posts."""
    all_rows: list[dict] = []
    start = 0
    batch = 1000
    while True:
        resp = (
            client.table("feed_posts")
            .select("id")
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
    # ── column-existence guard ──
    try:
        check = client.table("feed_posts").select("likes").limit(1).execute()
        _ = check.data
    except Exception as e:
        msg = str(e).lower()
        if "likes" in msg and "does not exist" in msg:
            print(
                "\n[ERROR] The `likes` column does not exist on `feed_posts`.\n"
                "        Run this in the Supabase SQL Editor first:\n\n"
                "        ALTER TABLE public.feed_posts\n"
                "            ADD COLUMN IF NOT EXISTS likes INTEGER NOT NULL DEFAULT 0;\n\n"
                "        Or apply the full migration:\n"
                "        supabase/migrations/005_full_likes_schema.sql\n"
            )
            raise SystemExit(1) from e
        raise

    rows = fetch_all_posts()
    print(f"Fetched {len(rows)} posts")

    # Build payload
    updates: list[dict] = []
    tiers = Counter()

    for row in rows:
        post_id = row["id"]
        likes = generate_like_tier(post_id)

        if likes < 50:
            tiers["casual (0-50)"] += 1
        elif likes < 300:
            tiers["popular (50-300)"] += 1
        elif likes < 1200:
            tiers["trending (300-1200)"] += 1
        elif likes < 5000:
            tiers["viral (1200-5000)"] += 1
        else:
            tiers["super-viral (5k-25k)"] += 1

        updates.append({"id": post_id, "likes": likes})

    print("\nDistribution preview:")
    for tier, count in sorted(tiers.items()):
        pct = count / len(rows) * 100
        print(f"  {tier}: {count} ({pct:.1f}%)")

    confirm = input("\nType 'yes' to apply updates: ")
    if confirm.strip().lower() != "yes":
        print("Aborted.")
        return

    # Batch upsert (100 at a time)
    batch_size = 100
    for i in range(0, len(updates), batch_size):
        chunk = updates[i : i + batch_size]
        # Supabase .upsert on feed_posts by PK (id)
        client.table("feed_posts").upsert(chunk).execute()
        print(f"  Updated {i + len(chunk)} / {len(updates)}")

    print("\nDone. All posts now have realistic like counts.")


if __name__ == "__main__":
    if sys.version_info < (3, 12):
        print("Python 3.12+ recommended")
    main()
