-- ============================================================
-- ArtSwipe · Supabase Schema  (run in Supabase SQL Editor)
-- ============================================================

-- Drop old single-category schema if upgrading
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS style_tags TEXT[] DEFAULT '{}';
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS image_small TEXT;
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS source_url  TEXT DEFAULT '';
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS department  TEXT DEFAULT '';
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS medium      TEXT DEFAULT '';

-- If starting fresh, create the full table
CREATE TABLE IF NOT EXISTS artworks (
  id           BIGSERIAL PRIMARY KEY,
  source       TEXT NOT NULL DEFAULT 'artic',   -- 'met' | 'artic' | 'cleveland'
  source_id    TEXT NOT NULL,
  title        TEXT NOT NULL DEFAULT 'Untitled',
  artist       TEXT NOT NULL DEFAULT '',
  year         TEXT NOT NULL DEFAULT '',
  medium       TEXT NOT NULL DEFAULT '',
  department   TEXT NOT NULL DEFAULT '',
  style_tags   TEXT[] NOT NULL DEFAULT '{}',    -- e.g. ['impressionism','vangogh']
  image_url    TEXT NOT NULL,                   -- full-size
  image_small  TEXT NOT NULL DEFAULT '',        -- ~400px thumb
  source_url   TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (source, source_id)
);

-- GIN index for fast tag-overlap queries (&&)
CREATE INDEX IF NOT EXISTS artworks_style_tags_gin
  ON artworks USING GIN (style_tags);

-- Row-level security — public SELECT only
ALTER TABLE artworks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read" ON artworks;
CREATE POLICY "Public read" ON artworks
  FOR SELECT USING (true);

-- ── RPC: random artworks matching any of p_tags ────────────────────────────
CREATE OR REPLACE FUNCTION get_artworks(p_tags TEXT[], p_limit INT DEFAULT 400)
RETURNS SETOF artworks
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT * FROM artworks
  WHERE style_tags && p_tags
  ORDER BY random()
  LIMIT p_limit;
$$;

-- ── RPC: stats per tag (handy to check seeding progress) ───────────────────
CREATE OR REPLACE FUNCTION artwork_stats()
RETURNS TABLE(style TEXT, cnt BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT unnest(style_tags) AS style, COUNT(*) AS cnt
  FROM artworks
  GROUP BY 1
  ORDER BY 2 DESC;
$$;
