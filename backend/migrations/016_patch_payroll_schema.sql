-- ============================================================
-- Migration 016: Patch payroll tables to simplified schema
-- Safe ALTER TABLE approach — adds missing columns only,
-- does NOT drop existing data. Run this if 015 didn't apply.
-- ============================================================

-- ── employee_salary: add monthly_salary + missing cols ───────
ALTER TABLE employee_salary
  ADD COLUMN IF NOT EXISTS monthly_salary  NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes           TEXT,
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Back-fill monthly_salary from monthly_gross if present
UPDATE employee_salary
SET    monthly_salary = monthly_gross
WHERE  monthly_salary = 0 AND monthly_gross IS NOT NULL AND monthly_gross > 0;

-- ── salary_slips: add all new columns ────────────────────────
ALTER TABLE salary_slips
  ADD COLUMN IF NOT EXISTS working_days      SMALLINT      NOT NULL DEFAULT 26,
  ADD COLUMN IF NOT EXISTS present_days      SMALLINT      NOT NULL DEFAULT 26,
  ADD COLUMN IF NOT EXISTS absent_days       SMALLINT      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS per_day_salary    NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS absent_deduction  NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reimbursement     NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_salary        NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adjustment        NUMERIC(5,2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_salary      NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_salary    NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_locked         BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_status      VARCHAR(20)   NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS email_sent_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_error       TEXT,
  ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add email_status check constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'salary_slips_email_status_check'
  ) THEN
    ALTER TABLE salary_slips
      ADD CONSTRAINT salary_slips_email_status_check
      CHECK (email_status IN ('pending','sent','failed','skipped'));
  END IF;
END $$;

-- ── payroll_runs: add missing cols ───────────────────────────
ALTER TABLE payroll_runs
  ADD COLUMN IF NOT EXISTS working_days     SMALLINT       DEFAULT 26,
  ADD COLUMN IF NOT EXISTS total_employees  SMALLINT       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_deductions NUMERIC(14,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_net        NUMERIC(14,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_by      UUID           REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_at          TIMESTAMPTZ;

-- Fix status check constraint to include 'sent'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payroll_runs_status_check'
  ) THEN
    ALTER TABLE payroll_runs DROP CONSTRAINT payroll_runs_status_check;
  END IF;
  ALTER TABLE payroll_runs
    ADD CONSTRAINT payroll_runs_status_check
    CHECK (status IN ('draft','approved','sent'));
END $$;

-- ── payroll_email_log: create if not exists ──────────────────
CREATE TABLE IF NOT EXISTS payroll_email_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slip_id        UUID NOT NULL REFERENCES salary_slips(id) ON DELETE CASCADE,
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id)        ON DELETE CASCADE,
  to_email       VARCHAR(255) NOT NULL,
  status         VARCHAR(20)  NOT NULL CHECK (status IN ('sent','failed')),
  error_message  TEXT,
  sent_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Indexes (safe) ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_emp_salary_firm     ON employee_salary(firm_id);
CREATE INDEX IF NOT EXISTS idx_emp_salary_user     ON employee_salary(user_id);
CREATE INDEX IF NOT EXISTS idx_slip_run            ON salary_slips(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_slip_user           ON salary_slips(user_id);
CREATE INDEX IF NOT EXISTS idx_slip_firm           ON salary_slips(firm_id);
CREATE INDEX IF NOT EXISTS idx_email_log_slip      ON payroll_email_log(slip_id);
CREATE INDEX IF NOT EXISTS idx_email_log_run       ON payroll_email_log(payroll_run_id);

SELECT 'Migration 016 applied successfully' AS result;
