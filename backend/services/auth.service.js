const bcrypt   = require('bcryptjs');
const { v4: uuid } = require('uuid');
const db       = require('../config/database');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../config/jwt');

const authService = {
  async login({ email, password, ip, userAgent, firmCode }) {
    const { rows } = await db.query(
      `SELECT u.*, r.slug as role, u.firm_id,
              f.firm_code, f.name as firm_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       JOIN firms f ON f.id = u.firm_id
       WHERE u.email = $1 AND u.status = 'active'`,
      [email.toLowerCase().trim()]
    );

    const user = rows[0];
    if (!user) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await this.logLogin(user.id, 'failed', ip, userAgent);
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    const payload = { id: user.id, firm_id: user.firm_id, role: user.role, email: user.email };
    const accessToken  = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Store refresh token
    await db.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at, ip_address, user_agent)
       VALUES ($1,$2, NOW() + INTERVAL '7 days', $3, $4)`,
      [user.id, refreshToken, ip, userAgent]
    );

    await this.logLogin(user.id, 'success', ip, userAgent);

    return {
      accessToken, refreshToken,
      user: {
        id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name,
        role: user.role, firmId: user.firm_id, firmName: user.firm_name,
        designation: user.designation, avatar: user.avatar_url,
      },
    };
  },

  async refreshToken(token) {
    let payload;
    try { payload = verifyRefreshToken(token); }
    catch { throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 }); }

    const { rows } = await db.query(
      `SELECT * FROM refresh_tokens WHERE token=$1 AND revoked=false AND expires_at > NOW()`,
      [token]
    );
    if (!rows.length) throw Object.assign(new Error('Refresh token expired'), { statusCode: 401 });

    const newAccess = generateAccessToken({ id: payload.id, firm_id: payload.firm_id, role: payload.role, email: payload.email });
    return { accessToken: newAccess };
  },

  async logout(refreshToken) {
    if (refreshToken) {
      await db.query(`UPDATE refresh_tokens SET revoked=true WHERE token=$1`, [refreshToken]);
    }
  },

  async forgotPassword(email, resetUrl) {
    const { rows } = await db.query(`SELECT id, first_name FROM users WHERE email=$1 AND status='active'`, [email]);
    if (!rows.length) return; // silent — don't reveal if email exists

    const token   = uuid();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      `INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1,$2,$3)
       ON CONFLICT (user_id) DO UPDATE SET token=$2, expires_at=$3, used=false`,
      [rows[0].id, token, expires]
    );

    const { sendEmail } = require('../notifications/email.provider');
    await sendEmail({
      to: email,
      subject: 'Reset your password — CA Practice Manager',
      html: `<p>Hi ${rows[0].first_name},</p>
             <p>Click the link below to reset your password (valid for 1 hour):</p>
             <p><a href="${resetUrl}/${token}">Reset Password</a></p>
             <p>If you did not request this, ignore this email.</p>`,
    });
  },

  async resetPassword(token, newPassword) {
    const { rows } = await db.query(
      `SELECT user_id FROM password_resets WHERE token=$1 AND expires_at > NOW() AND used=false`,
      [token]
    );
    if (!rows.length) throw Object.assign(new Error('Token invalid or expired'), { statusCode: 400 });

    const hash = await bcrypt.hash(newPassword, 12);
    await db.query(`UPDATE users SET password_hash=$1 WHERE id=$2`, [hash, rows[0].user_id]);
    await db.query(`UPDATE password_resets SET used=true WHERE token=$1`, [token]);

    // Revoke all refresh tokens for this user
    await db.query(`UPDATE refresh_tokens SET revoked=true WHERE user_id=$1`, [rows[0].user_id]);
  },

  async logLogin(userId, status, ip, userAgent) {
    await db.query(
      `INSERT INTO login_history (user_id, status, ip_address, user_agent) VALUES ($1,$2,$3,$4)`,
      [userId, status, ip, userAgent]
    ).catch(() => {});
  },

  async getLoginHistory(userId, firmId, limit = 20) {
    const { rows } = await db.query(
      `SELECT lh.* FROM login_history lh
       JOIN users u ON u.id = lh.user_id
       WHERE lh.user_id=$1 AND u.firm_id=$2
       ORDER BY lh.created_at DESC LIMIT $3`,
      [userId, firmId, limit]
    );
    return rows;
  },
};

module.exports = authService;
