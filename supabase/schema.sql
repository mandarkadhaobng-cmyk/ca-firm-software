-- ============================================================
-- CA FIRM PRACTICE MANAGEMENT SOFTWARE - DATABASE SCHEMA
-- Run this SQL in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- FIRMS TABLE (Multi-firm support)
-- ============================================================
CREATE TABLE IF NOT EXISTS firms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  firm_code VARCHAR(50) UNIQUE NOT NULL,
  subdomain VARCHAR(100) UNIQUE,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  gst_number VARCHAR(20),
  pan_number VARCHAR(20),
  registration_number VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BRANDING SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS branding_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  logo_url TEXT,
  logo_dark_url TEXT,
  favicon_url TEXT,
  primary_color VARCHAR(20) DEFAULT '#5B6B7A',
  secondary_color VARCHAR(20) DEFAULT '#F7F9FC',
  firm_tagline VARCHAR(255),
  email_header_text TEXT,
  email_footer_text TEXT,
  pdf_header_text TEXT,
  pdf_footer_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROLES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DEPARTMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  head_user_id UUID,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id),
  department_id UUID REFERENCES departments(id),
  employee_id VARCHAR(50),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  mobile VARCHAR(20),
  designation VARCHAR(150),
  reporting_manager_id UUID REFERENCES users(id),
  assigned_partner_id UUID REFERENCES users(id),
  joining_date DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'resigned')),
  avatar_url TEXT,
  is_super_admin BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PERMISSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROLE PERMISSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- ============================================================
-- CLIENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  client_name VARCHAR(255) NOT NULL,
  client_code VARCHAR(50) NOT NULL,
  pan_number VARCHAR(20),
  gst_number VARCHAR(20),
  industry VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  assigned_partner_id UUID REFERENCES users(id),
  assigned_manager_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ASSIGNMENT TYPES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS assignment_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ASSIGNMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  assignment_number VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  assignment_type_id UUID REFERENCES assignment_types(id),
  assigned_partner_id UUID REFERENCES users(id),
  assigned_manager_id UUID REFERENCES users(id),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(30) DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'under_review', 'completed', 'closed', 'on_hold')),
  start_date DATE,
  due_date DATE,
  completed_date DATE,
  budgeted_hours DECIMAL(8,2) DEFAULT 0,
  actual_hours DECIMAL(8,2) DEFAULT 0,
  billable_hours DECIMAL(8,2) DEFAULT 0,
  financial_year VARCHAR(20),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ASSIGNMENT MEMBERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS assignment_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  allocated_hours DECIMAL(8,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id, user_id)
);

-- ============================================================
-- TIMESHEETS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS timesheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES assignments(id),
  client_id UUID REFERENCES clients(id),
  date DATE NOT NULL,
  hours_worked DECIMAL(5,2) NOT NULL CHECK (hours_worked > 0 AND hours_worked <= 24),
  billable_hours DECIMAL(5,2) DEFAULT 0,
  is_billable BOOLEAN DEFAULT TRUE,
  task_description TEXT NOT NULL,
  remarks TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'final_approved')),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- APPROVALS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  timesheet_id UUID REFERENCES timesheets(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES users(id),
  approval_level INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'sent_back')),
  comments TEXT,
  action_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LEAVES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS leaves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('casual', 'sick', 'paid', 'work_from_home', 'maternity', 'paternity', 'other')),
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  total_days DECIMAL(4,1) NOT NULL,
  is_half_day BOOLEAN DEFAULT FALSE,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID REFERENCES users(id),
  approval_comments TEXT,
  action_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID REFERENCES firms(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  module VARCHAR(100) NOT NULL,
  record_id UUID,
  record_type VARCHAR(100),
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LOGIN HISTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_info TEXT,
  location TEXT,
  status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'logout')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_firm_id ON users(firm_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_reporting_manager ON users(reporting_manager_id);
CREATE INDEX IF NOT EXISTS idx_clients_firm_id ON clients(firm_id);
CREATE INDEX IF NOT EXISTS idx_assignments_firm_id ON assignments(firm_id);
CREATE INDEX IF NOT EXISTS idx_assignments_client_id ON assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_timesheets_user_id ON timesheets(user_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_date ON timesheets(date);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status);
CREATE INDEX IF NOT EXISTS idx_timesheets_assignment_id ON timesheets(assignment_id);
CREATE INDEX IF NOT EXISTS idx_approvals_timesheet_id ON approvals(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_approvals_approver_id ON approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_leaves_user_id ON leaves(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE branding_settings ENABLE ROW LEVEL SECURITY;

-- Users can see their own firm data
CREATE POLICY "users_view_own_firm" ON users
  FOR SELECT USING (
    firm_id = (SELECT firm_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = auth.uid());

-- Firms policy
CREATE POLICY "users_view_own_firm_data" ON firms
  FOR SELECT USING (
    id = (SELECT firm_id FROM users WHERE id = auth.uid())
  );

-- Clients - firm members can view
CREATE POLICY "clients_firm_access" ON clients
  FOR ALL USING (
    firm_id = (SELECT firm_id FROM users WHERE id = auth.uid())
  );

-- Assignments - firm members can view
CREATE POLICY "assignments_firm_access" ON assignments
  FOR ALL USING (
    firm_id = (SELECT firm_id FROM users WHERE id = auth.uid())
  );

-- Timesheets - employees see own, managers see team
CREATE POLICY "timesheets_own_access" ON timesheets
  FOR SELECT USING (
    user_id = auth.uid()
    OR firm_id = (SELECT firm_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "timesheets_insert_own" ON timesheets
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "timesheets_update_own" ON timesheets
  FOR UPDATE USING (user_id = auth.uid() OR
    (SELECT role_id FROM users WHERE id = auth.uid()) IN (
      SELECT id FROM roles WHERE slug IN ('partner', 'manager', 'super_admin')
    )
  );

-- Notifications - recipients only
CREATE POLICY "notifications_own_access" ON notifications
  FOR ALL USING (recipient_id = auth.uid());

-- Leaves - own leaves + managers
CREATE POLICY "leaves_access" ON leaves
  FOR SELECT USING (
    user_id = auth.uid()
    OR firm_id = (SELECT firm_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "leaves_insert_own" ON leaves
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Departments
CREATE POLICY "departments_firm_access" ON departments
  FOR SELECT USING (
    firm_id = (SELECT firm_id FROM users WHERE id = auth.uid())
  );

-- Roles
CREATE POLICY "roles_firm_access" ON roles
  FOR SELECT USING (
    firm_id = (SELECT firm_id FROM users WHERE id = auth.uid()) OR is_system = TRUE
  );

-- Branding
CREATE POLICY "branding_firm_access" ON branding_settings
  FOR SELECT USING (
    firm_id = (SELECT firm_id FROM users WHERE id = auth.uid())
  );

-- Audit logs
CREATE POLICY "audit_logs_firm_access" ON audit_logs
  FOR SELECT USING (
    firm_id = (SELECT firm_id FROM users WHERE id = auth.uid())
  );

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_firms_updated_at BEFORE UPDATE ON firms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timesheets_updated_at BEFORE UPDATE ON timesheets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leaves_updated_at BEFORE UPDATE ON leaves FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_branding_updated_at BEFORE UPDATE ON branding_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
