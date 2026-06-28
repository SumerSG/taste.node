-- taste.node — One-shot migration: add likes support to feed_posts + post_likes table
-- Run this in the Supabase SQL Editor if your database is missing the likes column
-- or the post_likes tracking table.

-- ─── 1. Ensure likes column exists on feed_posts ───

ALTER TABLE public.feed_posts
    ADD COLUMN IF NOT EXISTS likes INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_feed_posts_likes
    ON public.feed_posts(likes DESC);

-- Constrain to non-negative
ALTER TABLE public.feed_posts
    DROP CONSTRAINT IF EXISTS feed_posts_likes_non_negative,
    ADD CONSTRAINT feed_posts_likes_non_negative CHECK (likes >= 0);

-- ─── 2. Create post_likes tracking table ───

CREATE TABLE IF NOT EXISTS public.post_likes (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS post_likes_select_own
    ON public.post_likes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS post_likes_insert_own
    ON public.post_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS post_likes_delete_own
    ON public.post_likes FOR DELETE
    USING (auth.uid() = user_id);

-- ─── 3. Trigger to keep feed_posts.likes in sync with post_likes ───

CREATE OR REPLACE FUNCTION public.fn_sync_post_likes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.feed_posts
        SET likes = likes + 1
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.feed_posts
        SET likes = GREATEST(likes - 1, 0)
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_post_likes ON public.post_likes;
CREATE TRIGGER trg_sync_post_likes
    AFTER INSERT OR DELETE ON public.post_likes
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_post_likes();
