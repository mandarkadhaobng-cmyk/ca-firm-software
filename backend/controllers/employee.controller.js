const employeeService = require('../services/employee.service');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../services/email.service');
const db = require('../config/database');
const { success, created, paginated, notFound, badRequest } = require('../utils/response');

// Helper: get firm name for emails
const getFirmName = async (firmId) => {
  try {
    const { rows } = await db.query(
      `SELECT COALESCE(bs.firm_name, f.name) AS name
         FROM firms f
    LEFT JOIN branding_settings bs ON bs.firm_id = f.id
        WHERE f.id = $1 LIMIT 1`,
      [firmId]
    );
    return rows[0]?.name || process.env.FIRM_NAME || 'CA Firm';
  } catch { return process.env.FIRM_NAME || 'CA Firm'; }
};

/**
 * Convert empty string / undefined → null so PostgreSQL
 * doesn't receive "" which is invalid for type uuid or date.
 */
const uuid = (v) => (v && v !== '' ? v : null);

/**
 * Normalize incoming payload: accept both snake_case (from the React form)
 * and camelCase (from API clients).  Always returns camelCase for the service.
 */
const normalizeBody = (body) => ({
  firstName:          body.firstName          ?? body.first_name        ?? null,
  lastName:           body.lastName           ?? body.last_name         ?? null,
  email:              body.email              ?? null,
  phone:              body.phone              ?? body.mobile            ?? body.phone_number ?? null,
  employeeId:         body.employeeId         ?? body.employee_id       ?? null,
  designation:        body.designation        ?? null,
  roleId:             uuid(body.roleId        ?? body.role_id),
  departmentId:       uuid(body.departmentId  ?? body.department_id),
  branchId:           uuid(body.branchId      ?? body.branch_id),
  reportingManagerId: uuid(body.reportingManagerId ?? body.reporting_manager_id),
  joinDate:           uuid(body.joinDate      ?? body.join_date         ?? body.joining_date),
  status:             body.status             ?? null,
  password:           body.password           ?? null,
  // Payroll / banking fields (requires migration 018)
  panNumber:          body.panNumber          ?? body.pan_number        ?? undefined,
  bankName:           body.bankName           ?? body.bank_name         ?? undefined,
  accountNumber:      body.accountNumber      ?? body.account_number    ?? undefined,
  ifscCode:           body.ifscCode           ?? body.ifsc_code         ?? undefined,
});

exports.getAll = async (req, res) => {
  const { search, status, departmentId, roleSlug, page = 1, pageSize = 15 } = req.query;
  const { data, total } = await employeeService.getAll({
    firmId: req.user.firm_id, search, status, departmentId, roleSlug, page, pageSize,
  });
  paginated(res, data, total, page, pageSize);
};

exports.getById = async (req, res) => {
  const emp = await employeeService.getById(req.params.id, req.user.firm_id);
  if (!emp) return notFound(res, 'Employee not found');
  success(res, emp);
};

exports.create = async (req, res) => {
  const normalized = normalizeBody(req.body);
  if (!normalized.firstName) return badRequest(res, 'First name is required');
  if (!normalized.lastName)  return badRequest(res, 'Last name is required');
  if (!normalized.email)     return badRequest(res, 'Email is required');

  const emp = await employeeService.create({
    firmId: req.user.firm_id, createdBy: req.user.id, data: normalized,
  });
  await req.audit('create', 'employee', emp.id, { name: `${emp.first_name} ${emp.last_name}` });

  // Send welcome email non-blocking (don't let email failure block the API response)
  if (normalized.email) {
    getFirmName(req.user.firm_id).then(firmName => {
      sendWelcomeEmail(normalized.email, {
        firstName: normalized.firstName,
        lastName:  normalized.lastName,
        password:  normalized.password || 'Welcome@123',
        firmName,
      });
    }).catch(() => {}); // fire-and-forget
  }

  created(res, emp, 'Employee created successfully');
};

exports.update = async (req, res) => {
  const normalized = normalizeBody(req.body);
  const emp = await employeeService.update(req.params.id, req.user.firm_id, normalized);
  if (!emp) return notFound(res, 'Employee not found');
  await req.audit('update', 'employee', req.params.id, req.body);
  success(res, emp, 'Employee updated successfully');
};

exports.deactivate = async (req, res) => {
  await employeeService.update(req.params.id, req.user.firm_id, { status: 'inactive' });
  await req.audit('deactivate', 'employee', req.params.id);
  success(res, null, 'Employee deactivated');
};

exports.remove = async (req, res) => {
  if (req.params.id === req.user.id)
    return badRequest(res, 'You cannot delete your own account');
  await employeeService.remove(req.params.id, req.user.firm_id);
  await req.audit('delete', 'employee', req.params.id);
  success(res, null, 'Employee deleted permanently');
};

exports.getDropdown = async (req, res) => {
  const data = await employeeService.getDropdownList(req.user.firm_id);
  success(res, data);
};

/**
 * PATCH /:id/reset-password
 * Admin-only: forcefully reset any user's password within the firm.
 */
exports.adminResetPassword = async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 8)
    return badRequest(res, 'Password must be at least 8 characters');

  await employeeService.adminResetPassword(req.params.id, req.user.firm_id, password);
  await req.audit('reset_password', 'user', req.params.id, { by: req.user.email });

  // Notify the user of their new password — non-blocking
  const emp = await employeeService.getById(req.params.id, req.user.firm_id).catch(() => null);
  if (emp?.email) {
    getFirmName(req.user.firm_id).then(firmName => {
      sendPasswordResetEmail(emp.email, {
        firstName: emp.first_name,
        newPassword: password,
        firmName,
      });
    }).catch(() => {});
  }

  success(res, null, 'Password reset successfully');
};

/**
 * PATCH /:id/change-email
 * Admin-only: change a user's login email within the firm.
 */
exports.adminChangeEmail = async (req, res) => {
  const { email } = req.body;
  if (!email) return badRequest(res, 'Email is required');

  await employeeService.adminChangeEmail(req.params.id, req.user.firm_id, email);
  await req.audit('change_email', 'user', req.params.id, { newEmail: email, by: req.user.email });
  success(res, null, 'Email updated successfully');
};
