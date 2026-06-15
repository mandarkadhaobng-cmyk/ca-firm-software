const db = require('../config/database');
const { paginate } = require('../utils/pagination');
const { success, created, paginated, notFound } = require('../utils/response');

/** Convert empty string / undefined → null for UUID fields */
const uuid = v => (v && v !== '' ? v : null);

/**
 * Accept both snake_case (React form) and camelCase (API clients).
 */
const normalizeBody = (body) => ({
  clientName:         body.clientName         ?? body.client_name,
  clientCode:         body.clientCode         ?? body.client_code,
  panNumber:          body.panNumber          ?? body.pan_number          ?? null,
  gstNumber:          body.gstNumber          ?? body.gst_number          ?? null,
  email:              body.email              ?? null,
  phone:              body.phone              ?? null,
  address:            body.address            ?? null,
  city:               body.city               ?? null,
  state:              body.state              ?? null,
  industry:           body.industry           ?? null,
  notes:              body.notes              ?? null,
  clientType:         body.clientType         ?? body.client_type         ?? 'company',
  status:             body.status             ?? null,
  assignedPartnerId:  uuid(body.assignedPartnerId  ?? body.assigned_partner_id),
  assignedManagerId:  uuid(body.assignedManagerId  ?? body.assigned_manager_id),
});

exports.getAll = async (req, res) => {
  const { search, status, page = 1, pageSize = 15 } = req.query;
  const { limit, offset } = paginate({ page, pageSize });
  let where = [`c.firm_id=$1`], params = [req.user.firm_id], i = 2;
  if (search) { where.push(`(client_name ILIKE $${i} OR client_code ILIKE $${i} OR pan_number ILIKE $${i})`); params.push(`%${search}%`); i++; }
  if (status) { where.push(`status=$${i}`); params.push(status); i++; }

  const { rows: data } = await db.query(
    `SELECT c.*,
            p.first_name as partner_first, p.last_name as partner_last,
            m.first_name as manager_first, m.last_name as manager_last
     FROM clients c
     LEFT JOIN users p ON p.id=c.assigned_partner_id
     LEFT JOIN users m ON m.id=c.assigned_manager_id
     WHERE ${where.join(' AND ')} ORDER BY client_name
     LIMIT $${i} OFFSET $${i+1}`,
    [...params, limit, offset]
  );
  const { rows:[{total}] } = await db.query(
    `SELECT COUNT(*) as total FROM clients c WHERE ${where.join(' AND ')}`, params
  );
  paginated(res, data, parseInt(total), page, pageSize);
};

exports.getById = async (req, res) => {
  const { rows } = await db.query(
    `SELECT c.*,
            p.first_name as partner_first, p.last_name as partner_last,
            m.first_name as manager_first, m.last_name as manager_last
     FROM clients c
     LEFT JOIN users p ON p.id=c.assigned_partner_id
     LEFT JOIN users m ON m.id=c.assigned_manager_id
     WHERE c.id=$1 AND c.firm_id=$2`,
    [req.params.id, req.user.firm_id]
  );
  if (!rows.length) return notFound(res, 'Client not found');
  success(res, rows[0]);
};

exports.create = async (req, res) => {
  const b = normalizeBody(req.body);
  if (!b.clientName) return notFound(res, 'Client name is required');
  const { rows } = await db.query(
    `INSERT INTO clients
       (firm_id, client_name, client_code, pan_number, gst_number, email, phone,
        address, city, state, industry, notes, assigned_partner_id, assigned_manager_id, client_type)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
    [req.user.firm_id, b.clientName, b.clientCode, b.panNumber, b.gstNumber,
     b.email, b.phone, b.address, b.city, b.state, b.industry, b.notes,
     b.assignedPartnerId, b.assignedManagerId, b.clientType]
  );
  await req.audit('create', 'client', rows[0].id, { clientName: b.clientName });
  created(res, rows[0]);
};

exports.update = async (req, res) => {
  const b = normalizeBody(req.body);
  const { rows } = await db.query(
    `UPDATE clients SET
       client_name=$1, client_code=$2, pan_number=$3, gst_number=$4,
       email=$5, phone=$6, address=$7, city=$8, state=$9,
       industry=$10, notes=$11,
       assigned_partner_id=$12, assigned_manager_id=$13,
       status=COALESCE($14,status), updated_at=NOW()
     WHERE id=$15 AND firm_id=$16 RETURNING *`,
    [b.clientName, b.clientCode, b.panNumber, b.gstNumber,
     b.email, b.phone, b.address, b.city, b.state,
     b.industry, b.notes,
     b.assignedPartnerId, b.assignedManagerId,
     b.status, req.params.id, req.user.firm_id]
  );
  if (!rows.length) return notFound(res);
  success(res, rows[0]);
};

exports.delete = async (req, res) => {
  await db.query(`UPDATE clients SET status='inactive', updated_at=NOW() WHERE id=$1 AND firm_id=$2`,
    [req.params.id, req.user.firm_id]);
  success(res, null, 'Client deactivated');
};

exports.getDropdown = async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, client_name, client_code FROM clients WHERE firm_id=$1 AND status='active' ORDER BY client_name`,
    [req.user.firm_id]
  );
  success(res, rows);
};
