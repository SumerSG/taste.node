-- taste.node — Migration: add public SELECT policies for social data
-- Run this AFTER seed_all_demo_data.py has populated the tables.

-- ─── 1. profiles ───
-- Allow EVERYONE (authenticated + anonymous) to read any profile
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
CREATE POLICY "profiles_select_public"
    ON public.profiles FOR SELECT
    TO authenticated, anon
    USING (true);

-- Keep existing own-row policies for INSERT/UPDATE/DELETE
-- Keep service_role policy for backend operations

-- ─── 2. contexts ───
DROP POLICY IF EXISTS "contexts_select_public" ON public.contexts;
CREATE POLICY "contexts_select_public"
    ON public.contexts FOR SELECT
    TO authenticated, anon
    USING (true);

-- ─── 3. ranked_items ───
DROP POLICY IF EXISTS "ranked_items_select_public" ON public.ranked_items;
CREATE POLICY "ranked_items_select_public"
    ON public.ranked_items FOR SELECT
    TO authenticated, anon
    USING (true);

-- ─── 4. follows ───
DROP POLICY IF EXISTS "follows_select_public" ON public.follows;
CREATE POLICY "follows_select_public"
    ON public.follows FOR SELECT
    TO authenticated, anon
    USING (true);

-- ─── 5. feed_posts (already has public select, but ensure it's explicit) ───
DROP POLICY IF EXISTS "feed_posts_select_public" ON public.feed_posts;
CREATE POLICY "feed_posts_select_public"
    ON public.feed_posts FOR SELECT
    TO authenticated, anon
    USING (true);

-- ─── 6. venues ───
DROP POLICY IF EXISTS "venues_select_public" ON public.venues;
CREATE POLICY "venues_select_public"
    ON public.venues FOR SELECT
    TO authenticated, anon
    USING (true);

-- Note: INSERT/UPDATE/DELETE policies remain user-scoped (only own rows).
--       The public SELECT policies make the app a true social platform
--       where anyone can browse profiles, lists, follows, and posts.
