-- taste.node — Full Supabase schema migration (002)
-- Run this in the Supabase SQL Editor to create application tables.

-- ─── profiles ───
-- Extends auth.users with app-specific settings.
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id TEXT PRIMARY KEY,
    default_context TEXT NOT NULL DEFAULT 'default',
    include_in_clustering BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'App user profiles extending Supabase Auth users';

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "profiles_select_own"
    ON public.profiles FOR SELECT
    USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "profiles_insert_own"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "profiles_update_own"
    ON public.profiles FOR UPDATE
    USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "profiles_delete_own"
    ON public.profiles FOR DELETE
    USING (auth.uid()::text = user_id);

-- Service role bypass (for seed scripts)
CREATE POLICY IF NOT EXISTS "profiles_service_all"
    ON public.profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);


-- ─── contexts ───
-- A "list" owned by a user. Composite PK on (context_id, user_id).
CREATE TABLE IF NOT EXISTS public.contexts (
    context_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (context_id, user_id)
);

COMMENT ON TABLE public.contexts IS 'User taste contexts / ranked lists';

ALTER TABLE public.contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "contexts_select_own"
    ON public.contexts FOR SELECT
    USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "contexts_insert_own"
    ON public.contexts FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "contexts_update_own"
    ON public.contexts FOR UPDATE
    USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "contexts_delete_own"
    ON public.contexts FOR DELETE
    USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "contexts_service_all"
    ON public.contexts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_contexts_user_id ON public.contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_contexts_updated_at ON public.contexts(updated_at);


-- ─── ranked_items ───
-- Restaurants inside a context (list).
CREATE TABLE IF NOT EXISTS public.ranked_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    venue JSONB NOT NULL DEFAULT '{}',
    visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    occasion_tag TEXT NOT NULL DEFAULT 'solo',
    is_classic BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT,
    personal_rating INTEGER,
    reaction TEXT,
    meal_type TEXT,
    dishes TEXT[] DEFAULT '{}',
    FOREIGN KEY (context_id, user_id) REFERENCES public.contexts(context_id, user_id) ON DELETE CASCADE
);

COMMENT ON TABLE public.ranked_items IS 'Ranked venue items inside a taste context';

ALTER TABLE public.ranked_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "ranked_items_select_own"
    ON public.ranked_items FOR SELECT
    USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "ranked_items_insert_own"
    ON public.ranked_items FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "ranked_items_update_own"
    ON public.ranked_items FOR UPDATE
    USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "ranked_items_delete_own"
    ON public.ranked_items FOR DELETE
    USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "ranked_items_service_all"
    ON public.ranked_items
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ranked_items_user_id ON public.ranked_items(user_id);
CREATE INDEX IF NOT EXISTS idx_ranked_items_context_id ON public.ranked_items(context_id);
CREATE INDEX IF NOT EXISTS idx_ranked_items_user_context ON public.ranked_items(user_id, context_id);
CREATE INDEX IF NOT EXISTS idx_ranked_items_visited_at ON public.ranked_items(visited_at);


-- ─── venues ───
-- Global venue catalogue. 001_venues.sql may have already created the table.
CREATE TABLE IF NOT EXISTS public.venues (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    location JSONB,
    cuisines TEXT[] DEFAULT '{}',
    dietary_tags TEXT[] DEFAULT '{}',
    price_tier INTEGER,
    health_score FLOAT,
    source TEXT NOT NULL DEFAULT 'synthetic',
    source_url TEXT,
    image_url TEXT,
    rating FLOAT,
    review_count INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add created_at if migrating from 001_venues.sql that lacked it
ALTER TABLE public.venues
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON TABLE public.venues IS 'Global venue pool for recommendations';

-- Venues are public read, service-role write
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "venues_select_all"
    ON public.venues FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY IF NOT EXISTS "venues_service_all"
    ON public.venues
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_venues_cuisines ON public.venues USING GIN (cuisines);
CREATE INDEX IF NOT EXISTS idx_venues_dietary_tags ON public.venues USING GIN (dietary_tags);
CREATE INDEX IF NOT EXISTS idx_venues_price_tier ON public.venues(price_tier);
CREATE INDEX IF NOT EXISTS idx_venues_source ON public.venues(source);


-- ─── feed_posts ───
-- Social feed. Public read; authors can CRUD their own.
CREATE TABLE IF NOT EXISTS public.feed_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    text TEXT NOT NULL,
    venue_id TEXT REFERENCES public.venues(id) ON DELETE SET NULL,
    venue_name TEXT,
    image_url TEXT,
    likes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.feed_posts IS 'Social feed posts';

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "feed_posts_select_public"
    ON public.feed_posts FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY IF NOT EXISTS "feed_posts_insert_own"
    ON public.feed_posts FOR INSERT
    WITH CHECK (auth.uid()::text = author_id);

CREATE POLICY IF NOT EXISTS "feed_posts_update_own"
    ON public.feed_posts FOR UPDATE
    USING (auth.uid()::text = author_id);

CREATE POLICY IF NOT EXISTS "feed_posts_delete_own"
    ON public.feed_posts FOR DELETE
    USING (auth.uid()::text = author_id);

CREATE POLICY IF NOT EXISTS "feed_posts_service_all"
    ON public.feed_posts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_feed_posts_author_id ON public.feed_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at ON public.feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_venue_id ON public.feed_posts(venue_id);


-- ─── follows ───
-- Social graph: follower_id -> following_id.
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id TEXT NOT NULL,
    following_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

COMMENT ON TABLE public.follows IS 'Social follow relationships';

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Users can only see follows they are part of
CREATE POLICY IF NOT EXISTS "follows_select_own"
    ON public.follows FOR SELECT
    USING (
        auth.uid()::text = follower_id
        OR auth.uid()::text = following_id
    );

CREATE POLICY IF NOT EXISTS "follows_insert_own"
    ON public.follows FOR INSERT
    WITH CHECK (auth.uid()::text = follower_id);

CREATE POLICY IF NOT EXISTS "follows_delete_own"
    ON public.follows FOR DELETE
    USING (auth.uid()::text = follower_id);

CREATE POLICY IF NOT EXISTS "follows_service_all"
    ON public.follows
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);


-- ─── Trigger to auto-update contexts.updated_at ───
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_contexts_updated_at ON public.contexts;
CREATE TRIGGER update_contexts_updated_at
    BEFORE UPDATE ON public.contexts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
