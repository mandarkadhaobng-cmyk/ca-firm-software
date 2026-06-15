-- ── Weekly Reports ─────────────────────────────────────────────────────────────
-- Structured weekly report submitted by employees every week

CREATE TABLE IF NOT EXISTS weekly_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id          UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start       DATE NOT NULL,
  week_end         DATE NOT NULL,
  completed_work   TEXT,                  -- what was accomplished this week
  pending_work     TEXT,                  -- work that carried over / still in progress
  blockers         TEXT,                  -- impediments or issues
  next_week_plan   TEXT,                  -- plan for the coming week
  other_work       TEXT,                  -- ad-hoc / miscellaneous work
  total_hours      NUMERIC(6,2),          -- self-reported total hours
  status           VARCHAR(20) NOT NULL DEFAULT 'submitted'
                   CHECK (status IN ('draft','submitted','reviewed')),
  reviewed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  reviewer_remarks TEXT,
  submitted_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One report per user per week
  UNIQUE (firm_id, user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_reports_firm_week ON weekly_reports(firm_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_user      ON weekly_reports(user_id, week_start DESC);
