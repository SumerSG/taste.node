"""Fast batch update of all feed_posts author_name via full-row upsert.

This script fetches the full row for every feed_post, replaces author_name,
and upserts back by primary key. Because every non-null column is present,
PostgREST does not violate NOT NULL constraints on the temporary INSERT side
of the upsert.

Usage:
    export SUPABASE_URL=https://your-project.supabase.co
    export SUPABASE_SERVICE_KEY=<service-role-key>
    python scripts/update_names.py
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.generate_synthetic_data import _get_user_name
from supabase import create_client


def main():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY required", file=sys.stderr)
        sys.exit(1)

    client = create_client(url, key)

    # 1. Delete any rows with null author_id
    print("[update] Removing orphaned rows with null author_id...")
    null_resp = client.table("feed_posts").select("id").is_("author_id", "null").execute()
    null_posts = null_resp.data or []
    for p in null_posts:
        client.table("feed_posts").delete().eq("id", p["id"]).execute()
    print(f"[update] Deleted {len(null_posts)} orphaned rows")

    # 2. Fetch *all* columns for every valid post, paginated by 1000
    page = 0
    all_posts = []
    while True:
        resp = (
            client.table("feed_posts")
            .select("*")
            .not_.is_("author_id", "null")
            .range(page * 1000, (page + 1) * 1000 - 1)
            .execute()
        )
        data = resp.data or []
        if not data:
            break
        all_posts.extend(data)
        if len(data) < 1000:
            break
        page += 1

    print(f"[update] Found {len(all_posts)} feed_posts to rename")

    # 3. Compute new author_name for every post, keeping every other field
    batch_size = 200
    total = 0
    errors = 0
    for i in range(0, len(all_posts), batch_size):
        batch = all_posts[i : i + batch_size]
        for post in batch:
            post["author_name"] = _get_user_name(post["author_id"])

        try:
            resp = client.table("feed_posts").upsert(batch, on_conflict="id").execute()
            count = len(resp.data) if resp.data else len(batch)
            total += count
            if (i // batch_size) % 5 == 0 or (i // batch_size) < 3:
                print(
                    f"[update] Batch {i//batch_size + 1}/{(len(all_posts)-1)//batch_size + 1}: {count} rows (total {total})"
                )
        except Exception as exc:
            errors += 1
            print(f"[update] Batch {i//batch_size + 1} failed: {exc}")

    print(f"[update] Done. Updated {total} author names ({errors} errors).")


if __name__ == "__main__":
    main()
