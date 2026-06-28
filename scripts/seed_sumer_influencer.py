#!/usr/bin/env python3
"""Seed follower relationships so sumer_aiand is an influencer.

Usage:
    export SUPABASE_URL=...
    export SUPABASE_SERVICE_KEY=...
    python scripts/seed_sumer_influencer.py
"""
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, List

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from supabase import create_client


def _env(name: str) -> str:
    val = os.environ.get(name)
    if not val:
        print(f"Error: {name} env var required", file=sys.stderr)
        sys.exit(1)
    return val


def ensure_sumer_profile(client) -> None:
    """Insert sumer_aiand profile if not exists."""
    check = client.table("profiles").select("user_id").eq("user_id", "sumer_aiand").execute()
    if check.data:
        print("[sumer] Profile already exists")
        return

    client.table("profiles").insert({
        "user_id": "sumer_aiand",
        "default_context": "default",
        "include_in_clustering": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }).execute()
    client.table("contexts").insert({
        "context_id": "default",
        "user_id": "sumer_aiand",
        "name": "default",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).execute()
    print("[sumer] Created sumer_aiand profile + context")


def get_profile_ids(client) -> List[str]:
    """Fetch all existing profile IDs (paginated)."""
    ids: List[str] = []
    start = 0
    batch = 1000
    while True:
        resp = client.table("profiles").select("user_id").range(start, start + batch - 1).execute()
        batch_ids = [r["user_id"] for r in resp.data]
        if not batch_ids:
            break
        ids.extend(batch_ids)
        if len(batch_ids) < batch:
            break
        start += batch
    return ids


def seed_followers(client, follower_ids: List[str], target_id: str = "sumer_aiand") -> int:
    """Insert follow rows so every follower_ids follows target_id (deduped)."""
    rows = []
    existing_resp = client.table("follows").select("follower_id").eq("following_id", target_id).execute()
    existing: set[str] = {r["follower_id"] for r in existing_resp.data or []}

    for fid in follower_ids:
        if fid == target_id:
            continue
        if fid in existing:
            continue
        rows.append({
            "follower_id": fid,
            "following_id": target_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    if not rows:
        print(f"[follows] No new followers to insert for {target_id}")
        return 0

    BATCH = 1000
    total = 0
    for i in range(0, len(rows), BATCH):
        batch = rows[i:i + BATCH]
        resp = client.table("follows").upsert(batch, on_conflict="follower_id,following_id").execute()
        count = len(resp.data) if resp.data else 0
        total += count
        print(f"[follows] Inserted batch {i // BATCH + 1}: {count} rows")

    print(f"[follows] Total new followers for {target_id}: {total}")
    return total


def seed_sumer_posts(client, n_posts: int = 20) -> int:
    """Insert posts by sumer_aiand using real venue images."""
    check = client.table("feed_posts").select("id", count="exact", head=True).eq("author_id", "sumer_aiand").execute()
    existing = getattr(check, "count", 0) or 0
    if existing >= n_posts:
        print(f"[feed_posts] sumer_aiand already has {existing} posts, skipping")
        return existing

    # Pick random venues
    venues_resp = client.table("venues").select("id, name, image_url").limit(n_posts * 2).execute()
    venues = venues_resp.data or []
    if not venues:
        print("[feed_posts] No venues found, skipping")
        return 0

    reactions = [
        "My new go-to spot in the area.",
        "Hidden gem — don't skip the specials.",
        "The best I've had this year.",
        "Incredible service from start to finish.",
        "Will definitely come back.",
        "One word: unforgettable.",
        "Cozy, warm, and delicious.",
        "A bit pricey but totally worth it.",
        "Great for groups, lively energy.",
        "Charming little place with big flavors.",
    ]

    rows = []
    for i, v in enumerate(venues[:n_posts]):
        rows.append({
            "author_id": "sumer_aiand",
            "author_name": "Sumer",
            "text": reactions[i % len(reactions)],
            "venue_id": v["id"],
            "venue_name": v["name"],
            "image_url": v.get("image_url") or f"https://picsum.photos/seed/{v['id']}/600/400",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    resp = client.table("feed_posts").insert(rows).execute()
    count = len(resp.data) if resp.data else 0
    print(f"[feed_posts] Inserted {count} posts for sumer_aiand")
    return count


def main() -> None:
    url = _env("SUPABASE_URL")
    key = _env("SUPABASE_SERVICE_KEY")
    client = create_client(url, key)

    print("[seed] Ensuring sumer_aiand profile exists...")
    ensure_sumer_profile(client)

    print("[seed] Fetching existing profiles...")
    all_ids = get_profile_ids(client)
    print(f"[seed] Found {len(all_ids)} profiles")

    print("[seed] Seeding follows...")
    seed_followers(client, all_ids, target_id="sumer_aiand")

    print("[seed] Seeding sumer posts...")
    seed_sumer_posts(client, n_posts=20)

    print("[seed] Done.")


if __name__ == "__main__":
    main()
