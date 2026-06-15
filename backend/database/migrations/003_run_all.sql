-- ═══════════════════════════════════════════════════════════════════════════
-- ALL PENDING MIGRATIONS — run this single file in pgAdmin Query Tool
-- Database: ca_firm_db
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 001: Add missing columns to firms ──────────────────────────────────────
ALTER TABLE firms ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100);
ALTER TABLE firms ADD COLUMN IF NOT EXISTS website     VARCHAR(255);
ALTER TABLE firms ADD COLUMN IF NOT EXISTS city        VARCHAR(100);
ALTER TABLE firms ADD COLUMN IF NOT EXISTS state       VARCHAR(100);
ALTER TABLE firms ADD COLUMN IF NOT EXISTS pincode     VARCHAR(20);
ALTER TABLE firms ADD COLUMN IF NOT EXISTS country     VARCHAR(100) DEFAULT 'India';
ALTER TABLE firms ADD COLUMN IF NOT EXISTS logo_url    TEXT;
ALTER TABLE firms ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE firms ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20) DEFAULT '#5B6B7A';
ALTER TABLE firms ADD COLUMN IF NOT EXISTS accent_color  VARCHAR(20) DEFAULT '#3B82F6';

-- ─── 002: Add missing columns to assignment tables ──────────────────────────
ALTER TABLE assignment_types ADD COLUMN IF NOT EXISTS description  TEXT;
ALTER TABLE assignment_types ADD COLUMN IF NOT EXISTS is_billable  BOOLEAN DEFAULT true;
ALTER TABLE assignment_types ADD COLUMN IF NOT EXISTS default_hours DECIMAL(8,2);
ALTER TABLE assignment_types ADD COLUMN IF NOT EXISTS color        VARCHAR(20);
ALTER TABLE assignment_types ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS manager_id       UUID REFERENCES users(id);
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS start_date       DATE;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS estimated_hours  DECIMAL(8,2);
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS is_billable      BOOLEAN DEFAULT true;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS progress         INT DEFAULT 0;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS completed_date   DATE;

-- Copy existing assigned_manager_id -> manager_id
UPDATE assignments SET manager_id = assigned_manager_id WHERE manager_id IS NULL;

ALTER TABLE assignment_members ADD COLUMN IF NOT EXISTS is_active  BOOLEAN DEFAULT true;
ALTER TABLE assignment_members ADD COLUMN IF NOT EXISTS role       VARCHAR(50) DEFAULT 'member';
ALTER TABLE assignment_members ADD COLUMN IF NOT EXISTS joined_at  TIMESTAMPTZ DEFAULT NOW();

-- Set all existing members as active
UPDATE assignment_members SET is_active = true WHERE is_active IS NULL;

-- ─── 003: Add missing columns to clients ────────────────────────────────────
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city     VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS state    VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes    TEXT;

-- ─── 004: Add extra branding columns ────────────────────────────────────────
ALTER TABLE branding_settings ADD COLUMN IF NOT EXISTS accent_color  VARCHAR(20) DEFAULT '#818cf8';
ALTER TABLE branding_settings ADD COLUMN IF NOT EXISTS text_color    VARCHAR(20) DEFAULT '#1e293b';
ALTER TABLE branding_settings ADD COLUMN IF NOT EXISTS bg_color      VARCHAR(20) DEFAULT '#f8fafc';
ALTER TABLE branding_settings ADD COLUMN IF NOT EXISTS favicon_url   TEXT;

-- ─── Done ────────────────────────────────────────────────────────────────────
SELECT 'All migrations applied successfully ✓' AS result;
