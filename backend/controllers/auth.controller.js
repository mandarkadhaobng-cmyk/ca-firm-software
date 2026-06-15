const authService = require('../services/auth.service');
const { success, error, badRequest } = require('../utils/response');
const { generateAccessToken } = require('../config/jwt');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return badRequest(res, 'Email and password required');
  const result = await authService.login({
    email, password,
    ip: req.ip, userAgent: req.headers['user-agent'],
  });
  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  success(res, { accessToken: result.accessToken, user: result.user });
};

exports.refreshToken = async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!token) return error(res, 'Refresh token required', 401);
  const result = await authService.refreshToken(token);
  success(res, result);
};

exports.logout = async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  await authService.logout(token);
  res.clearCookie('refreshToken');
  success(res, null, 'Logged out successfully');
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return badRequest(res, 'Email required');
  const resetUrl = `${process.env.APP_URL}/reset-password`;
  await authService.forgotPassword(email, resetUrl);
  success(res, null, 'If this email exists, a reset link has been sent');
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return badRequest(res, 'Token and password required');
  if (password.length < 8) return badRequest(res, 'Password must be at least 8 characters');
  await authService.resetPassword(token, password);
  success(res, null, 'Password reset successfully');
};

exports.me = async (req, res) => {
  const db = require('../config/database');
  const { rows } = await db.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.designation,
            u.avatar_url, u.employee_id, u.join_date, u.status,
            u.firm_id, u.department_id, u.branch_id,
            r.slug  AS role,
            r.name  AS role_name,
            d.name  AS department_name,
            b.name  AS branch_name,
            f.name  AS firm_name
     FROM users u
     LEFT JOIN roles       r ON r.id = u.role_id
     LEFT JOIN departments d ON d.id = u.department_id
     LEFT JOIN branches    b ON b.id = u.branch_id
     LEFT JOIN firms       f ON f.id = u.firm_id
     WHERE u.id = $1`,
    [req.user.id]
  );
  if (!rows.length) return error(res, 'User not found', 404);
  const u = rows[0];
  // Return camelCase — identical shape to what login() returns
  success(res, {
    id:             u.id,
    email:          u.email,
    firstName:      u.first_name,
    lastName:       u.last_name,
    phone:          u.phone,
    designation:    u.designation,
    avatar:         u.avatar_url,
    employeeId:     u.employee_id,
    joinDate:       u.join_date,
    status:         u.status,
    role:           u.role,
    roleName:       u.role_name,
    firmId:         u.firm_id,
    firmName:       u.firm_name,
    departmentId:   u.department_id,
    departmentName: u.department_name,
    branchId:       u.branch_id,
    branchName:     u.branch_name,
  });
};

exports.changePassword = async (req, res) => {
  const bcrypt = require('bcryptjs');
  const db = require('../config/database');
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return badRequest(res, 'Both passwords required');

  const { rows } = await db.query(`SELECT password_hash FROM users WHERE id=$1`, [req.user.id]);
  const valid = await bcrypt.compare(currentPassword, rows[0]?.password_hash || '');
  if (!valid) return error(res, 'Current password incorrect', 400);

  const hash = await bcrypt.hash(newPassword, 12);
  await db.query(`UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2`, [hash, req.user.id]);
  success(res, null, 'Password changed successfully');
};

exports.loginHistory = async (req, res) => {
  const history = await authService.getLoginHistory(req.user.id, req.user.firm_id);
  success(res, history);
};
