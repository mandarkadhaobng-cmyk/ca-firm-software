/**
 * Email Service — wraps the email provider with business-level templates
 * Fix for Gmail "535 Username and Password not accepted":
 *   Use an App Password: https://myaccount.google.com/apppasswords
 *   Set SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_USER=you@gmail.com, SMTP_PASS=<16-char-app-password>
 */
const { sendEmail } = require('../notifications/email.provider');

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

/**
 * Send payslip email with PDF attachment
 */
const sendPayslipEmail = async (toEmail, slip, pdfBuffer) => {
  const monthName   = MONTHS[(slip.month || 1) - 1];
  const periodLabel = monthName + ' ' + slip.year;
  const empName     = ((slip.first_name || '') + ' ' + (slip.last_name || '')).trim();
  const firmName    = slip.firm_name    || process.env.FIRM_NAME || 'CA Firm';
  const netSalary   = parseFloat(slip.final_salary || 0).toLocaleString('en-IN',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const subject = 'Salary Payslip — ' + periodLabel + ' | ' + firmName;

  const html = buildPayslipEmail({
    empName,
    periodLabel,
    netSalary,
    firmName,
    firmLogo:    slip.firm_logo    || '',
    firmAddress: slip.firm_address || '',
    firmPhone:   slip.firm_phone   || '',
    firmEmail:   slip.firm_email   || '',
    firmWebsite: slip.firm_website || '',
    designation: slip.designation  || '',
    department:  slip.department_name || '',
  });

  const transporter = buildTransporter();
  if (!transporter) throw new Error('SMTP not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS in .env');

  return transporter.sendMail({
    from:        process.env.EMAIL_FROM || (firmName + ' <' + process.env.SMTP_USER + '>'),
    to:          toEmail,
    subject,
    html,
    text:        'Dear ' + empName + ', please find your salary payslip for ' + periodLabel + ' attached.',
    attachments: [
      {
        filename:    'Payslip_' + empName.replace(/\s+/g, '_') + '_' + periodLabel.replace(/\s+/g, '_') + '.pdf',
        content:     pdfBuffer,
        contentType: 'application/pdf',
      }
    ],
  });
};

const buildTransporter = () => {
  const nodemailer = require('nodemailer');
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  const port   = parseInt(process.env.SMTP_PORT) || 587;
  const secure = port === 465;

  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    requireTLS: !secure,
    tls: { rejectUnauthorized: false, ciphers: 'SSLv3' },
    connectionTimeout: 10000,
    greetingTimeout:   10000,
    socketTimeout:     15000,
  });
  return transport;
};

const buildPayslipEmail = ({ empName, periodLabel, netSalary, firmName, firmLogo,
                             firmAddress, firmPhone, firmEmail, firmWebsite, designation, department }) => {
  const year = new Date().getFullYear();
  const genDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  // Logo row — only if a URL is provided
  const logoHtml = firmLogo && firmLogo.startsWith('http')
    ? '<img src="' + firmLogo + '" alt="' + firmName + '" style="max-height:48px;max-width:160px;object-fit:contain;display:block;"/>'
    : '<span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">' + firmName + '</span>';

  // Firm contact footer line
  const contactParts = [firmPhone, firmEmail, firmWebsite].filter(Boolean);
  const contactLine  = contactParts.join('  &nbsp;|&nbsp;  ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Salary Payslip – ${periodLabel}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f9;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f9;padding:32px 12px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0"
  style="background:#ffffff;border-radius:12px;overflow:hidden;
         box-shadow:0 4px 24px rgba(0,0,0,0.10);max-width:600px;width:100%;">

  <!-- HEADER -->
  <tr>
    <td style="background:#1a3a5c;padding:24px 32px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">${logoHtml}</td>
          <td style="text-align:right;vertical-align:middle;">
            <span style="background:rgba(255,255,255,0.15);color:#fff;font-size:11px;
                         font-weight:600;padding:4px 12px;border-radius:20px;letter-spacing:0.5px;">
              SALARY PAYSLIP
            </span>
          </td>
        </tr>
      </table>
      ${firmAddress ? '<p style="margin:10px 0 0;color:rgba(255,255,255,0.60);font-size:11px;">' + firmAddress + '</p>' : ''}
      ${contactLine ? '<p style="margin:4px 0 0;color:rgba(255,255,255,0.55);font-size:11px;">' + contactLine + '</p>' : ''}
    </td>
  </tr>

  <!-- GREETING -->
  <tr>
    <td style="padding:28px 32px 20px;">
      <p style="margin:0 0 6px;color:#374151;font-size:16px;">Dear <strong>${empName}</strong>,</p>
      <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.7;">
        Please find your salary payslip for <strong>${periodLabel}</strong> attached to this email.
        Kindly save it for your records.
      </p>
    </td>
  </tr>

  <!-- PAYSLIP SUMMARY CARD -->
  <tr>
    <td style="padding:0 32px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0"
        style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
        <!-- Card header -->
        <tr>
          <td colspan="2" style="background:#f8fafc;padding:12px 16px;border-bottom:1px solid #e5e7eb;">
            <span style="font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.6px;">PAYSLIP DETAILS</span>
          </td>
        </tr>
        <!-- Details rows -->
        <tr>
          <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Employee</td>
          <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:600;text-align:right;border-bottom:1px solid #f3f4f6;">${empName}</td>
        </tr>
        ${designation ? `<tr>
          <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Designation</td>
          <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:600;text-align:right;border-bottom:1px solid #f3f4f6;">${designation}</td>
        </tr>` : ''}
        ${department ? `<tr>
          <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Department</td>
          <td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:600;text-align:right;border-bottom:1px solid #f3f4f6;">${department}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Salary Period</td>
          <td style="padding:10px 16px;font-size:13px;color:#1a3a5c;font-weight:700;text-align:right;border-bottom:1px solid #f3f4f6;">${periodLabel}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Generated On</td>
          <td style="padding:10px 16px;font-size:13px;color:#374151;text-align:right;border-bottom:1px solid #f3f4f6;">${genDate}</td>
        </tr>
        <!-- Net Pay highlight row -->
        <tr>
          <td style="padding:14px 16px;background:#f0fdf4;">
            <span style="font-size:13px;color:#15803d;font-weight:700;">Net Salary Payable</span>
          </td>
          <td style="padding:14px 16px;background:#f0fdf4;text-align:right;">
            <span style="font-size:20px;color:#15803d;font-weight:800;">&#8377;&nbsp;${netSalary}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- NOTE -->
  <tr>
    <td style="padding:0 32px 28px;">
      <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.6;">
        The detailed payslip PDF is attached to this email. If you have any questions about your salary,
        please contact the HR team.
      </p>
    </td>
  </tr>

  <!-- SIGN-OFF -->
  <tr>
    <td style="padding:0 32px 28px;border-top:1px solid #f3f4f6;">
      <p style="margin:16px 0 4px;color:#374151;font-size:13px;">Regards,</p>
      <p style="margin:0;color:#1a3a5c;font-size:13px;font-weight:700;">${firmName}</p>
      ${firmEmail ? '<p style="margin:4px 0 0;color:#6b7280;font-size:12px;">' + firmEmail + '</p>' : ''}
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:14px 32px;text-align:center;">
      <p style="margin:0;color:#9ca3af;font-size:10px;line-height:1.6;">
        This is a confidential payslip. Please do not share or forward it.&nbsp;&nbsp;
        &copy; ${year} ${firmName}
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
};

/**
 * Send welcome email to a newly created employee
 */
const sendWelcomeEmail = async (toEmail, { firstName, lastName, password, firmName, loginUrl }) => {
  const transporter = buildTransporter();
  if (!transporter) return; // SMTP not configured — skip silently

  const name = `${firstName || ''} ${lastName || ''}`.trim();
  const year = new Date().getFullYear();
  const appUrl = loginUrl || process.env.APP_URL || 'http://localhost:5173';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Welcome to ${firmName}</title></head>
<body style="margin:0;padding:0;background:#f0f4f9;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f9;padding:32px 12px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0"
  style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10);max-width:600px;width:100%;">
  <tr>
    <td style="background:#1a3a5c;padding:28px 32px;">
      <p style="margin:0;color:#fff;font-size:22px;font-weight:800;">${firmName}</p>
      <p style="margin:6px 0 0;color:rgba(255,255,255,.65);font-size:12px;">Welcome aboard!</p>
    </td>
  </tr>
  <tr>
    <td style="padding:32px;">
      <p style="margin:0 0 12px;color:#374151;font-size:16px;">Hi <strong>${name}</strong>,</p>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.7;">
        Your account has been created at <strong>${firmName}</strong>. Here are your login credentials:
      </p>
      <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#6b7280;width:40%;">Login Email</td>
            <td style="padding:8px 0;font-size:13px;color:#111827;font-weight:600;">${toEmail}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#6b7280;border-top:1px solid #f3f4f6;">Password</td>
            <td style="padding:8px 0;font-size:13px;color:#111827;font-weight:600;border-top:1px solid #f3f4f6;font-family:monospace;">${password}</td>
          </tr>
        </table>
      </div>
      <p style="margin:0 0 20px;color:#6b7280;font-size:13px;">
        Please log in and change your password on your first visit.
      </p>
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${appUrl}" style="background:#1a3a5c;color:#fff;text-decoration:none;
           padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">
          Log In to Your Account
        </a>
      </div>
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        If you have any issues logging in, please contact your HR administrator.
      </p>
    </td>
  </tr>
  <tr>
    <td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:14px 32px;text-align:center;">
      <p style="margin:0;color:#9ca3af;font-size:10px;">&copy; ${year} ${firmName}. This is an automated message.</p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return transporter.sendMail({
    from:    process.env.EMAIL_FROM || (firmName + ' <' + process.env.SMTP_USER + '>'),
    to:      toEmail,
    subject: `Welcome to ${firmName} — Your Account Details`,
    html,
    text:    `Hi ${name}, your account has been created at ${firmName}. Login: ${toEmail} | Password: ${password} | URL: ${appUrl}`,
  });
};

/**
 * Send password reset notification
 */
const sendPasswordResetEmail = async (toEmail, { firstName, newPassword, firmName }) => {
  const transporter = buildTransporter();
  if (!transporter) return;

  const year = new Date().getFullYear();
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f0f4f9;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f9;padding:32px 12px;">
<tr><td align="center">
<table width="500" cellpadding="0" cellspacing="0"
  style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10);max-width:500px;width:100%;">
  <tr><td style="background:#1a3a5c;padding:24px 32px;">
    <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">${firmName}</p>
  </td></tr>
  <tr><td style="padding:28px 32px;">
    <p style="margin:0 0 12px;color:#374151;font-size:15px;">Hi <strong>${firstName || 'there'}</strong>,</p>
    <p style="margin:0 0 20px;color:#6b7280;font-size:13px;line-height:1.7;">
      Your password has been reset by an administrator. Your new temporary password is:
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;text-align:center;margin-bottom:20px;">
      <p style="margin:0;font-size:18px;font-weight:800;color:#15803d;font-family:monospace;letter-spacing:2px;">${newPassword}</p>
    </div>
    <p style="margin:0;color:#6b7280;font-size:12px;">
      Please log in and change this password immediately for security. Contact HR if you did not expect this.
    </p>
  </td></tr>
  <tr><td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:12px 32px;text-align:center;">
    <p style="margin:0;color:#9ca3af;font-size:10px;">&copy; ${year} ${firmName}</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  return transporter.sendMail({
    from:    process.env.EMAIL_FROM || (firmName + ' <' + process.env.SMTP_USER + '>'),
    to:      toEmail,
    subject: `Your password has been reset — ${firmName}`,
    html,
    text:    `Hi ${firstName}, your password has been reset. New password: ${newPassword}. Please log in and change it immediately.`,
  });
};

/**
 * Test SMTP connection — used by admin settings
 */
const testSmtpConnection = async () => {
  const t = buildTransporter();
  if (!t) throw new Error('SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in your .env file.');
  await t.verify();
  return { ok: true, host: process.env.SMTP_HOST, user: process.env.SMTP_USER };
};

module.exports = { sendPayslipEmail, sendWelcomeEmail, sendPasswordResetEmail, testSmtpConnection, buildTransporter };
