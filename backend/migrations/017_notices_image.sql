-- Migration 017: Add image_url support to notices
ALTER TABLE notices ADD COLUMN IF NOT EXISTS image_url TEXT;
