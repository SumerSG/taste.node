# taste.node — Supabase Seeding Guide

## Files

- **`seed_all.sh`** — one-command runner (bash). Runs everything in order.
- **`seed_venues_to_supabase.py`** — pushes 100K venues to Supabase `venues` table.
- **`seed_demo_to_supabase.py`** — pushes 1000 synthetic users, contexts, ranked items, follows, and ~3K feed posts.
- **`generate_japan_venues.py`** — deterministic generator for 100K Japan-wide venues (no network calls).
- **`generate_synthetic_data.py`** — deterministic generator for 1000 synthetic TasteProfiles.

## Prerequisites

Set your Supabase credentials as environment variables:

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="sb_service_role_..."
```

> **Never commit the service role key.** It bypasses RLS.

## Option A — One command

```bash
./supabase/seed_all.sh
```

This regenerates venues (if needed), seeds venues, then seeds users + posts.

## Option B — Step by step

```bash
# 1. Generate 100K venues (idempotent, deterministic)
python supabase/generate_japan_venues.py

# 2. Seed venues (batched, ~100MB total)
python supabase/seed_venues_to_supabase.py

# 3. Seed demo users + posts (batched)
python supabase/seed_demo_to_supabase.py
```

## Expected counts after seeding

| Table | Count |
|---|---|
| `venues` | ~100,000 |
| `profiles` | 1,000 |
| `contexts` | ~3,000 |
| `ranked_items` | ~8,000 |
| `follows` | ~10,000 |
| `feed_posts` | ~3,000 |

## Notes

- Both seed scripts check whether data already exists and skip if counts look healthy.
- `venues` and `feed_posts` tables are public read; all other tables enforce RLS.
- The backend auto-seeds venues on first `/venues` call if the table is empty, but running this script is faster.

## Schema prerequisite

Before running seeds, ensure the schema exists in Supabase:

```sql
-- Open Supabase SQL Editor and paste the entire contents of:
-- supabase/000_complete_schema.sql
```

This creates tables, indexes, triggers, and RLS policies.
