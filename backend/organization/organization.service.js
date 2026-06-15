/**
 * Organization Service — hierarchy, directory, departments
 */
const db = require('../config/database');

// ── Reporting hierarchy ──────────────────────────────────

const getHierarchy = async (firmId) => {
  // Returns all employees with their direct manager + full profile fields
  const { rows } = await db.query(
    `SELECT e.id, e.first_name, e.last_name, e.email, e.employee_id AS employee_code,
            r.slug AS role_slug, r.name AS role_name,
            COALESCE(rh.reports_to_id, e.reporting_manager_id) AS reports_to_id,
            m.first_name AS manager_first, m.last_name AS manager_last,
            ed.designation_id,
            COALESCE(e.designation, d.title) AS designation,
            ed.department_id, dep.name AS department,
            ed.work_location, ed.work_phone, ed.date_of_joining AS join_date,
            ep.photo_url
       FROM users e
  LEFT JOIN reporting_hierarchy rh ON rh.user_id = e.id AND rh.is_current = true
  LEFT JOIN users m ON m.id = COALESCE(rh.reports_to_id, e.reporting_manager_id)
  LEFT JOIN roles r ON r.id = e.role_id
  LEFT JOIN employee_directory ed ON ed.user_id = e.id
  LEFT JOIN designations d ON d.id = ed.designation_id
  LEFT JOIN departments dep ON dep.id = ed.department_id
  LEFT JOIN employee_photos ep ON ep.user_id = e.id AND ep.is_active = true
      WHERE e.firm_id = $1 AND e.status = 'active'
   ORDER BY e.first_name, e.last_name`,
    [firmId]
  );
  return rows;
};

const setReportsTo = async (employeeId, reportsToId, firmId, actorId) => {
  // Close existing current record
  await db.query(
    `UPDATE reporting_hierarchy SET is_current = false, effective_to = CURRENT_DATE
      WHERE user_id = $1 AND is_current = true`,
    [employeeId]
  );
  const { rows: [rec] } = await db.query(
    `INSERT INTO reporting_hierarchy (firm_id, user_id, reports_to_id, effective_from, is_current, created_by)
     VALUES ($1, $2, $3, CURRENT_DATE, true, $4) RETURNING *`,
    [firmId, employeeId, reportsToId || null, actorId]
  );
  return rec;
};

// ── Departments ──────────────────────────────────────────

const listDepartments = async (firmId) => {
  const { rows } = await db.query(
    `SELECT d.*,
            e.first_name AS head_first, e.last_name AS head_last,
            COUNT(dm.id) AS member_count
       FROM departments d
  LEFT JOIN users e ON e.id = d.head_id
  LEFT JOIN department_members dm ON dm.department_id = d.id AND dm.is_current = true
      WHERE d.firm_id = $1 AND d.is_active = true
   GROUP BY d.id, e.first_name, e.last_name
   ORDER BY d.name`,
    [firmId]
  );
  return rows;
};

const createDepartment = async (data, actorId) => {
  const { firmId, name, code, parentId, headId, description } = data;
  const { rows: [dept] } = await db.query(
    `INSERT INTO departments (firm_id, name, code, parent_id, head_id, description)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [firmId, name, code || null, parentId || null, headId || null, description || null]
  );
  return dept;
};

const updateDepartment = async (id, data, firmId) => {
  const { name, code, parentId, headId, description, isActive } = data;
  const { rows: [dept] } = await db.query(
    `UPDATE departments SET
       name = COALESCE($1, name),
       code = COALESCE($2, code),
       parent_id = $3,
       head_id = $4,
       description = COALESCE($5, description),
       is_active = COALESCE($6, is_active)
     WHERE id = $7 AND firm_id = $8 RETURNING *`,
    [name, code, parentId ?? null, headId ?? null, description, isActive, id, firmId]
  );
  return dept;
};

const addDeptMember = async (departmentId, employeeId, roleInDept) => {
  // Remove from existing if already a current member of this dept
  await db.query(
    `UPDATE department_members SET is_current = false, left_at = CURRENT_DATE
      WHERE department_id = $1 AND user_id = $2 AND is_current = true`,
    [departmentId, employeeId]
  );
  const { rows: [m] } = await db.query(
    `INSERT INTO department_members (department_id, user_id, role_in_dept)
     VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING *`,
    [departmentId, employeeId, roleInDept || 'Member']
  );
  return m;
};

const removeDeptMember = async (departmentId, employeeId) => {
  await db.query(
    `UPDATE department_members SET is_current = false, left_at = CURRENT_DATE
      WHERE department_id = $1 AND user_id = $2 AND is_current = true`,
    [departmentId, employeeId]
  );
};

// ── Designations ─────────────────────────────────────────

const listDesignations = async (firmId) => {
  const { rows } = await db.query(
    `SELECT * FROM designations WHERE firm_id = $1 AND is_active = true ORDER BY level, title`,
    [firmId]
  );
  return rows;
};

const createDesignation = async (firmId, title, level) => {
  const { rows: [d] } = await db.query(
    `INSERT INTO designations (firm_id, title, level) VALUES ($1,$2,$3)
     ON CONFLICT (firm_id, title) DO UPDATE SET level = $3, is_active = true RETURNING *`,
    [firmId, title, level || 1]
  );
  return d;
};

// ── Directory ────────────────────────────────────────────

const getDirectory = async (firmId, { search, departmentId, designationId } = {}) => {
  const conditions = ['e.firm_id = $1', 'e.status = \'active\'', 'COALESCE(ed.is_visible, true) = true'];
  const values = [firmId];
  let idx = 2;

  if (search) {
    conditions.push(`(e.first_name ILIKE $${idx} OR e.last_name ILIKE $${idx} OR e.email ILIKE $${idx})`);
    values.push(`%${search}%`);
    idx++;
  }
  if (departmentId) {
    conditions.push(`ed.department_id = $${idx++}`);
    values.push(departmentId);
  }
  if (designationId) {
    conditions.push(`ed.designation_id = $${idx++}`);
    values.push(designationId);
  }

  const { rows } = await db.query(
    `SELECT e.id, e.first_name, e.last_name, e.email, e.employee_id AS employee_code,
            r.slug AS role_slug, r.name AS role_name,
            ep.photo_url,
            ed.work_location, ed.work_phone, ed.bio, ed.skills,
            ed.date_of_joining,
            d.title AS designation,
            dep.name AS department
       FROM users e
  LEFT JOIN roles r ON r.id = e.role_id
  LEFT JOIN employee_photos ep ON ep.user_id = e.id AND ep.is_active = true
  LEFT JOIN employee_directory ed ON ed.user_id = e.id
  LEFT JOIN designations d ON d.id = ed.designation_id
  LEFT JOIN departments dep ON dep.id = ed.department_id
      WHERE ${conditions.join(' AND ')}
   ORDER BY e.first_name, e.last_name`,
    values
  );
  return rows;
};

const upsertDirectoryEntry = async (employeeId, firmId, data) => {
  const {
    designationId, departmentId, workLocation, workPhone,
    linkedinUrl, bio, skills, dateOfJoining, dateOfBirth, isVisible,
  } = data;
  const { rows: [entry] } = await db.query(
    `INSERT INTO employee_directory
       (user_id, designation_id, department_id, work_location, work_phone,
        linkedin_url, bio, skills, date_of_joining, date_of_birth, is_visible, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       designation_id  = COALESCE($2, employee_directory.designation_id),
       department_id   = COALESCE($3, employee_directory.department_id),
       work_location   = COALESCE($4, employee_directory.work_location),
       work_phone      = COALESCE($5, employee_directory.work_phone),
       linkedin_url    = COALESCE($6, employee_directory.linkedin_url),
       bio             = COALESCE($7, employee_directory.bio),
       skills          = COALESCE($8, employee_directory.skills),
       date_of_joining = COALESCE($9, employee_directory.date_of_joining),
       date_of_birth   = COALESCE($10, employee_directory.date_of_birth),
       is_visible      = COALESCE($11, employee_directory.is_visible),
       updated_at      = NOW()
     RETURNING *`,
    [
      employeeId,
      designationId || null, departmentId || null,
      workLocation || null, workPhone || null,
      linkedinUrl || null, bio || null,
      skills || null,
      dateOfJoining || null, dateOfBirth || null,
      isVisible !== undefined ? isVisible : true,
    ]
  );
  return entry;
};

// ── Partner ↔ Employee mapping ───────────────────────────

const getPartnerMappings = async (firmId, partnerId) => {
  const conditions = ['pem.firm_id = $1', 'pem.is_active = true'];
  const values = [firmId];
  if (partnerId) { conditions.push(`pem.partner_id = $2`); values.push(partnerId); }

  const { rows } = await db.query(
    `SELECT pem.*,
            p.first_name AS partner_first, p.last_name AS partner_last,
            e.first_name AS emp_first, e.last_name AS emp_last, e.email AS emp_email
       FROM partner_user_mapping pem
       JOIN users p ON p.id = pem.partner_id
       JOIN users e ON e.id = pem.user_id
      WHERE ${conditions.join(' AND ')}
   ORDER BY p.first_name, e.first_name`,
    values
  );
  return rows;
};

const setPartnerMapping = async (firmId, partnerId, employeeIds, actorId) => {
  // Replace all mappings for this partner
  await db.query(
    `UPDATE partner_user_mapping SET is_active = false WHERE firm_id = $1 AND partner_id = $2`,
    [firmId, partnerId]
  );
  const created = [];
  for (const empId of employeeIds) {
    const { rows: [m] } = await db.query(
      `INSERT INTO partner_user_mapping (firm_id, partner_id, user_id, assigned_by)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (partner_id, user_id) DO UPDATE SET is_active = true, assigned_by = $4
       RETURNING *`,
      [firmId, partnerId, empId, actorId]
    );
    created.push(m);
  }
  return created;
};

module.exports = {
  getHierarchy, setReportsTo,
  listDepartments, createDepartment, updateDepartment, addDeptMember, removeDeptMember,
  listDesignations, createDesignation,
  getDirectory, upsertDirectoryEntry,
  getPartnerMappings, setPartnerMapping,
};
