-- ArtSwipe artworks table
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS artworks (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT NOT NULL DEFAULT 'Untitled',
  artist      TEXT DEFAULT 'Unknown Artist',
  image_url   TEXT NOT NULL,
  thumb_url   TEXT,
  category    TEXT DEFAULT 'modern',
  tags        TEXT[] DEFAULT '{}',
  source      TEXT DEFAULT 'aic',
  source_id   TEXT UNIQUE,
  year        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Public read access (no login needed)
ALTER TABLE artworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON artworks
  FOR SELECT USING (true);

-- Index for random fast fetches by category
CREATE INDEX IF NOT EXISTS idx_artworks_category ON artworks(category);
CREATE INDEX IF NOT EXISTS idx_artworks_id ON artworks(id);
