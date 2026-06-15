const { query, getClient } = require('../config/database');
const { NotFoundError, ValidationError } = require('../utils/errors');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildWhere = (firmId, filters) => {
  const conds = ['c.firm_id = $1'];
  const vals  = [firmId];
  let i = 2;

  if (filters.search) {
    conds.push(`(c.client_name ILIKE $${i} OR c.client_code ILIKE $${i} OR c.pan_number ILIKE $${i} OR c.email ILIKE $${i})`);
    vals.push(`%${filters.search}%`);
    i++;
  }
  if (filters.status) {
    conds.push(`c.status = $${i++}`);
    vals.push(filters.status);
  }
  if (filters.clientType) {
    conds.push(`c.client_type = $${i++}`);
    vals.push(filters.clientType);
  }
  if (filters.assignedPartnerId) {
    conds.push(`c.assigned_partner_id = $${i++}`);
    vals.push(filters.assignedPartnerId);
  }
  if (filters.assignedManagerId) {
    conds.push(`c.assigned_manager_id = $${i++}`);
    vals.push(filters.assignedManagerId);
  }

  return { whereClause: `WHERE ${conds.join(' AND ')}`, vals, nextIdx: i };
};

// ─── CRUD ─────────────────────────────────────────────────────────────────────

const getAll = async (firmId, filters = {}, pagination = {}) => {
  const { page = 1, limit = 15 } = pagination;
  const offset = (page - 1) * limit;
  const { whereClause, vals, nextIdx } = buildWhere(firmId, filters);

  const [dataRes, countRes] = await Promise.all([
    query(
      `SELECT
         c.id, c.client_name, c.client_code, c.client_type, c.email, c.phone,
         c.pan_number, c.gst_number, c.status, c.city, c.state, c.created_at,
         p.first_name AS partner_first, p.last_name AS partner_last,
         m.first_name AS manager_first, m.last_name AS manager_last,
         (SELECT COUNT(*) FROM assignments a WHERE a.client_id = c.id AND a.status NOT IN ('completed','cancelled')) AS active_assignments
       FROM clients c
       LEFT JOIN users p ON p.id = c.assigned_partner_id
       LEFT JOIN users m ON m.id = c.assigned_manager_id
       ${whereClause}
       ORDER BY c.client_name
       LIMIT $${nextIdx} OFFSET $${nextIdx + 1}`,
      [...vals, limit, offset]
    ),
    query(
      `SELECT COUNT(*) FROM clients c ${whereClause}`,
      vals
    ),
  ]);

  return {
    data: dataRes.rows,
    pagination: {
      page,
      limit,
      total: parseInt(countRes.rows[0].count),
      totalPages: Math.ceil(parseInt(countRes.rows[0].count) / limit),
    },
  };
};

const getById = async (firmId, id) => {
  const { rows } = await query(
    `SELECT
       c.*,
       p.first_name AS partner_first, p.last_name AS partner_last, p.email AS partner_email,
       m.first_name AS manager_first, m.last_name AS manager_last, m.email AS manager_email
     FROM clients c
     LEFT JOIN users p ON p.id = c.assigned_partner_id
     LEFT JOIN users m ON m.id = c.assigned_manager_id
     WHERE c.id = $1 AND c.firm_id = $2`,
    [id, firmId]
  );
  if (!rows[0]) throw new NotFoundError('Client not found');
  return rows[0];
};

const create = async (firmId, data, createdBy) => {
  const {
    clientName, clientCode, clientType = 'company',
    panNumber, gstNumber, email, phone,
    address, city, state, pincode,
    assignedPartnerId, assignedManagerId,
  } = data;

  if (!clientName) throw new ValidationError('Client name is required');

  const { rows } = await query(
    `INSERT INTO clients
       (firm_id, client_name, client_code, client_type, pan_number, gst_number,
        email, phone, address, city, state, pincode,
        assigned_partner_id, assigned_manager_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      firmId, clientName, clientCode, clientType, panNumber, gstNumber,
      email, phone, address, city, state, pincode,
      assignedPartnerId || null, assignedManagerId || null, createdBy,
    ]
  );
  return rows[0];
};

const update = async (firmId, id, data) => {
  const {
    clientName, clientCode, clientType,
    panNumber, gstNumber, email, phone,
    address, city, state, pincode,
    assignedPartnerId, assignedManagerId, status,
  } = data;

  const { rows } = await query(
    `UPDATE clients SET
       client_name          = COALESCE($3, client_name),
       client_code          = COALESCE($4, client_code),
       client_type          = COALESCE($5, client_type),
       pan_number           = COALESCE($6, pan_number),
       gst_number           = COALESCE($7, gst_number),
       email                = COALESCE($8, email),
       phone                = COALESCE($9, phone),
       address              = COALESCE($10, address),
       city                 = COALESCE($11, city),
       state                = COALESCE($12, state),
       pincode              = COALESCE($13, pincode),
       assigned_partner_id  = COALESCE($14, assigned_partner_id),
       assigned_manager_id  = COALESCE($15, assigned_manager_id),
       status               = COALESCE($16, status),
       updated_at           = NOW()
     WHERE id = $1 AND firm_id = $2
     RETURNING *`,
    [
      id, firmId,
      clientName, clientCode, clientType, panNumber, gstNumber,
      email, phone, address, city, state, pincode,
      assignedPartnerId, assignedManagerId, status,
    ]
  );
  if (!rows[0]) throw new NotFoundError('Client not found');
  return rows[0];
};

const softDelete = async (firmId, id) => {
  const { rows } = await query(
    `UPDATE clients SET status = 'inactive', updated_at = NOW()
     WHERE id = $1 AND firm_id = $2 RETURNING id`,
    [id, firmId]
  );
  if (!rows[0]) throw new NotFoundError('Client not found');
};

const getDropdown = async (firmId) => {
  const { rows } = await query(
    `SELECT id, client_name AS name, client_code AS code, client_type
     FROM clients
     WHERE firm_id = $1 AND status = 'active'
     ORDER BY client_name`,
    [firmId]
  );
  return rows;
};

const getStats = async (firmId) => {
  const { rows } = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'active')   AS active,
       COUNT(*) FILTER (WHERE status = 'inactive') AS inactive,
       COUNT(*) FILTER (WHERE client_type = 'individual') AS individual,
       COUNT(*) FILTER (WHERE client_type = 'company')    AS company,
       COUNT(*) FILTER (WHERE client_type = 'partnership') AS partnership,
       COUNT(*) FILTER (WHERE client_type = 'trust')      AS trust
     FROM clients WHERE firm_id = $1`,
    [firmId]
  );
  return rows[0];
};

module.exports = { getAll, getById, create, update, softDelete, getDropdown, getStats };
