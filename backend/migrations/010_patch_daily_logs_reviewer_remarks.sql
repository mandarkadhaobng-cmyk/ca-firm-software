-- Patch: add reviewer_remarks to daily_logs if it was created without it
-- Safe to run multiple times (IF NOT EXISTS guard)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_logs' AND column_name = 'reviewer_remarks'
  ) THEN
    ALTER TABLE daily_logs ADD COLUMN reviewer_remarks TEXT;
  END IF;
END$$;
