-- Migration 014: Fix payroll table columns (drop & recreate empty tables)
-- Safe to run — no payroll data exists yet

DROP TABLE IF EXISTS reimbursement_entries CASCADE;
DROP TABLE IF EXISTS payroll_status_history CASCADE;
DROP TABLE IF EXISTS payroll_approvals CASCADE;
DROP TABLE IF EXISTS salary_slips CASCADE;
DROP TABLE IF EXISTS payroll_runs CASCADE;
DROP TABLE IF EXISTS employee_salary CASCADE;

-- 1. Employee salary configuration
CREATE TABLE employee_salary (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  firm_id               UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  monthly_gross         NUMERIC(12,2) NOT NULL DEFAULT 0,
  basic_pay             NUMERIC(12,2) NOT NULL DEFAULT 0,
  hra                   NUMERIC(12,2) NOT NULL DEFAULT 0,
  conveyance_allowance  NUMERIC(12,2) NOT NULL DEFAULT 0,
  medical_allowance     NUMERIC(12,2) NOT NULL DEFAULT 0,
  special_allowance     NUMERIC(12,2) NOT NULL DEFAULT 0,
  pf                    NUMERIC(12,2) NOT NULL DEFAULT 0,
  esic                  NUMERIC(12,2) NOT NULL DEFAULT 0,
  professional_tax      NUMERIC(12,2) NOT NULL DEFAULT 0,
  tds                   NUMERIC(12,2) NOT NULL DEFAULT 0,
  working_days_per_month SMALLINT NOT NULL DEFAULT 26,
  effective_from        DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_by            UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Payroll runs
CREATE TABLE payroll_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id           UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  month             SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year              SMALLINT NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','under_review','pending_approval','approved','rejected','locked','sent')),
  total_employees   INT DEFAULT 0,
  total_gross       NUMERIC(14,2) DEFAULT 0,
  total_deductions  NUMERIC(14,2) DEFAULT 0,
  total_net         NUMERIC(14,2) DEFAULT 0,
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (firm_id, month, year)
);

-- 3. Salary slips
CREATE TABLE salary_slips (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id    UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  firm_id           UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  month             SMALLINT NOT NULL,
  year              SMALLINT NOT NULL,
  working_days      SMALLINT NOT NULL DEFAULT 26,
  present_days      NUMERIC(5,1) NOT NULL DEFAULT 0,
  paid_leave_days   NUMERIC(5,1) NOT NULL DEFAULT 0,
  per_day_salary    NUMERIC(12,2) NOT NULL DEFAULT 0,
  calculated_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  pro_basic_pay     NUMERIC(12,2) NOT NULL DEFAULT 0,
  pro_hra           NUMERIC(12,2) NOT NULL DEFAULT 0,
  pro_conveyance    NUMERIC(12,2) NOT NULL DEFAULT 0,
  pro_medical       NUMERIC(12,2) NOT NULL DEFAULT 0,
  pro_special       NUMERIC(12,2) NOT NULL DEFAULT 0,
  gross_earnings    NUMERIC(12,2) NOT NULL DEFAULT 0,
  pf_deduction      NUMERIC(12,2) NOT NULL DEFAULT 0,
  esic_deduction    NUMERIC(12,2) NOT NULL DEFAULT 0,
  professional_tax  NUMERIC(12,2) NOT NULL DEFAULT 0,
  tds_deduction     NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_deductions  NUMERIC(12,2) NOT NULL DEFAULT 0,
  reimbursement     NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonus_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_pay           NUMERIC(12,2) NOT NULL DEFAULT 0,
  status            VARCHAR(20) NOT NULL DEFAULT 'draft',
  generated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Payroll approvals
CREATE TABLE payroll_approvals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  approver_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status         VARCHAR(20) NOT NULL CHECK (status IN ('approved','rejected')),
  remarks        TEXT,
  approved_at    TIMESTAMPTZ,
  UNIQUE (payroll_run_id, approver_id)
);

-- 5. Status history
CREATE TABLE payroll_status_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  from_status    VARCHAR(20),
  to_status      VARCHAR(20) NOT NULL,
  changed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  remarks        TEXT,
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Reimbursements
CREATE TABLE reimbursement_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salary_slip_id UUID REFERENCES salary_slips(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  firm_id        UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  description    VARCHAR(200) NOT NULL,
  amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  receipt_url    TEXT,
  approved_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_employee_salary_user  ON employee_salary(user_id);
CREATE INDEX idx_employee_salary_firm  ON employee_salary(firm_id, is_active);
CREATE INDEX idx_payroll_runs_firm     ON payroll_runs(firm_id, year DESC, month DESC);
CREATE INDEX idx_salary_slips_run      ON salary_slips(payroll_run_id);
CREATE INDEX idx_salary_slips_user     ON salary_slips(user_id, year DESC, month DESC);
CREATE INDEX idx_salary_slips_firm     ON salary_slips(firm_id);
CREATE INDEX idx_payroll_status_hist   ON payroll_status_history(payroll_run_id);
