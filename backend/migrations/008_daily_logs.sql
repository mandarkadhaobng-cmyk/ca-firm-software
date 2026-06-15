-- ── Daily Logs ─────────────────────────────────────────────────────────────────
-- Tracks day-wise work done by an employee against an assignment (or general work)

CREATE TABLE IF NOT EXISTS daily_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id         UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_id   UUID REFERENCES assignments(id) ON DELETE SET NULL,
  log_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  hours_worked    NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (hours_worked >= 0 AND hours_worked <= 24),
  work_done       TEXT NOT NULL,
  blockers        TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'submitted'
                  CHECK (status IN ('draft','submitted','reviewed')),
  reviewed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  reviewer_remarks TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_logs_firm_date  ON daily_logs(firm_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user       ON daily_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_logs_assignment ON daily_logs(assignment_id);
