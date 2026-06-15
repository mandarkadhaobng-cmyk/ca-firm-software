-- ============================================================
-- SEED DATA - Run AFTER schema.sql
-- ============================================================

-- Insert demo firm
INSERT INTO firms (id, name, firm_code, subdomain, city, state, country, email, phone)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Demo CA Firm LLP',
  'DEMO001',
  'demo',
  'Mumbai',
  'Maharashtra',
  'India',
  'admin@democafirm.com',
  '+91-9876543210'
) ON CONFLICT (firm_code) DO NOTHING;

-- Insert system roles
INSERT INTO roles (id, firm_id, name, slug, description, is_system) VALUES
  ('r1000000-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Super Admin', 'super_admin', 'Full system access', TRUE),
  ('r1000000-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Partner', 'partner', 'Partner level access', TRUE),
  ('r1000000-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Manager', 'manager', 'Manager level access', TRUE),
  ('r1000000-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Employee', 'employee', 'Standard employee access', TRUE),
  ('r1000000-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Article', 'article', 'Article/Intern access', TRUE)
ON CONFLICT DO NOTHING;

-- Insert departments
INSERT INTO departments (id, firm_id, name, code) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Audit & Assurance', 'AUDIT'),
  ('d1000000-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Tax & Compliance', 'TAX'),
  ('d1000000-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Advisory & Consulting', 'ADVISORY'),
  ('d1000000-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'GST & Indirect Tax', 'GST'),
  ('d1000000-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Corporate Law', 'CORP'),
  ('d1000000-0000-0000-0000-000000000006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Accounts & Finance', 'ACCOUNTS'),
  ('d1000000-0000-0000-0000-000000000007', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Administration', 'ADMIN')
ON CONFLICT DO NOTHING;

-- Insert assignment types
INSERT INTO assignment_types (firm_id, name, code) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Statutory Audit', 'STAT_AUDIT'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Tax Audit', 'TAX_AUDIT'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'GST Filing', 'GST_FILING'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Income Tax Return', 'ITR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ROC Filing', 'ROC'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Internal Audit', 'INT_AUDIT'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Due Diligence', 'DD'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Consulting', 'CONSULTING'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'TDS Filing', 'TDS'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Payroll Processing', 'PAYROLL')
ON CONFLICT DO NOTHING;

-- Insert permissions
INSERT INTO permissions (module, action, slug, description) VALUES
  ('employees', 'view', 'employees.view', 'View employee list'),
  ('employees', 'create', 'employees.create', 'Create new employee'),
  ('employees', 'edit', 'employees.edit', 'Edit employee details'),
  ('employees', 'delete', 'employees.delete', 'Delete employee'),
  ('clients', 'view', 'clients.view', 'View client list'),
  ('clients', 'create', 'clients.create', 'Create new client'),
  ('clients', 'edit', 'clients.edit', 'Edit client details'),
  ('clients', 'delete', 'clients.delete', 'Delete client'),
  ('assignments', 'view', 'assignments.view', 'View assignments'),
  ('assignments', 'create', 'assignments.create', 'Create assignment'),
  ('assignments', 'edit', 'assignments.edit', 'Edit assignment'),
  ('assignments', 'delete', 'assignments.delete', 'Delete assignment'),
  ('timesheets', 'view', 'timesheets.view', 'View timesheets'),
  ('timesheets', 'create', 'timesheets.create', 'Create timesheet'),
  ('timesheets', 'edit', 'timesheets.edit', 'Edit timesheet'),
  ('timesheets', 'approve', 'timesheets.approve', 'Approve timesheets'),
  ('timesheets', 'view_all', 'timesheets.view_all', 'View all timesheets'),
  ('leaves', 'view', 'leaves.view', 'View own leaves'),
  ('leaves', 'create', 'leaves.create', 'Apply for leave'),
  ('leaves', 'approve', 'leaves.approve', 'Approve leave requests'),
  ('leaves', 'view_all', 'leaves.view_all', 'View all leaves'),
  ('reports', 'view', 'reports.view', 'View reports'),
  ('reports', 'export', 'reports.export', 'Export reports'),
  ('settings', 'view', 'settings.view', 'View settings'),
  ('settings', 'edit', 'settings.edit', 'Edit settings'),
  ('users', 'manage', 'users.manage', 'Manage all users')
ON CONFLICT (slug) DO NOTHING;

-- Insert branding settings for demo firm
INSERT INTO branding_settings (firm_id, primary_color, firm_tagline)
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '#5B6B7A', 'Excellence in Every Engagement')
ON CONFLICT DO NOTHING;
