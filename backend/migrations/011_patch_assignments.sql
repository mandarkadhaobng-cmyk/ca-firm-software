-- ── Patch assignments table ────────────────────────────────────────────────────
-- Adds remarks/notes field and overdue index.
-- Safe to re-run (IF NOT EXISTS guards).

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Partial index to quickly find overdue assignments
CREATE INDEX IF NOT EXISTS idx_assignments_overdue
  ON assignments(firm_id, due_date)
  WHERE due_date IS NOT NULL
    AND status NOT IN ('completed','closed','cancelled');

SELECT 'Migration 011 done ✓' AS result;
