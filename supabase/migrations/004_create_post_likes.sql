-- taste.node — Migration: create post_likes table for per-user like tracking
-- Enables "liked_by_me" on the frontend and prevents double-liking.

CREATE TABLE IF NOT EXISTS public.post_likes (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, post_id)
);

-- Optimize lookups by post and by user
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);

-- Row-Level Security: users can only see their own likes, but aggregate counts
-- are computed via the feed_posts.likes counter column.
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS post_likes_select_own
    ON public.post_likes
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS post_likes_insert_own
    ON public.post_likes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS post_likes_delete_own
    ON public.post_likes
    FOR DELETE
    USING (auth.uid() = user_id);

-- Ensure feed_posts.likes stays non-negative
ALTER TABLE public.feed_posts
    DROP CONSTRAINT IF EXISTS feed_posts_likes_non_negative,
    ADD CONSTRAINT feed_posts_likes_non_negative CHECK (likes >= 0);
