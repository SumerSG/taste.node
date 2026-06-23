CREATE TABLE IF NOT EXISTS venues (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  address       TEXT,
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  cuisines      TEXT[] NOT NULL DEFAULT '{}',
  dietary_tags  TEXT[] NOT NULL DEFAULT '{}',
  price_tier    INTEGER,
  health_score  DOUBLE PRECISION,
  source        TEXT NOT NULL DEFAULT 'tabelog',
  source_url    TEXT,
  rating        DOUBLE PRECISION,
  review_count  INTEGER,
  image_url     TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- GIN index for array lookups so cuisine/diet filters stay fast
CREATE INDEX IF NOT EXISTS idx_venues_cuisines   ON venues USING GIN (cuisines);
CREATE INDEX IF NOT EXISTS idx_venues_dietary    ON venues USING GIN (dietary_tags);
CREATE INDEX IF NOT EXISTS idx_venues_source     ON venues (source);
CREATE INDEX IF NOT EXISTS idx_venues_price_tier ON venues (price_tier);

-- RLS: public read, authenticated write
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY venues_select_public
  ON venues FOR SELECT
  USING (true);

CREATE POLICY venues_write_authenticated
  ON venues FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
