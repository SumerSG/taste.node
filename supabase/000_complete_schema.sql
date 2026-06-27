-- taste.node — Complete Supabase schema (run once in SQL Editor)
-- Creates all tables + indexes + RLS policies for production

-- ─── 1. profiles ───
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    default_context TEXT NOT NULL DEFAULT 'default',
    include_in_clustering BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "profiles_service_all"
    ON public.profiles FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);

-- ─── 2. contexts (lists) ───
CREATE TABLE IF NOT EXISTS public.contexts (
    context_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (context_id, user_id)
);

ALTER TABLE public.contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contexts_select_own"
    ON public.contexts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "contexts_insert_own"
    ON public.contexts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contexts_update_own"
    ON public.contexts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "contexts_delete_own"
    ON public.contexts FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "contexts_service_all"
    ON public.contexts FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE INDEX idx_contexts_user_id ON public.contexts(user_id);
CREATE INDEX idx_contexts_updated_at ON public.contexts(updated_at);

-- ─── 3. ranked_items ───
CREATE TABLE IF NOT EXISTS public.ranked_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_id TEXT NOT NULL,
    user_id UUID NOT NULL,
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

ALTER TABLE public.ranked_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ranked_items_select_own"
    ON public.ranked_items FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "ranked_items_insert_own"
    ON public.ranked_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ranked_items_update_own"
    ON public.ranked_items FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "ranked_items_delete_own"
    ON public.ranked_items FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "ranked_items_service_all"
    ON public.ranked_items FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE INDEX idx_ranked_items_user_id ON public.ranked_items(user_id);
CREATE INDEX idx_ranked_items_context_id ON public.ranked_items(context_id);
CREATE INDEX idx_ranked_items_user_context ON public.ranked_items(user_id, context_id);

-- ─── 4. venues ───
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

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venues_select_public"
    ON public.venues FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "venues_service_all"
    ON public.venues FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE INDEX idx_venues_cuisines ON public.venues USING GIN (cuisines);
CREATE INDEX idx_venues_dietary_tags ON public.venues USING GIN (dietary_tags);
CREATE INDEX idx_venues_price_tier ON public.venues(price_tier);
CREATE INDEX idx_venues_source ON public.venues(source);

-- ─── 5. feed_posts ───
CREATE TABLE IF NOT EXISTS public.feed_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    text TEXT NOT NULL,
    venue_id TEXT REFERENCES public.venues(id) ON DELETE SET NULL,
    venue_name TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feed_posts_select_public"
    ON public.feed_posts FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "feed_posts_insert_own"
    ON public.feed_posts FOR INSERT
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "feed_posts_update_own"
    ON public.feed_posts FOR UPDATE
    USING (auth.uid() = author_id);

CREATE POLICY "feed_posts_delete_own"
    ON public.feed_posts FOR DELETE
    USING (auth.uid() = author_id);

CREATE POLICY "feed_posts_service_all"
    ON public.feed_posts FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE INDEX idx_feed_posts_author_id ON public.feed_posts(author_id);
CREATE INDEX idx_feed_posts_created_at ON public.feed_posts(created_at DESC);

-- ─── 6. follows ───
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_select_own"
    ON public.follows FOR SELECT
    USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "follows_insert_own"
    ON public.follows FOR INSERT
    WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "follows_delete_own"
    ON public.follows FOR DELETE
    USING (auth.uid() = follower_id);

CREATE POLICY "follows_service_all"
    ON public.follows FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE INDEX idx_follows_following_id ON public.follows(following_id);

-- ─── auto-update trigger for contexts.updated_at ───
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_contexts_updated_at ON public.contexts;
CREATE TRIGGER update_contexts_updated_at
    BEFORE UPDATE ON public.contexts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
