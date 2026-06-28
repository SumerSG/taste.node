-- taste.node — Apply ALL public SELECT policies (run once in Supabase SQL Editor)
-- After this, the frontend can read profiles, contexts, ranked_items, follows,
-- feed_posts, and venues without being authenticated as that specific user.
-- INSERT/UPDATE/DELETE still enforce user ownership.

-- ─── 1. profiles ───
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT
  TO authenticated, anon
  USING (true);

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

-- ─── 5. feed_posts (public select was already in 000_complete_schema.sql,
--    but recreate here to be safe) ───
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

-- Note: Insert/Update/Delete policies remain per-user (auth.uid()::text = user_id).
