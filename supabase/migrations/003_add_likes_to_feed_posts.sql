-- taste.node — Migration: add likes column to feed_posts (for existing tables)
-- Run this in the Supabase SQL Editor if the table was already created without likes.

ALTER TABLE public.feed_posts
    ADD COLUMN IF NOT EXISTS likes INTEGER NOT NULL DEFAULT 0;

-- Index for efficient sorting by popularity
CREATE INDEX IF NOT EXISTS idx_feed_posts_likes ON public.feed_posts(likes DESC);
