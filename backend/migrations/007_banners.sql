-- Migration 007: Dashboard Banners / Announcements
-- Run once in pgAdmin before using the banner feature.

CREATE TABLE IF NOT EXISTS banners (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id     UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  image_url   TEXT,
  link_url    TEXT,
  link_text   TEXT,
  bg_color    VARCHAR(20)  NOT NULL DEFAULT '#1e40af',
  text_color  VARCHAR(20)  NOT NULL DEFAULT '#ffffff',
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  expires_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banners_firm_active
  ON banners(firm_id, is_active, expires_at);
