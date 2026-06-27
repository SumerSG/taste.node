-- Run this in the Supabase SQL Editor

-- Venues table: canonical venue catalog
CREATE TABLE IF NOT EXISTS public.venues (
  id text PRIMARY KEY,
  name text NOT NULL,
  address text,
  lat double precision,
  lng double precision,
  cuisines text[] DEFAULT '{}' NOT NULL,
  dietary_tags text[] DEFAULT '{}' NOT NULL,
  price_tier integer,
  health_score double precision,
  source text DEFAULT 'tabelog' NOT NULL,
  source_url text,
  image_url text,
  rating double precision,
  review_count integer,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read venues"
  ON public.venues FOR SELECT
  TO authenticated
  USING (true);

-- Profiles table: one row per user, stores profile-level state
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  default_context text DEFAULT 'default' NOT NULL,
  following text[] DEFAULT '{}' NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Contexts table: one row per (user, context), stores ranked lists
CREATE TABLE IF NOT EXISTS public.contexts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  context_id text DEFAULT 'default' NOT NULL,
  ranked_list jsonb DEFAULT '[]'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, context_id)
);

ALTER TABLE public.contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own contexts"
  ON public.contexts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own contexts"
  ON public.contexts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own contexts"
  ON public.contexts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own contexts"
  ON public.contexts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


CREATE TABLE IF NOT EXISTS public.feed_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_name text DEFAULT 'Anonymous' NOT NULL,
  text text DEFAULT '' NOT NULL,
  venue_id text,
  venue_name text,
  image_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read posts"
  ON public.feed_posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own posts"
  ON public.feed_posts FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can delete own posts"
  ON public.feed_posts FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());
