const assignmentService = require('../services/assignment.service');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { dispatch } = require('../notifications/notification.engine');

/** Convert empty string / undefined → null for UUID fields */
const uuid = v => (v && v !== '' ? v : null);
/** Convert empty string / undefined → null for numeric fields */
const num  = v => (v !== '' && v != null ? parseFloat(v) || null : null);

/**
 * Accept both snake_case (React form) and camelCase.
 * The form sends: client_id, assignment_type_id, assigned_manager_id,
 *                 start_date, due_date, budgeted_hours, etc.
 * The service expects: clientId, assignmentTypeId, managerId,
 *                      startDate, dueDate, estimatedHours, etc.
 */
const normalizeBody = (body) => ({
  title:              body.title              ?? null,
  description:        body.description        ?? null,
  clientId:           uuid(body.clientId           ?? body.client_id),
  assignmentTypeId:   uuid(body.assignmentTypeId   ?? body.assignment_type_id),
  managerId:          uuid(body.managerId           ?? body.assigned_manager_id ?? body.manager_id),
  startDate:          body.startDate          ?? body.start_date          ?? null,
  dueDate:            body.dueDate            ?? body.due_date            ?? null,
  estimatedHours:     num(body.estimatedHours ?? body.budgeted_hours      ?? body.estimated_hours),
  actualHours:        num(body.actualHours    ?? body.actual_hours),
  isBillable:         body.isBillable         ?? body.is_billable         ?? true,
  priority:           body.priority           ?? 'medium',
  status:             body.status             ?? null,
  progress:           body.progress           ?? null,
  completedDate:      body.completedDate      ?? body.completed_date      ?? null,
  remarks:            body.remarks            ?? null,
  memberIds:          body.memberIds          ?? body.member_ids          ?? [],
});

// ─── Assignment Types ─────────────────────────────────────────────────────────

const getTypes = async (req, res) => {
  const types = await assignmentService.getAssignmentTypes(req.user.firm_id);
  sendSuccess(res, types);
};

const createType = async (req, res) => {
  const type = await assignmentService.createAssignmentType(req.user.firm_id, req.body);
  await req.audit('create', 'assignment_type', type.id, { name: type.name });
  sendSuccess(res, type, 201);
};

const updateType = async (req, res) => {
  const type = await assignmentService.updateAssignmentType(
    req.user.firm_id, req.params.id, req.body
  );
  await req.audit('update', 'assignment_type', type.id, req.body);
  sendSuccess(res, type);
};

// ─── Assignments ──────────────────────────────────────────────────────────────

const getAll = async (req, res) => {
  const {
    page = 1, limit = 20, pageSize,
    clientId, status, priority,
    assignmentTypeId, managerId, search, dueBefore, dueAfter, overdue,
  } = req.query;

  const user = req.user;
  // Support both limit and pageSize param names from frontend
  const effectiveLimit = parseInt(pageSize || limit || 20);

  // overdue=true → past due_date, still active (excludes completed/closed/cancelled)
  const overdueFilter = overdue === 'true' || overdue === true;
  const filters = {
    clientId, status, priority, assignmentTypeId, search,
    dueBefore: overdueFilter
      ? new Date().toISOString().split('T')[0]  // due_date < today
      : dueBefore,
    dueAfter,
    overdue: overdueFilter,   // passed to service to exclude terminal statuses
  };

  // Role-based scoping: employees only see assignments they are a member of
  if (user.role === 'employee' || user.role === 'article') {
    filters.employeeId = user.id;
  } else if (user.role === 'manager') {
    // Manager sees own team's assignments; allow filtering by managerId
    filters.managerId = managerId || user.id;
  }
  // partner / super_admin / hr see all assignments in the firm

  const result = await assignmentService.getAll(
    user.firm_id, filters, { page: parseInt(page), limit: effectiveLimit }
  );
  sendPaginated(res, result.data, result.pagination);
};

const getById = async (req, res) => {
  const assignment = await assignmentService.getById(req.user.firm_id, req.params.id);
  sendSuccess(res, assignment);
};

const create = async (req, res) => {
  const normalized = normalizeBody(req.body);
  const assignment = await assignmentService.create(
    req.user.firm_id, normalized, req.user.id
  );
  await req.audit('create', 'assignment', assignment.id, { title: assignment.title });

  // Notify assigned members
  if (normalized.memberIds?.length) {
    dispatch({
      firmId: req.user.firm_id,
      recipientIds: normalized.memberIds,
      type: 'assignment_created',
      title: 'New Assignment',
      message: `You have been assigned to: ${assignment.title}`,
      link: `/assignments/${assignment.id}`,
      meta: { assignmentId: assignment.id },
    }).catch(() => {});
  }

  sendSuccess(res, assignment, 201);
};

const update = async (req, res) => {
  const user = req.user;
  const isPrivileged = ['super_admin', 'partner', 'manager', 'hr'].includes(user.role);

  // Employees can only update progress and status — strip everything else
  let normalized;
  if (!isPrivileged) {
    normalized = {
      progress: req.body.progress ?? null,
      status:   req.body.status   ?? null,
    };
  } else {
    normalized = normalizeBody(req.body);
  }

  const old = await assignmentService.getById(req.user.firm_id, req.params.id);
  const assignment = await assignmentService.update(
    req.user.firm_id, req.params.id, normalized, req.user.id
  );
  await req.audit('update', 'assignment', assignment.id, req.body);

  // Notify on status change
  if (normalized.status && normalized.status !== old.status) {
    const memberRes = await require('../config/database').query(
      `SELECT user_id FROM assignment_members WHERE assignment_id = $1 AND is_active = true`,
      [assignment.id]
    );
    const recipientIds = memberRes.rows.map(r => r.user_id);
    if (recipientIds.length) {
      dispatch({
        firmId: req.user.firm_id,
        recipientIds,
        type: 'assignment_updated',
        title: 'Assignment Updated',
        message: `${assignment.title} status changed to ${normalized.status}`,
        link: `/assignments/${assignment.id}`,
        meta: { assignmentId: assignment.id, newStatus: req.body.status },
      }).catch(() => {});
    }
  }

  sendSuccess(res, assignment);
};

const remove = async (req, res) => {
  await assignmentService.remove(req.user.firm_id, req.params.id);
  await req.audit('delete', 'assignment', req.params.id);
  sendSuccess(res, { message: 'Assignment deleted' });
};

// ─── Members ──────────────────────────────────────────────────────────────────

const addMember = async (req, res) => {
  const member = await assignmentService.addMember(
    req.params.id, req.user.firm_id, req.body.userId, req.body.role
  );
  await req.audit('add_member', 'assignment', req.params.id, { userId: req.body.userId });

  // Notify the new member
  dispatch({
    firmId: req.user.firm_id,
    recipientIds: [req.body.userId],
    type: 'assignment_updated',
    title: 'Added to Assignment',
    message: 'You have been added to an assignment',
    link: `/assignments/${req.params.id}`,
    meta: { assignmentId: req.params.id },
  }).catch(() => {});

  sendSuccess(res, member, 201);
};

const removeMember = async (req, res) => {
  await assignmentService.removeMember(
    req.params.id, req.user.firm_id, req.params.userId
  );
  await req.audit('remove_member', 'assignment', req.params.id, { userId: req.params.userId });
  sendSuccess(res, { message: 'Member removed' });
};

// ─── Utility ─────────────────────────────────────────────────────────────────

const getStats = async (req, res) => {
  const stats = await assignmentService.getStats(req.user.firm_id);
  sendSuccess(res, stats);
};

const getDropdown = async (req, res) => {
  const list = await assignmentService.getDropdownList(req.user.firm_id, req.query.status);
  sendSuccess(res, list);
};

module.exports = {
  getTypes, createType, updateType,
  getAll, getById, create, update, remove,
  addMember, removeMember,
  getStats, getDropdown,
};
