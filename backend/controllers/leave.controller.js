const leaveService = require('../services/leave.service');
const { dispatch }  = require('../notifications/notification.engine');
const db            = require('../config/database');
const { success, created, paginated, notFound } = require('../utils/response');

exports.apply = async (req, res) => {
  // Normalize snake_case fields from the React form
  const payload = {
    leaveType:  req.body.leaveType  ?? req.body.leave_type,
    fromDate:   req.body.fromDate   ?? req.body.from_date,
    toDate:     req.body.toDate     ?? req.body.to_date,
    reason:     req.body.reason,
    totalDays:  req.body.totalDays  ?? req.body.total_days,
    userId:     req.user.id,
    firmId:     req.user.firm_id,
  };

  const leave = await leaveService.apply(payload);

  // Notify manager + HR (non-blocking — errors must not abort the response)
  try {
    const { rows } = await db.query(
      `SELECT reporting_manager_id FROM users WHERE id=$1`, [req.user.id]
    );
    const recipients = [];
    if (rows[0]?.reporting_manager_id) recipients.push(rows[0].reporting_manager_id);

    const { rows: hrs } = await db.query(
      `SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id
       WHERE u.firm_id=$1 AND r.slug IN ('hr','partner','super_admin')`,
      [req.user.firm_id]
    );
    hrs.forEach(h => { if (!recipients.includes(h.id)) recipients.push(h.id); });

    if (recipients.length) {
      dispatch({
        firmId: req.user.firm_id, recipientIds: recipients,
        type: 'leave_request',
        title: 'New Leave Request',
        message: `Leave request submitted by ${req.user.email} for ${payload.totalDays} day(s)`,
        link: '/leaves/approvals',
      });
    }
  } catch { /* notification failure must not block the response */ }

  created(res, leave, 'Leave application submitted');
};

exports.approve = async (req, res) => {
  const leave = await leaveService.approve(req.params.id, req.user.id, req.body.comment, req.user.firm_id);
  dispatch({
    firmId: req.user.firm_id, recipientIds: [leave.user_id],
    type: 'leave_approved', title: 'Leave Approved',
    message: `Your leave from ${leave.from_date} to ${leave.to_date} has been approved`,
    link: '/leaves',
  });
  success(res, null, 'Leave approved');
};

exports.reject = async (req, res) => {
  await leaveService.reject(req.params.id, req.user.id, req.body.comment, req.user.firm_id);
  const { rows:[leave] } = await db.query(`SELECT user_id FROM leaves WHERE id=$1`, [req.params.id]);
  if (leave) {
    dispatch({
      firmId: req.user.firm_id, recipientIds: [leave.user_id],
      type: 'leave_rejected', title: 'Leave Rejected',
      message: `Your leave request has been rejected${req.body.comment ? ': ' + req.body.comment : ''}`,
      link: '/leaves',
    });
  }
  success(res, null, 'Leave rejected');
};

exports.cancel = async (req, res) => {
  await leaveService.cancel(req.params.id, req.user.id, req.user.firm_id);
  success(res, null, 'Leave cancelled');
};

exports.getAll = async (req, res) => {
  const { status, page = 1, pageSize = 15 } = req.query;
  const { data, total } = await leaveService.getAll({
    firmId: req.user.firm_id, userId: req.user.id, role: req.user.role,
    status, page, pageSize,
  });
  paginated(res, data, total, page, pageSize);
};

exports.getBalance = async (req, res) => {
  const balance = await leaveService.getBalance(req.user.id);
  success(res, balance);
};

exports.getPendingCount = async (req, res) => {
  const db = require('../config/database');
  const { rows } = await db.query(
    `SELECT COUNT(*) AS count FROM leaves
     WHERE firm_id = $1 AND status = 'pending'`,
    [req.user.firm_id]
  );
  success(res, { count: parseInt(rows[0].count) });
};
