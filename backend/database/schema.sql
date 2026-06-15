-- CA Firm Practice Management - PostgreSQL Schema
-- Run: psql -U ca_firm_user -d ca_firm_db -f schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Firms ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS firms (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL,
  firm_code   VARCHAR(50) UNIQUE NOT NULL,
  email       VARCHAR(255),
  phone       VARCHAR(20),
  address     TEXT,
  gstin       VARCHAR(20),
  pan         VARCHAR(20),
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Branches ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id    UUID REFERENCES firms(id) ON DELETE CASCADE,
  name       VARCHAR(255) NOT NULL,
  city       VARCHAR(100),
  state      VARCHAR(100),
  address    TEXT,
  phone      VARCHAR(20),
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Roles ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id    UUID REFERENCES firms(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  slug       VARCHAR(50) NOT NULL,
  is_system  BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Departments ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id    UUID REFERENCES firms(id) ON DELETE CASCADE,
  name       VARCHAR(255) NOT NULL,
  code       VARCHAR(20),
  head_id    UUID,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id              UUID REFERENCES firms(id) ON DELETE CASCADE,
  role_id              UUID REFERENCES roles(id),
  department_id        UUID REFERENCES departments(id),
  branch_id            UUID REFERENCES branches(id),
  reporting_manager_id UUID REFERENCES users(id),
  first_name           VARCHAR(100) NOT NULL,
  last_name            VARCHAR(100) NOT NULL,
  email                VARCHAR(255) UNIQUE NOT NULL,
  phone                VARCHAR(20),
  whatsapp_number      VARCHAR(20),
  employee_id          VARCHAR(50),
  designation          VARCHAR(100),
  join_date            DATE,
  status               VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive','on_leave')),
  password_hash        TEXT NOT NULL,
  avatar_url           TEXT,
  created_by           UUID REFERENCES users(id),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── Refresh Tokens ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked    BOOLEAN DEFAULT false,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Password Resets ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_resets (
  user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token      UUID NOT NULL DEFAULT uuid_generate_v4(),
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Login History ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS login_history (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  status     VARCHAR(20) DEFAULT 'success',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Clients ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id             UUID REFERENCES firms(id) ON DELETE CASCADE,
  client_name         VARCHAR(255) NOT NULL,
  client_code         VARCHAR(50),
  client_type         VARCHAR(50) DEFAULT 'company',
  pan_number          VARCHAR(20),
  gst_number          VARCHAR(20),
  email               VARCHAR(255),
  phone               VARCHAR(20),
  address             TEXT,
  assigned_partner_id UUID REFERENCES users(id),
  assigned_manager_id UUID REFERENCES users(id),
  status              VARCHAR(20) DEFAULT 'active',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── Assignment Types ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assignment_types (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id   UUID REFERENCES firms(id) ON DELETE CASCADE,
  name      VARCHAR(100) NOT NULL,
  code      VARCHAR(20),
  is_active BOOLEAN DEFAULT true
);

-- ── Assignments ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assignments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id             UUID REFERENCES firms(id) ON DELETE CASCADE,
  client_id           UUID REFERENCES clients(id),
  assignment_type_id  UUID REFERENCES assignment_types(id),
  title               VARCHAR(255) NOT NULL,
  assignment_number   VARCHAR(50),
  description         TEXT,
  status              VARCHAR(50) DEFAULT 'assigned',
  priority            VARCHAR(20) DEFAULT 'medium',
  due_date            DATE,
  budgeted_hours      DECIMAL(8,2),
  actual_hours        DECIMAL(8,2) DEFAULT 0,
  assigned_partner_id UUID REFERENCES users(id),
  assigned_manager_id UUID REFERENCES users(id),
  financial_year      VARCHAR(10),
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── Assignment Members ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assignment_members (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id),
  allocated_hours DECIMAL(8,2),
  UNIQUE(assignment_id, user_id)
);

-- ── Timesheets ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timesheets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id       UUID REFERENCES firms(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id),
  client_id     UUID REFERENCES clients(id),
  assignment_id UUID REFERENCES assignments(id),
  date          DATE NOT NULL,
  hours_worked  DECIMAL(5,2) NOT NULL CHECK (hours_worked > 0 AND hours_worked <= 24),
  billable_hours DECIMAL(5,2),
  is_billable   BOOLEAN DEFAULT true,
  work_type     VARCHAR(50) DEFAULT 'billable',
  description   TEXT,
  status        VARCHAR(30) DEFAULT 'draft',
  submitted_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Approvals ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS approvals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timesheet_id  UUID REFERENCES timesheets(id) ON DELETE CASCADE,
  approver_id   UUID REFERENCES users(id),
  firm_id       UUID REFERENCES firms(id),
  action        VARCHAR(20) NOT NULL,
  comment       TEXT,
  role_at_time  VARCHAR(50),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Leaves ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leaves (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id          UUID REFERENCES firms(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES users(id),
  leave_type       VARCHAR(50) NOT NULL,
  from_date        DATE NOT NULL,
  to_date          DATE NOT NULL,
  total_days       DECIMAL(4,1) NOT NULL,
  reason           TEXT,
  status           VARCHAR(20) DEFAULT 'pending',
  approved_by      UUID REFERENCES users(id),
  approved_at      TIMESTAMPTZ,
  approver_comment TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Leave Balances ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_balances (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  firm_id    UUID REFERENCES firms(id),
  leave_type VARCHAR(50) NOT NULL,
  year       INT NOT NULL,
  total      DECIMAL(5,1) DEFAULT 0,
  used       DECIMAL(5,1) DEFAULT 0,
  remaining  DECIMAL(5,1) DEFAULT 0,
  UNIQUE(user_id, leave_type, year)
);

-- ── Leave Rules ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_rules (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id       UUID REFERENCES firms(id) ON DELETE CASCADE,
  leave_type    VARCHAR(50) NOT NULL,
  total_days    DECIMAL(5,1) NOT NULL,
  carry_forward BOOLEAN DEFAULT false,
  description   TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(firm_id, leave_type)
);

-- ── Holidays ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS holidays (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id     UUID REFERENCES firms(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES branches(id),
  name        VARCHAR(255) NOT NULL,
  date        DATE NOT NULL,
  type        VARCHAR(50) DEFAULT 'public',
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Notices ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notices (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id       UUID REFERENCES firms(id) ON DELETE CASCADE,
  branch_id     UUID REFERENCES branches(id),
  department_id UUID REFERENCES departments(id),
  title         VARCHAR(255) NOT NULL,
  content       TEXT NOT NULL,
  category      VARCHAR(50) DEFAULT 'general',
  priority      VARCHAR(20) DEFAULT 'normal',
  is_pinned     BOOLEAN DEFAULT false,
  image_url     TEXT,
  expires_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Notifications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  firm_id    UUID REFERENCES firms(id),
  type       VARCHAR(100) NOT NULL,
  title      VARCHAR(255) NOT NULL,
  message    TEXT,
  link       TEXT,
  meta       JSONB DEFAULT '{}',
  is_read    BOOLEAN DEFAULT false,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Notification Configs ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_configs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id     UUID REFERENCES firms(id) ON DELETE CASCADE,
  event_type  VARCHAR(100) NOT NULL,
  channels    JSONB DEFAULT '["inapp"]',
  is_active   BOOLEAN DEFAULT true,
  templates   JSONB DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(firm_id, event_type)
);

-- ── Branding Settings ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branding_settings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id       UUID REFERENCES firms(id) ON DELETE CASCADE UNIQUE,
  firm_name     VARCHAR(255),
  tagline       VARCHAR(255),
  logo_url      TEXT,
  email         VARCHAR(255),
  phone         VARCHAR(20),
  website       VARCHAR(255),
  address       TEXT,
  primary_color VARCHAR(20) DEFAULT '#5B6B7A',
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Audit Logs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id),
  firm_id    UUID REFERENCES firms(id),
  action     VARCHAR(100) NOT NULL,
  entity     VARCHAR(100),
  entity_id  UUID,
  meta       JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_firm        ON users(firm_id);
CREATE INDEX IF NOT EXISTS idx_users_email       ON users(email);
CREATE INDEX IF NOT EXISTS idx_timesheets_user   ON timesheets(user_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_date   ON timesheets(date);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status);
CREATE INDEX IF NOT EXISTS idx_timesheets_firm   ON timesheets(firm_id);
CREATE INDEX IF NOT EXISTS idx_leaves_user       ON leaves(user_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status     ON leaves(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_audit_entity      ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user        ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_holidays_firm_date ON holidays(firm_id, date);

SELECT 'Schema created successfully ✓' as result;
