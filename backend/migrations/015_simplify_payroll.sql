-- ============================================================
-- Migration 015: Simplified Payroll Schema
-- Simple CA-firm payroll: monthly salary, absent deduction, reimbursement
-- Drops and recreates all payroll tables cleanly
-- ============================================================

-- Drop dependent tables first (order matters)
DROP TABLE IF EXISTS payroll_email_log    CASCADE;
DROP TABLE IF EXISTS payroll_approvals    CASCADE;
DROP TABLE IF EXISTS payroll_status_history CASCADE;
DROP TABLE IF EXISTS reimbursement_entries CASCADE;
DROP TABLE IF EXISTS salary_slips         CASCADE;
DROP TABLE IF EXISTS payroll_runs         CASCADE;
DROP TABLE IF EXISTS employee_salary      CASCADE;

-- ── 1. Employee Salary Config ────────────────────────────
-- Just one number: the monthly salary agreed with the employee
CREATE TABLE employee_salary (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  firm_id         UUID NOT NULL REFERENCES firms(id)  ON DELETE CASCADE,
  monthly_salary  NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  effective_from  DATE NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, firm_id)          -- one active config per employee per firm
);

-- ── 2. Payroll Runs ──────────────────────────────────────
-- One run per month per firm
-- Status: draft → approved → sent
CREATE TABLE payroll_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id          UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  month            SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year             SMALLINT NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  status           VARCHAR(20) NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','approved','sent')),
  working_days     SMALLINT NOT NULL DEFAULT 26,   -- auto-calculated (calendar - Sundays)
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

-- ── 3. Salary Slips ──────────────────────────────────────
-- One slip per employee per run
-- Formula: net_salary = monthly_salary - (absent_days * per_day_salary) + reimbursement
-- final_salary = ROUND(net_salary) + adjustment  (allow ±1)
CREATE TABLE salary_slips (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id    UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  firm_id           UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  month             SMALLINT NOT NULL,
  year              SMALLINT NOT NULL,

  -- Salary basis
  monthly_salary    NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Attendance (editable by HR/Partner)
  working_days      SMALLINT NOT NULL DEFAULT 26,
  present_days      SMALLINT NOT NULL DEFAULT 26,
  absent_days       SMALLINT NOT NULL DEFAULT 0,

  -- Computed values (stored for PDF reproducibility)
  per_day_salary    NUMERIC(12,4) NOT NULL DEFAULT 0,   -- monthly_salary / working_days
  absent_deduction  NUMERIC(12,2) NOT NULL DEFAULT 0,   -- per_day_salary * absent_days
  reimbursement     NUMERIC(12,2) NOT NULL DEFAULT 0,   -- manually added
  net_salary        NUMERIC(12,2) NOT NULL DEFAULT 0,   -- before rounding
  adjustment        NUMERIC(5,2)  NOT NULL DEFAULT 0,   -- ±1 manual tweak
  final_salary      NUMERIC(12,2) NOT NULL DEFAULT 0,   -- ROUND(net_salary) + adjustment

  -- Extra
  remarks           TEXT,
  is_locked         BOOLEAN NOT NULL DEFAULT false,     -- locked after approval

  -- Email delivery
  email_status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (email_status IN ('pending','sent','failed','skipped')),
  email_sent_at     TIMESTAMPTZ,
  email_error       TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (payroll_run_id, user_id)
);

-- ── 4. Email Log ─────────────────────────────────────────
-- One row per email attempt for audit/retry
CREATE TABLE payroll_email_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slip_id        UUID NOT NULL REFERENCES salary_slips(id) ON DELETE CASCADE,
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_email       VARCHAR(255) NOT NULL,
  status         VARCHAR(20) NOT NULL CHECK (status IN ('sent','failed')),
  error_message  TEXT,
  sent_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_emp_salary_firm     ON employee_salary(firm_id);
CREATE INDEX IF NOT EXISTS idx_emp_salary_user     ON employee_salary(user_id);
CREATE INDEX IF NOT EXISTS idx_pr_firm_month       ON payroll_runs(firm_id, month, year);
CREATE INDEX IF NOT EXISTS idx_slip_run            ON salary_slips(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_slip_user           ON salary_slips(user_id);
CREATE INDEX IF NOT EXISTS idx_slip_firm           ON salary_slips(firm_id);
CREATE INDEX IF NOT EXISTS idx_email_log_slip      ON payroll_email_log(slip_id);
CREATE INDEX IF NOT EXISTS idx_email_log_run       ON payroll_email_log(payroll_run_id);
