# taste.node — Migration Guide: SQLite to Supabase (Demo & Production)

## Overview

This document explains how to migrate from local SQLite to Supabase Postgres, and how the
demo dataset (100K venues, 1000 synthetic users, feed posts) is seeded.

## Schema Alignment

All user-data tables now use `TEXT` for `user_id` instead of `UUID`.  This avoids friction
between:
- **Real Supabase Auth users** (UUID strings like `a1b2c3d4-...`)
- **Demo/synthetic users** (arbitrary strings like `user_001`, `alex_12`)

RLS policies cast `auth.uid()` to text: `(auth.uid()::text = user_id)`.

### Tables affected
- `profiles`
- `contexts`
- `ranked_items`
- `feed_posts`
- `follows`

### Removed constraints
- `REFERENCES auth.users(id)` FKs removed from demo tables (keeps seeding simple)
- If you later require strict auth integration, re-add the FK via:
  ```sql
  ALTER TABLE public.profiles
    ALTER COLUMN user_id TYPE UUID,
    ADD CONSTRAINT fk_profiles_auth_users
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  ```

## One-time setup

Run the complete schema in Supabase SQL Editor:

```sql
-- Paste entire contents of supabase/000_complete_schema.sql
-- This creates all tables, indexes, RLS policies, and triggers.
```

## Seeding 100K venues

```bash
# 1. Set credentials
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_KEY=sb_service_role_...

# 2. Seed venues (batched, 1000 per request)
python scripts/seed_venues_to_supabase.py
```

The backend also auto-seeds venues on first `/venues` call if the table is empty
(`src/supabase_db.py::seed_venues_if_empty`).

## Seeding 1000 demo users + posts

```bash
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_KEY=sb_service_role_...

# Seeds profiles, contexts, ranked_items, follows, feed_posts
python scripts/seed_demo_to_supabase.py
```

**Expected counts:**
- venues: ~100,000
- profiles: 1,000
- contexts: ~3,000
- ranked_items: ~8,000
- follows: ~10,000
- feed_posts: ~3,000

## Local dev (SQLite fallback)

No Supabase credentials required.  The app auto-falls back to SQLite:

```bash
uvicorn src.main:app --reload
```

SQLite stores the same data shape but with flat columns for `ranked_items.venue_*`
(preserved for backward compatibility with existing tests).

## Frontend data loading order

`web/src/data/venues.ts::loadVenues()` tries (in order):
1. **Backend API** (`VITE_API_URL` set) — fetches from FastAPI
2. **Supabase** (`VITE_SUPABASE_*` set + real credentials) — fetches from Postgres
3. **Bundled fallback** (`venues.json`) — 10K venues for guest/offline mode

## Rolling schema changes

If you modify `000_complete_schema.sql`, also update `002_full_schema.sql` (migration
version for incremental deployments).

---

*Last updated: 2026-06-28*
