-- Fix assignment_types table
ALTER TABLE assignment_types ADD COLUMN IF NOT EXISTS description  TEXT;
ALTER TABLE assignment_types ADD COLUMN IF NOT EXISTS is_billable  BOOLEAN DEFAULT true;
ALTER TABLE assignment_types ADD COLUMN IF NOT EXISTS default_hours DECIMAL(8,2);
ALTER TABLE assignment_types ADD COLUMN IF NOT EXISTS color        VARCHAR(20);
ALTER TABLE assignment_types ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();

-- Fix assignments table
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS manager_id       UUID REFERENCES users(id);
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS start_date       DATE;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS estimated_hours  DECIMAL(8,2);
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS is_billable      BOOLEAN DEFAULT true;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS progress         INT DEFAULT 0;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS completed_date   DATE;

-- Copy existing assigned_manager_id -> manager_id
UPDATE assignments SET manager_id = assigned_manager_id WHERE manager_id IS NULL;

-- Fix assignment_members table
ALTER TABLE assignment_members ADD COLUMN IF NOT EXISTS is_active  BOOLEAN DEFAULT true;
ALTER TABLE assignment_members ADD COLUMN IF NOT EXISTS role       VARCHAR(50) DEFAULT 'member';
ALTER TABLE assignment_members ADD COLUMN IF NOT EXISTS joined_at  TIMESTAMPTZ DEFAULT NOW();

SELECT 'Assignments migration done ✓' AS result;
