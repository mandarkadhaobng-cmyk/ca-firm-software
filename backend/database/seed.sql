-- Seed initial data for CA Firm
-- Run AFTER schema.sql

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
  ('00000000-0000-0000-0000-000000000001', 'Audit',           'AUD'),
  ('00000000-0000-0000-0000-000000000001', 'Taxation',        'TAX'),
  ('00000000-0000-0000-0000-000000000001', 'Accounts',        'ACC'),
  ('00000000-0000-0000-0000-000000000001', 'Advisory',        'ADV'),
  ('00000000-0000-0000-0000-000000000001', 'Administration',  'ADM')
ON CONFLICT DO NOTHING;

-- 5. Super admin user (password: Admin@1234)
INSERT INTO users (id, firm_id, role_id, branch_id, first_name, last_name, email, password_hash, employee_id, designation, status)
VALUES (
  '30000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'Super', 'Admin', 'admin@cafirm.com',
  '$2a$12$MVLdjMcuk6GecB2GhlrPcuVXT.FHtaqaIcVu4YLZkgAClrH.dm2DS', -- Admin@1234
  'EMP001', 'System Administrator', 'active'
) ON CONFLICT DO NOTHING;

-- 6. Branding defaults
INSERT INTO branding_settings (firm_id, firm_name, tagline, primary_color)
VALUES ('00000000-0000-0000-0000-000000000001', 'My CA Firm', 'Excellence in Practice', '#5B6B7A')
ON CONFLICT DO NOTHING;

-- 7. Default leave rules
INSERT INTO leave_rules (firm_id, leave_type, total_days, carry_forward) VALUES
  ('00000000-0000-0000-0000-000000000001', 'casual',       12, false),
  ('00000000-0000-0000-0000-000000000001', 'sick',          8, false),
  ('00000000-0000-0000-0000-000000000001', 'paid',         15, true),
  ('00000000-0000-0000-0000-000000000001', 'work_from_home',20, false)
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

SELECT 'Seed data inserted ✓' as result;
