-- taste.node — Supabase diagnostic queries
-- Run these in Supabase SQL Editor to verify data health.

-- ─── 1. Check all tables + row counts ───
SELECT 
  schemaname || '.' || tablename AS table_name,
  pg_catalog.pg_total_relation_size(schemaname || '.' || tablename) AS size_bytes
FROM pg_catalog.pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ─── 2. Check feed_posts has likes column ───
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'feed_posts' AND table_schema = 'public';

-- ─── 3. Row counts per table ───
SELECT 'profiles'    as table_name, count(*) as rows FROM public.profiles
UNION ALL SELECT 'contexts',     count(*) FROM public.contexts
UNION ALL SELECT 'ranked_items', count(*) FROM public.ranked_items
UNION ALL SELECT 'follows',      count(*) FROM public.follows
UNION ALL SELECT 'feed_posts',   count(*) FROM public.feed_posts
UNION ALL SELECT 'venues',       count(*) FROM public.venues
UNION ALL SELECT 'post_likes',   count(*) FROM public.post_likes;

-- ─── 4. Check sumer_aiand profile ───
SELECT user_id, name, default_context, include_in_clustering, created_at 
FROM public.profiles 
WHERE user_id = 'sumer_aiand';

-- ─── 5. sumer's follower count ───
SELECT count(*) as follower_count 
FROM public.follows 
WHERE following_id = 'sumer_aiand';

-- ─── 6. sumer's contexts + item counts ───
SELECT context_id, count(*) as items 
FROM public.ranked_items 
WHERE user_id = 'sumer_aiand' 
GROUP BY context_id 
ORDER BY context_id;

-- ─── 7. RLS policies audit ───
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ─── 8. Check post_likes trigger exists ───
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public';

-- ─── 9. Feed posts sample (last 10) ───
SELECT id, author_id, author_name, likes, created_at
FROM public.feed_posts
ORDER BY created_at DESC
LIMIT 10;

-- ─── 10. Random users' following counts ───
SELECT following_id, count(*) as followers
FROM public.follows
WHERE following_id IS NOT NULL
GROUP BY following_id
ORDER BY followers DESC
LIMIT 10;
