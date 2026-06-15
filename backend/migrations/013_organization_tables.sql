-- ============================================================
-- Migration 013: Organization Tables (UUID schema)
-- NOTE: departments table already exists in schema.sql — skipped
-- ============================================================

-- 1. Employee profile photos
CREATE TABLE IF NOT EXISTS employee_photos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  photo_url    TEXT NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  uploaded_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Org reporting hierarchy
CREATE TABLE IF NOT EXISTS reporting_hierarchy (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id        UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reports_to_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to   DATE,
  is_current     BOOLEAN NOT NULL DEFAULT true,
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, effective_from)
);

-- 3. Partner ↔ employee mapping
CREATE TABLE IF NOT EXISTS partner_user_mapping (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id      UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  partner_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (partner_id, user_id)
);

-- 4. Department members
--    (departments table already exists with UUID id)
CREATE TABLE IF NOT EXISTS department_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_in_dept  VARCHAR(80) DEFAULT 'Member',
  joined_at     DATE NOT NULL DEFAULT CURRENT_DATE,
  left_at       DATE,
  is_current    BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (department_id, user_id, joined_at)
);

-- 5. Designations / job titles
CREATE TABLE IF NOT EXISTS designations (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id   UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  title     VARCHAR(120) NOT NULL,
  level     SMALLINT DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (firm_id, title)
);

-- 6. Employee directory (extended profile)
CREATE TABLE IF NOT EXISTS employee_directory (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  designation_id   UUID REFERENCES designations(id) ON DELETE SET NULL,
  department_id    UUID REFERENCES departments(id) ON DELETE SET NULL,
  work_location    VARCHAR(120),
  work_phone       VARCHAR(20),
  linkedin_url     TEXT,
  bio              TEXT,
  skills           TEXT[],
  date_of_joining  DATE,
  date_of_birth    DATE,
  is_visible       BOOLEAN NOT NULL DEFAULT true,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reporting_hier_firm     ON reporting_hierarchy(firm_id);
CREATE INDEX IF NOT EXISTS idx_reporting_hier_user     ON reporting_hierarchy(user_id);
CREATE INDEX IF NOT EXISTS idx_reporting_hier_manager  ON reporting_hierarchy(reports_to_id);
CREATE INDEX IF NOT EXISTS idx_reporting_hier_current  ON reporting_hierarchy(firm_id, is_current);
CREATE INDEX IF NOT EXISTS idx_partner_user_map_firm   ON partner_user_mapping(firm_id);
CREATE INDEX IF NOT EXISTS idx_partner_user_map_part   ON partner_user_mapping(partner_id);
CREATE INDEX IF NOT EXISTS idx_dept_members_dept       ON department_members(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_members_user       ON department_members(user_id);
CREATE INDEX IF NOT EXISTS idx_emp_directory_dept      ON employee_directory(department_id);
CREATE INDEX IF NOT EXISTS idx_emp_directory_desig     ON employee_directory(designation_id);
