const { query, getClient } = require('../config/database');
const { NotFoundError, ValidationError } = require('../utils/errors');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const buildWhereClause = (filters, paramOffset = 1) => {
  const conditions = [];
  const values = [];
  let idx = paramOffset;

  if (filters.firmId) {
    conditions.push(`a.firm_id = $${idx++}`);
    values.push(filters.firmId);
  }
  if (filters.clientId) {
    conditions.push(`a.client_id = $${idx++}`);
    values.push(filters.clientId);
  }
  if (filters.status) {
    conditions.push(`a.status = $${idx++}`);
    values.push(filters.status);
  }
  if (filters.assignmentTypeId) {
    conditions.push(`a.assignment_type_id = $${idx++}`);
    values.push(filters.assignmentTypeId);
  }
  if (filters.managerId) {
    conditions.push(`a.manager_id = $${idx++}`);
    values.push(filters.managerId);
  }
  if (filters.employeeId) {
    // Only assignments where this employee is a member
    conditions.push(`EXISTS (
      SELECT 1 FROM assignment_members am2
      WHERE am2.assignment_id = a.id AND am2.user_id = $${idx++} AND am2.is_active = true
    )`);
    values.push(filters.employeeId);
  }
  if (filters.search) {
    conditions.push(`(a.title ILIKE $${idx} OR c.client_name ILIKE $${idx++})`);
    values.push(`%${filters.search}%`);
  }
  if (filters.priority) {
    conditions.push(`a.priority = $${idx++}`);
    values.push(filters.priority);
  }
  if (filters.overdue) {
    // Strict overdue: past due AND not in a terminal status
    conditions.push(`a.due_date < $${idx++}`);
    values.push(filters.dueBefore || new Date().toISOString().split('T')[0]);
    conditions.push(`a.status NOT IN ('completed','closed','cancelled')`);
  } else {
    if (filters.dueBefore) {
      conditions.push(`a.due_date <= $${idx++}`);
      values.push(filters.dueBefore);
    }
  }
  if (filters.dueAfter) {
    conditions.push(`a.due_date >= $${idx++}`);
    values.push(filters.dueAfter);
  }

  return {
    whereClause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
    nextIdx: idx,
  };
};

// ─── Assignment Types ─────────────────────────────────────────────────────────

const getAssignmentTypes = async (firmId) => {
  const { rows } = await query(
    `SELECT id, name, description, is_billable, default_hours, color, is_active
     FROM assignment_types
     WHERE firm_id = $1 AND is_active = true
     ORDER BY name`,
    [firmId]
  );
  return rows;
};

const createAssignmentType = async (firmId, data) => {
  const { name, description, isBillable = true, defaultHours, color } = data;
  const { rows } = await query(
    `INSERT INTO assignment_types (firm_id, name, description, is_billable, default_hours, color)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [firmId, name, description, isBillable, defaultHours || null, color || null]
  );
  return rows[0];
};

const updateAssignmentType = async (firmId, id, data) => {
  const { name, description, isBillable, defaultHours, color, isActive } = data;
  const { rows } = await query(
    `UPDATE assignment_types
     SET name = COALESCE($3, name),
         description = COALESCE($4, description),
         is_billable = COALESCE($5, is_billable),
         default_hours = COALESCE($6, default_hours),
         color = COALESCE($7, color),
         is_active = COALESCE($8, is_active),
         updated_at = NOW()
     WHERE id = $1 AND firm_id = $2
     RETURNING *`,
    [id, firmId, name, description, isBillable, defaultHours, color, isActive]
  );
  if (!rows[0]) throw new NotFoundError('Assignment type not found');
  return rows[0];
};

// ─── Assignments ──────────────────────────────────────────────────────────────

const getAll = async (firmId, filters = {}, pagination = {}) => {
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  const { whereClause, values, nextIdx } = buildWhereClause(
    { ...filters, firmId },
    1
  );

  const countRes = await query(
    `SELECT COUNT(*) FROM assignments a
     LEFT JOIN clients c ON c.id = a.client_id
     ${whereClause}`,
    values
  );
  const total = parseInt(countRes.rows[0].count);

  const dataRes = await query(
    `SELECT
       a.id, a.title, a.description, a.status, a.priority, a.progress,
       a.start_date, a.due_date, a.completed_date,
       a.estimated_hours, a.actual_hours, a.is_billable,
       a.created_at, a.updated_at,
       c.id AS client_id, c.client_name AS client_name,
       at2.id AS assignment_type_id, at2.name AS assignment_type_name, at2.color AS assignment_type_color,
       u.id AS manager_id, u.first_name AS manager_first_name, u.last_name AS manager_last_name,
       (SELECT COUNT(*) FROM assignment_members am WHERE am.assignment_id = a.id AND am.is_active = true) AS member_count
     FROM assignments a
     LEFT JOIN clients c ON c.id = a.client_id
     LEFT JOIN assignment_types at2 ON at2.id = a.assignment_type_id
     LEFT JOIN users u ON u.id = a.manager_id
     ${whereClause}
     ORDER BY
       CASE a.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
       a.due_date ASC NULLS LAST,
       a.created_at DESC
     LIMIT $${nextIdx} OFFSET $${nextIdx + 1}`,
    [...values, limit, offset]
  );

  return {
    data: dataRes.rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getById = async (firmId, id) => {
  const { rows } = await query(
    `SELECT
       a.*,
       c.id AS client_id, c.client_name AS client_name, c.email AS client_email,
       at2.id AS assignment_type_id, at2.name AS assignment_type_name,
         at2.color AS assignment_type_color, at2.is_billable AS type_is_billable,
       u.id AS manager_id, u.first_name AS manager_first_name, u.last_name AS manager_last_name,
       u.email AS manager_email
     FROM assignments a
     LEFT JOIN clients c ON c.id = a.client_id
     LEFT JOIN assignment_types at2 ON at2.id = a.assignment_type_id
     LEFT JOIN users u ON u.id = a.manager_id
     WHERE a.id = $1 AND a.firm_id = $2`,
    [id, firmId]
  );
  if (!rows[0]) throw new NotFoundError('Assignment not found');

  // Fetch members
  const membersRes = await query(
    `SELECT am.id, am.role, am.joined_at,
       u.id AS user_id, u.first_name, u.last_name, u.email,
       r.slug AS role_slug, r.name AS role_name
     FROM assignment_members am
     JOIN users u ON u.id = am.user_id
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE am.assignment_id = $1 AND am.is_active = true
     ORDER BY u.first_name`,
    [id]
  );

  // Fetch sub-tasks (tasks table if exists, else empty)
  return { ...rows[0], members: membersRes.rows };
};

const create = async (firmId, data, createdBy) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const {
      title, description, clientId, assignmentTypeId, managerId,
      startDate, dueDate, estimatedHours, isBillable = true,
      priority = 'medium', status = 'pending', remarks, memberIds = [],
    } = data;

    if (!title) throw new ValidationError('Title is required');

    // Convert empty strings to null for UUID / optional columns
    const uuid = v => (v && v !== '' ? v : null);
    const num  = v => (v !== '' && v != null ? v : null);

    // Validate status
    const validStatuses = ['pending','open','in_progress','review','completed','closed','cancelled'];
    const finalStatus = validStatuses.includes(status) ? status : 'pending';

    const { rows } = await client.query(
      `INSERT INTO assignments
         (firm_id, title, description, client_id, assignment_type_id, manager_id,
          start_date, due_date, estimated_hours, is_billable, priority, status, remarks, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [firmId, title, description || null, uuid(clientId), uuid(assignmentTypeId), uuid(managerId),
       startDate || null, dueDate || null, num(estimatedHours), isBillable, priority,
       finalStatus, remarks || null, createdBy]
    );
    const assignment = rows[0];

    // Add manager as member automatically
    const allMembers = new Set([managerId, ...memberIds].filter(Boolean));
    for (const userId of allMembers) {
      await client.query(
        `INSERT INTO assignment_members (assignment_id, user_id, role)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [assignment.id, userId, userId === managerId ? 'manager' : 'member']
      );
    }

    await client.query('COMMIT');
    return assignment;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const update = async (firmId, id, data, updatedBy) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const {
      title, description, clientId, assignmentTypeId, managerId,
      startDate, dueDate, estimatedHours, actualHours, isBillable,
      priority, status, progress, completedDate, remarks, memberIds,
    } = data;

    // Auto-set completed_date
    const finalCompletedDate = status === 'completed'
      ? (completedDate || new Date().toISOString().split('T')[0])
      : completedDate;

    const { rows } = await client.query(
      `UPDATE assignments SET
         title            = COALESCE($3, title),
         description      = COALESCE($4, description),
         client_id        = COALESCE($5, client_id),
         assignment_type_id = COALESCE($6, assignment_type_id),
         manager_id       = COALESCE($7, manager_id),
         start_date       = COALESCE($8, start_date),
         due_date         = COALESCE($9, due_date),
         estimated_hours  = COALESCE($10, estimated_hours),
         actual_hours     = COALESCE($11, actual_hours),
         is_billable      = COALESCE($12, is_billable),
         priority         = COALESCE($13, priority),
         status           = COALESCE($14, status),
         progress         = COALESCE($15, progress),
         completed_date   = $16,
         remarks          = COALESCE($17, remarks),
         updated_at       = NOW()
       WHERE id = $1 AND firm_id = $2
       RETURNING *`,
      [id, firmId, title, description, clientId, assignmentTypeId, managerId,
       startDate, dueDate, estimatedHours, actualHours, isBillable,
       priority, status, progress, finalCompletedDate, remarks || null]
    );
    if (!rows[0]) throw new NotFoundError('Assignment not found');

    // Sync members if provided
    if (Array.isArray(memberIds)) {
      // Deactivate all current members
      await client.query(
        `UPDATE assignment_members SET is_active = false WHERE assignment_id = $1`,
        [id]
      );
      // Re-add provided members
      const allMembers = new Set([rows[0].manager_id, ...memberIds].filter(Boolean));
      for (const userId of allMembers) {
        await client.query(
          `INSERT INTO assignment_members (assignment_id, user_id, role, is_active)
           VALUES ($1, $2, $3, true)
           ON CONFLICT (assignment_id, user_id)
           DO UPDATE SET is_active = true, role = EXCLUDED.role`,
          [id, userId, userId === rows[0].manager_id ? 'manager' : 'member']
        );
      }
    }

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const remove = async (firmId, id) => {
  // Step 1: check the assignment exists and belongs to this firm
  const { rows: found } = await query(
    `SELECT id, firm_id FROM assignments WHERE id = $1`,
    [id]
  );
  if (!found[0]) throw new NotFoundError('Assignment not found');

  // Step 2: firm ownership check
  // Allow if firm_id matches OR if firm_id is NULL (dev/seed data without firm)
  if (found[0].firm_id && found[0].firm_id !== firmId) {
    throw new NotFoundError('Assignment not found');
  }

  // Step 3: delete
  await query(`DELETE FROM assignments WHERE id = $1`, [id]);
};

// ─── Member Management ────────────────────────────────────────────────────────

const addMember = async (assignmentId, firmId, userId, role = 'member') => {
  // Verify assignment belongs to firm
  const { rows: aRows } = await query(
    `SELECT id FROM assignments WHERE id = $1 AND firm_id = $2`,
    [assignmentId, firmId]
  );
  if (!aRows[0]) throw new NotFoundError('Assignment not found');

  const { rows } = await query(
    `INSERT INTO assignment_members (assignment_id, user_id, role, is_active)
     VALUES ($1, $2, $3, true)
     ON CONFLICT (assignment_id, user_id)
     DO UPDATE SET is_active = true, role = EXCLUDED.role
     RETURNING *`,
    [assignmentId, userId, role]
  );
  return rows[0];
};

const removeMember = async (assignmentId, firmId, userId) => {
  const { rows: aRows } = await query(
    `SELECT id FROM assignments WHERE id = $1 AND firm_id = $2`,
    [assignmentId, firmId]
  );
  if (!aRows[0]) throw new NotFoundError('Assignment not found');

  await query(
    `UPDATE assignment_members SET is_active = false
     WHERE assignment_id = $1 AND user_id = $2`,
    [assignmentId, userId]
  );
};

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

const getStats = async (firmId) => {
  const { rows } = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status != 'completed' AND status != 'cancelled') AS active,
       COUNT(*) FILTER (WHERE status = 'pending')    AS pending,
       COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
       COUNT(*) FILTER (WHERE status = 'completed')  AS completed,
       COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed','cancelled')) AS overdue,
       COUNT(*) FILTER (WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
                             AND status NOT IN ('completed','cancelled')) AS due_soon
     FROM assignments
     WHERE firm_id = $1`,
    [firmId]
  );
  return rows[0];
};


const getDropdownList = async (firmId, status) => {
  const { rows } = await query(
    `SELECT a.id, a.title, a.status, c.client_name AS client_name
     FROM assignments a
     LEFT JOIN clients c ON c.id = a.client_id
     WHERE a.firm_id = $1 ${status ? 'AND a.status = $2' : ''}
     ORDER BY a.title`,
    status ? [firmId, status] : [firmId]
  );
  return rows;
};

module.exports = {
  getAssignmentTypes, createAssignmentType, updateAssignmentType,
  getAll, getById, create, update, remove,
  addMember, removeMember,
  getStats, getDropdownList,
};
