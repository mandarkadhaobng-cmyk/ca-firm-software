-- ============================================================
-- CA Firm Practice Management - COMPLETE DATABASE SETUP
-- Run this ONE FILE in pgAdmin to set up everything from scratch.
-- All schema + all migrations are combined here.
--
-- Steps:
--   1. Open pgAdmin
--   2. Connect to your PostgreSQL server
--   3. Create a database named: ca_firm_db
--   4. Open Query Tool on ca_firm_db
--   5. Open this file (File > Open) and click Run (F5)
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- TABLE: firms
-- ============================================================
CREATE TABLE IF NOT EXISTS firms (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                VARCHAR(255) NOT NULL,
  firm_code           VARCHAR(50) UNIQUE NOT NULL,
  email               VARCHAR(255),
  phone               VARCHAR(20),
  address             TEXT,
  gstin               VARCHAR(20),
  pan                 VARCHAR(20),
  registration_number VARCHAR(100),
  website             VARCHAR(255),
  city                VARCHAR(100),
  state               VARCHAR(100),
  pincode             VARCHAR(20),
  country             VARCHAR(100) DEFAULT 'India',
  logo_url            TEXT,
  favicon_url         TEXT,
  primary_color       VARCHAR(20) DEFAULT '#5B6B7A',
  accent_color        VARCHAR(20) DEFAULT '#3B82F6',
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE: branches
-- ============================================================
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


-- ============================================================
-- TABLE: roles
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id    UUID REFERENCES firms(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  slug       VARCHAR(50) NOT NULL,
  is_system  BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE: departments
-- ============================================================
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


-- ============================================================
-- TABLE: users  (includes PAN/bank columns from migration 018)
-- ============================================================
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
  -- Payroll / banking (added in migration 018)
  pan_number           VARCHAR(20),
  bank_name            VARCHAR(100),
  account_number       VARCHAR(30),
  ifsc_code            VARCHAR(20),
  created_by           UUID REFERENCES users(id),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE: refresh_tokens
-- ============================================================
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


-- ============================================================
-- TABLE: password_resets
-- ============================================================
CREATE TABLE IF NOT EXISTS password_resets (
  user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token      UUID NOT NULL DEFAULT uuid_generate_v4(),
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE: login_history
-- ============================================================
CREATE TABLE IF NOT EXISTS login_history (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  status     VARCHAR(20) DEFAULT 'success',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE: clients  (includes extra cols from migration 003)
-- ============================================================
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
  city                VARCHAR(100),
  state               VARCHAR(100),
  industry            VARCHAR(100),
  notes               TEXT,
  assigned_partner_id UUID REFERENCES users(id),
  assigned_manager_id UUID REFERENCES users(id),
  status              VARCHAR(20) DEFAULT 'active',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE: assignment_types  (includes extra cols from migration 002)
-- ============================================================
CREATE TABLE IF NOT EXISTS assignment_types (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id       UUID REFERENCES firms(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  code          VARCHAR(20),
  description   TEXT,
  is_billable   BOOLEAN DEFAULT true,
  default_hours DECIMAL(8,2),
  color         VARCHAR(20),
  is_active     BOOLEAN DEFAULT true,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE: assignments  (includes extra cols from migrations 002 + 011)
-- ============================================================
CREATE TABLE IF NOT EXISTS assignments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id             UUID REFERENCES firms(id) ON DELETE CASCADE,
  client_id           UUID REFERENCES clients(id),
  assignment_type_id  UUID REFERENCES assignment_types(id),
  title               VARCHAR(255) NOT NULL,
  assignment_number   VARCHAR(50),
  description         TEXT,
  remarks             TEXT,
  status              VARCHAR(50) DEFAULT 'assigned',
  priority            VARCHAR(20) DEFAULT 'medium',
  due_date            DATE,
  start_date          DATE,
  budgeted_hours      DECIMAL(8,2),
  estimated_hours     DECIMAL(8,2),
  actual_hours        DECIMAL(8,2) DEFAULT 0,
  is_billable         BOOLEAN DEFAULT true,
  progress            INT DEFAULT 0,
  completed_date      DATE,
  assigned_partner_id UUID REFERENCES users(id),
  assigned_manager_id UUID REFERENCES users(id),
  manager_id          UUID REFERENCES users(id),
  financial_year      VARCHAR(10),
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE: assignment_members  (includes extra cols from migration 002)
-- ============================================================
CREATE TABLE IF NOT EXISTS assignment_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id   UUID REFERENCES assignments(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id),
  allocated_hours DECIMAL(8,2),
  is_active       BOOLEAN DEFAULT true,
  role            VARCHAR(50) DEFAULT 'member',
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id, user_id)
);


-- ============================================================
-- TABLE: timesheets
-- ============================================================
CREATE TABLE IF NOT EXISTS timesheets (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id        UUID REFERENCES firms(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES users(id),
  client_id      UUID REFERENCES clients(id),
  assignment_id  UUID REFERENCES assignments(id),
  date           DATE NOT NULL,
  hours_worked   DECIMAL(5,2) NOT NULL CHECK (hours_worked > 0 AND hours_worked <= 24),
  billable_hours DECIMAL(5,2),
  is_billable    BOOLEAN DEFAULT true,
  work_type      VARCHAR(50) DEFAULT 'billable',
  description    TEXT,
  status         VARCHAR(30) DEFAULT 'draft',
  submitted_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE: approvals
-- ============================================================
CREATE TABLE IF NOT EXISTS approvals (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timesheet_id UUID REFERENCES timesheets(id) ON DELETE CASCADE,
  approver_id  UUID REFERENCES users(id),
  firm_id      UUID REFERENCES firms(id),
  action       VARCHAR(20) NOT NULL,
  comment      TEXT,
  role_at_time VARCHAR(50),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE: leaves
-- ============================================================
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


-- ============================================================
-- TABLE: leave_balances
-- ============================================================
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


-- ============================================================
-- TABLE: leave_rules
-- ============================================================
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


-- ============================================================
-- TABLE: holidays
-- ============================================================
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


-- ============================================================
-- TABLE: notices  (includes image_url from migration 017)
-- ============================================================
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


-- ============================================================
-- TABLE: notifications
-- ============================================================
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


-- ============================================================
-- TABLE: notification_configs
-- ============================================================
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


-- ============================================================
-- TABLE: branding_settings  (includes extra cols from migration 003)
-- ============================================================
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
  accent_color  VARCHAR(20) DEFAULT '#818cf8',
  text_color    VARCHAR(20) DEFAULT '#1e293b',
  bg_color      VARCHAR(20) DEFAULT '#f8fafc',
  favicon_url   TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE: audit_logs
-- ============================================================
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


-- ============================================================
-- TABLE: banners  (migration 007)
-- ============================================================
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


-- ============================================================
-- TABLE: daily_logs  (migration 008 + 010 patch)
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id          UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_id    UUID REFERENCES assignments(id) ON DELETE SET NULL,
  log_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  hours_worked     NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (hours_worked >= 0 AND hours_worked <= 24),
  work_done        TEXT NOT NULL,
  blockers         TEXT,
  status           VARCHAR(20) NOT NULL DEFAULT 'submitted'
                   CHECK (status IN ('draft','submitted','reviewed')),
  reviewed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  reviewer_remarks TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- TABLE: weekly_reports  (migration 009)
-- ============================================================
CREATE TABLE IF NOT EXISTS weekly_reports (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id        UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start     DATE NOT NULL,
  week_end       DATE NOT NULL,
  completed_work TEXT,
  pending_work   TEXT,
  blockers       TEXT,
  next_week_plan TEXT,
  other_work     TEXT,
  total_hours    NUMERIC(6,2),
  status         VARCHAR(20) NOT NULL DEFAULT 'submitted'
                 CHECK (status IN ('draft','submitted','reviewed')),
  reviewed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  reviewer_remarks TEXT,
  submitted_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (firm_id, user_id, week_start)
);


-- ============================================================
-- PAYROLL TABLES  (final schema from migration 015)
-- ============================================================

-- Employee salary config: one row per employee = their monthly salary
CREATE TABLE IF NOT EXISTS employee_salary (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  firm_id        UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  monthly_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  notes          TEXT,
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, firm_id)
);

-- One payroll run per month per firm
CREATE TABLE IF NOT EXISTS payroll_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id          UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  month            SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year             SMALLINT NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  status           VARCHAR(20) NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','approved','sent')),
  working_days     SMALLINT NOT NULL DEFAULT 26,
  total_employees  SMALLINT DEFAULT 0,
  total_deductions NUMERIC(14,2) DEFAULT 0,
  total_net        NUMERIC(14,2) DEFAULT 0,
  notes            TEXT,
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at      TIMESTAMPTZ,
  sent_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (firm_id, month, year)
);

-- One salary slip per employee per run
CREATE TABLE IF NOT EXISTS salary_slips (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id   UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  firm_id          UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  month            SMALLINT NOT NULL,
  year             SMALLINT NOT NULL,
  monthly_salary   NUMERIC(12,2) NOT NULL DEFAULT 0,
  working_days     SMALLINT NOT NULL DEFAULT 26,
  present_days     SMALLINT NOT NULL DEFAULT 26,
  absent_days      SMALLINT NOT NULL DEFAULT 0,
  per_day_salary   NUMERIC(12,4) NOT NULL DEFAULT 0,
  absent_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  reimbursement    NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_salary       NUMERIC(12,2) NOT NULL DEFAULT 0,
  adjustment       NUMERIC(5,2)  NOT NULL DEFAULT 0,
  final_salary     NUMERIC(12,2) NOT NULL DEFAULT 0,
  remarks          TEXT,
  is_locked        BOOLEAN NOT NULL DEFAULT false,
  email_status     VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (email_status IN ('pending','sent','failed','skipped')),
  email_sent_at    TIMESTAMPTZ,
  email_error      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (payroll_run_id, user_id)
);

-- Email delivery log for payslips
CREATE TABLE IF NOT EXISTS payroll_email_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slip_id        UUID NOT NULL REFERENCES salary_slips(id) ON DELETE CASCADE,
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_email       VARCHAR(255) NOT NULL,
  status         VARCHAR(20) NOT NULL CHECK (status IN ('sent','failed')),
  error_message  TEXT,
  sent_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- ORGANIZATION TABLES  (migration 013)
-- ============================================================

CREATE TABLE IF NOT EXISTS employee_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  photo_url   TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS partner_user_mapping (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id     UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  partner_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (partner_id, user_id)
);

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

CREATE TABLE IF NOT EXISTS designations (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id   UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  title     VARCHAR(120) NOT NULL,
  level     SMALLINT DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (firm_id, title)
);

CREATE TABLE IF NOT EXISTS employee_directory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  designation_id  UUID REFERENCES designations(id) ON DELETE SET NULL,
  department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
  work_location   VARCHAR(120),
  work_phone      VARCHAR(20),
  linkedin_url    TEXT,
  bio             TEXT,
  skills          TEXT[],
  date_of_joining DATE,
  date_of_birth   DATE,
  is_visible      BOOLEAN NOT NULL DEFAULT true,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_firm          ON users(firm_id);
CREATE INDEX IF NOT EXISTS idx_users_email         ON users(email);
CREATE INDEX IF NOT EXISTS idx_timesheets_user     ON timesheets(user_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_date     ON timesheets(date);
CREATE INDEX IF NOT EXISTS idx_timesheets_status   ON timesheets(status);
CREATE INDEX IF NOT EXISTS idx_timesheets_firm     ON timesheets(firm_id);
CREATE INDEX IF NOT EXISTS idx_leaves_user         ON leaves(user_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status       ON leaves(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user  ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read  ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_audit_entity        ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user          ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_holidays_firm_date  ON holidays(firm_id, date);
CREATE INDEX IF NOT EXISTS idx_banners_firm_active ON banners(firm_id, is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_daily_logs_firm     ON daily_logs(firm_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user     ON daily_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_logs_assign   ON daily_logs(assignment_id);
CREATE INDEX IF NOT EXISTS idx_weekly_rep_firm     ON weekly_reports(firm_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_rep_user     ON weekly_reports(user_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_emp_salary_firm     ON employee_salary(firm_id);
CREATE INDEX IF NOT EXISTS idx_emp_salary_user     ON employee_salary(user_id);
CREATE INDEX IF NOT EXISTS idx_pr_firm_month       ON payroll_runs(firm_id, month, year);
CREATE INDEX IF NOT EXISTS idx_slip_run            ON salary_slips(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_slip_user           ON salary_slips(user_id);
CREATE INDEX IF NOT EXISTS idx_slip_firm           ON salary_slips(firm_id);
CREATE INDEX IF NOT EXISTS idx_email_log_slip      ON payroll_email_log(slip_id);
CREATE INDEX IF NOT EXISTS idx_email_log_run       ON payroll_email_log(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_assignments_overdue ON assignments(firm_id, due_date)
  WHERE due_date IS NOT NULL AND status NOT IN ('completed','closed','cancelled');
CREATE INDEX IF NOT EXISTS idx_reporting_hier_firm ON reporting_hierarchy(firm_id);
CREATE INDEX IF NOT EXISTS idx_reporting_hier_user ON reporting_hierarchy(user_id);
CREATE INDEX IF NOT EXISTS idx_dept_members_dept   ON department_members(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_members_user   ON department_members(user_id);


-- ============================================================
-- SEED DATA  (initial firm + super admin login)
-- ============================================================

-- 1. Insert firm
INSERT INTO firms (id, name, firm_code, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'My CA Firm', 'CAFIRM001', 'admin@cafirm.com')
ON CONFLICT DO NOTHING;

-- 2. System roles
INSERT INTO roles (id, firm_id, name, slug, is_system) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Super Admin', 'super_admin', true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Partner',     'partner',     true),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'HR',          'hr',          true),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Manager',     'manager',     true),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Employee',    'employee',    true)
ON CONFLICT DO NOTHING;

-- 3. Default branch
INSERT INTO branches (id, firm_id, name, city, state) VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Head Office', 'Bangalore', 'Karnataka')
ON CONFLICT DO NOTHING;

-- 4. Default departments
INSERT INTO departments (firm_id, name, code) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Audit',          'AUD'),
  ('00000000-0000-0000-0000-000000000001', 'Taxation',       'TAX'),
  ('00000000-0000-0000-0000-000000000001', 'Accounts',       'ACC'),
  ('00000000-0000-0000-0000-000000000001', 'Advisory',       'ADV'),
  ('00000000-0000-0000-0000-000000000001', 'Administration', 'ADM')
ON CONFLICT DO NOTHING;

-- 5. Super admin user
--    Email: admin@cafirm.com
--    Password: Admin@1234
INSERT INTO users (id, firm_id, role_id, branch_id, first_name, last_name, email, password_hash, employee_id, designation, status)
VALUES (
  '30000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'Super', 'Admin', 'admin@cafirm.com',
  '$2a$12$MVLdjMcuk6GecB2GhlrPcuVXT.FHtaqaIcVu4YLZkgAClrH.dm2DS',
  'EMP001', 'System Administrator', 'active'
) ON CONFLICT DO NOTHING;

-- 6. Branding defaults
INSERT INTO branding_settings (firm_id, firm_name, tagline, primary_color)
VALUES ('00000000-0000-0000-0000-000000000001', 'My CA Firm', 'Excellence in Practice', '#5B6B7A')
ON CONFLICT DO NOTHING;

-- 7. Default leave rules
INSERT INTO leave_rules (firm_id, leave_type, total_days, carry_forward) VALUES
  ('00000000-0000-0000-0000-000000000001', 'casual',        12, false),
  ('00000000-0000-0000-0000-000000000001', 'sick',           8, false),
  ('00000000-0000-0000-0000-000000000001', 'paid',          15, true),
  ('00000000-0000-0000-0000-000000000001', 'work_from_home', 20, false)
ON CONFLICT DO NOTHING;

-- 8. Default notification configs
INSERT INTO notification_configs (firm_id, event_type, channels) VALUES
  ('00000000-0000-0000-0000-000000000001', 'leave_request',       '["inapp","email","whatsapp"]'),
  ('00000000-0000-0000-0000-000000000001', 'leave_approved',      '["inapp","email"]'),
  ('00000000-0000-0000-0000-000000000001', 'leave_rejected',      '["inapp","email"]'),
  ('00000000-0000-0000-0000-000000000001', 'timesheet_submitted', '["inapp"]'),
  ('00000000-0000-0000-0000-000000000001', 'timesheet_approved',  '["inapp"]'),
  ('00000000-0000-0000-0000-000000000001', 'timesheet_rejected',  '["inapp","email"]'),
  ('00000000-0000-0000-0000-000000000001', 'holiday_announced',   '["inapp","whatsapp"]'),
  ('00000000-0000-0000-0000-000000000001', 'notice_published',    '["inapp"]'),
  ('00000000-0000-0000-0000-000000000001', 'payroll_approved',    '["inapp","email"]'),
  ('00000000-0000-0000-0000-000000000001', 'payslip_ready',       '["inapp"]'),
  ('00000000-0000-0000-0000-000000000001', 'payslip_bulk_sent',   '["inapp"]')
ON CONFLICT DO NOTHING;


-- ============================================================
-- DONE
-- ============================================================
SELECT 'Database setup complete. Login: admin@cafirm.com / Admin@1234' AS result;
