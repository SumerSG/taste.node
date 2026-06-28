#!/usr/bin/env python3
"""taste.node — Seed full demo dataset (100K venues + 1000 users + posts) to Supabase.

Usage:
    export SUPABASE_URL=https://your-project.supabase.co
    export SUPABASE_SERVICE_KEY=your-service-role-key
    python scripts/seed_demo_to_supabase.py

Batches:
    Venues:     1000 per batch
    Profiles:   500 per batch
    Contexts:   1000 per batch
    RankedItems: 1000 per batch
    Follows:    1000 per batch
    FeedPosts:  1000 per batch
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from supabase import create_client

from scripts.generate_synthetic_data import generate_profiles


BATCH_SIZE = 1000


def _env(name: str) -> str:
    val = os.environ.get(name)
    if not val:
        print(f"Error: {name} env var required", file=sys.stderr)
        sys.exit(1)
    return val


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def seed_venues(client, venues_json_path: str) -> int:
    with open(venues_json_path, "r", encoding="utf-8") as f:
        venues = json.load(f)

    if not venues:
        return 0

    # Check if venues table already has data
    resp = client.table("venues").select("id", count="exact", head=True).execute()
    existing = getattr(resp, "count", 0) or 0
    if existing >= len(venues):
        print(f"[venues] Table already has {existing} rows, skipping")
        return existing

    rows = []
    for v in venues:
        rows.append(
            {
                "id": v["venue_id"],
                "name": v["name"],
                "address": v.get("address"),
                "location": {"lat": v.get("lat"), "lng": v.get("lng")} if v.get("lat") is not None else None,
                "cuisines": v.get("cuisines") or [],
                "dietary_tags": v.get("dietary_tags") or [],
                "price_tier": v.get("price_tier"),
                "health_score": v.get("health_score"),
                "source": v.get("source", "tabelog"),
                "source_url": v.get("source_url"),
                "image_url": v.get("image_url"),
                "rating": v.get("rating"),
                "review_count": v.get("review_count"),
                "created_at": _now(),
            }
        )

    total = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        resp = client.table("venues").upsert(batch, on_conflict="id").execute()
        count = len(resp.data) if resp.data else 0
        total += count
        print(f"[venues] Upserted batch {i // BATCH_SIZE + 1}: {count} rows")

    print(f"[venues] Total upserted: {total}")
    return total


def seed_profiles_and_contexts(client, profiles: List[Any]) -> int:
    profile_rows = []
    context_rows = []
    ranked_rows = []

    for p in profiles:
        profile_rows.append(
            {
                "user_id": p.user_id,
                "default_context": p.default_context,
                "include_in_clustering": p.include_in_clustering,
                "created_at": _now(),
            }
        )
        for ctx_id, ctx in p.contexts.items():
            context_rows.append(
                {
                    "context_id": ctx_id,
                    "user_id": p.user_id,
                    "name": ctx_id,
                    "created_at": _now(),
                    "updated_at": _now(),
                }
            )
            for item in ctx.ranked_list:
                ranked_rows.append(
                    {
                        "context_id": ctx_id,
                        "user_id": p.user_id,
                        "venue": item.venue.model_dump(mode="json"),
                        "visited_at": item.visited_at.isoformat(),
                        "added_at": item.added_at.isoformat(),
                        "occasion_tag": item.occasion_tag,
                        "is_classic": item.is_classic,
                        "status": item.status,
                        "personal_rating": item.personal_rating,
                        "reaction": item.reaction,
                        "meal_type": item.meal_type,
                        "dishes": item.dishes or [],
                    }
                )

    total_profiles = 0
    for i in range(0, len(profile_rows), BATCH_SIZE):
        batch = profile_rows[i : i + BATCH_SIZE]
        resp = client.table("profiles").upsert(batch, on_conflict="user_id").execute()
        count = len(resp.data) if resp.data else 0
        total_profiles += count
        print(f"[profiles] Upserted batch {i // BATCH_SIZE + 1}: {count} rows")

    total_contexts = 0
    for i in range(0, len(context_rows), BATCH_SIZE):
        batch = context_rows[i : i + BATCH_SIZE]
        resp = client.table("contexts").upsert(batch, on_conflict="context_id,user_id").execute()
        count = len(resp.data) if resp.data else 0
        total_contexts += count
        print(f"[contexts] Upserted batch {i // BATCH_SIZE + 1}: {count} rows")

    total_ranked = 0
    for i in range(0, len(ranked_rows), BATCH_SIZE):
        batch = ranked_rows[i : i + BATCH_SIZE]
        resp = client.table("ranked_items").insert(batch).execute()
        count = len(resp.data) if resp.data else 0
        total_ranked += count
        print(f"[ranked_items] Inserted batch {i // BATCH_SIZE + 1}: {count} rows")

    print(
        f"[data] profiles={total_profiles}, contexts={total_contexts}, ranked_items={total_ranked}"
    )
    return total_profiles


def seed_follows(client, profiles: List[Any]) -> int:
    rows = []
    for p in profiles:
        for target_id in p.following:
            rows.append(
                {
                    "follower_id": p.user_id,
                    "following_id": target_id,
                    "created_at": _now(),
                }
            )

    if not rows:
        return 0

    total = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        resp = client.table("follows").upsert(batch, on_conflict="follower_id,following_id").execute()
        count = len(resp.data) if resp.data else 0
        total += count
        print(f"[follows] Upserted batch {i // BATCH_SIZE + 1}: {count} rows")

    print(f"[follows] Total upserted: {total}")
    return total


def seed_feed_posts(client, profiles: List[Any], venues_json_path: str) -> int:
    with open(venues_json_path, "r", encoding="utf-8") as f:
        all_venues = json.load(f)

    if not all_venues:
        print("[feed_posts] No venues found, skipping")
        return 0

    # Check if feed_posts already has data
    resp = client.table("feed_posts").select("id", count="exact", head=True).execute()
    existing = getattr(resp, "count", 0) or 0
    if existing >= 100:
        print(f"[feed_posts] Table already has {existing} rows, skipping")
        return existing

    import random
    rng = random.Random(42)

    REACTIONS = [
        "Amazing atmosphere and even better food.",
        "My new go-to spot in the area.",
        "Perfect for date night.",
        "Hidden gem — don't skip the specials.",
        "The best I've had this year.",
        "Cozy, warm, and delicious.",
        "A bit pricey but totally worth it.",
        "Great for groups, lively energy.",
        "Incredible service from start to finish.",
        "Will definitely come back.",
        "Spectacular omakase experience.",
        "The broth was next level.",
        "Charming little place with big flavors.",
        "Loved the tasting menu.",
        "Casual vibes, elevated food.",
        "One word: unforgettable.",
    ]

    rows = []
    for p in profiles:
        n_posts = rng.randint(0, 6)
        for _ in range(n_posts):
            v = rng.choice(all_venues)
            rows.append(
                {
                    "author_id": p.user_id,
                    "author_name": p.user_id.replace("_", " ").title(),
                    "text": rng.choice(REACTIONS),
                    "venue_id": v["venue_id"],
                    "venue_name": v["name"],
                    "image_url": v.get("image_url"),
                    "likes": rng.randint(0, 500),
                    "created_at": _now(),
                }
            )

    if not rows:
        return 0

    # Sort most recent first
    rows.sort(key=lambda r: r["created_at"], reverse=True)

    total = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        resp = client.table("feed_posts").insert(batch).execute()
        count = len(resp.data) if resp.data else 0
        total += count
        print(f"[feed_posts] Inserted batch {i // BATCH_SIZE + 1}: {count} rows")

    print(f"[feed_posts] Total inserted: {total}")
    return total


def main() -> None:
    url = _env("SUPABASE_URL")
    key = _env("SUPABASE_SERVICE_KEY")
    client = create_client(url, key)

    print("[seed] Starting full demo seed…")

    # 1. Profiles
    print("[seed] Generating 1000 synthetic profiles…")
    profiles = generate_profiles(seed=42, n_users=1000)
    print(f"[seed] Generated {len(profiles)} profiles")

    # 2. Venues (100K)
    venues_path = "src/data/venues.json"
    seed_venues(client, venues_path)

    # 3. Profiles + contexts + ranked_items
    seed_profiles_and_contexts(client, profiles)

    # 4. Follows
    seed_follows(client, profiles)

    # 5. Feed posts
    seed_feed_posts(client, profiles, venues_path)

    print("[seed] Demo seed complete.")


if __name__ == "__main__":
    main()
