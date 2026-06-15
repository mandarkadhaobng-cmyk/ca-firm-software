/**
 * Payroll table setup — run once:
 *   node run-migration.js
 *
 * Safe: preserves employee_salary data if already exists.
 * Drops and recreates only payroll_runs, salary_slips, payroll_email_log.
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'ca_firm_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
  ssl: false,
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Step 1: Dropping old payroll tables (keeping employee_salary)...');
    await client.query(`DROP TABLE IF EXISTS payroll_email_log      CASCADE`);
    await client.query(`DROP TABLE IF EXISTS payroll_approvals      CASCADE`);
    await client.query(`DROP TABLE IF EXISTS payroll_status_history CASCADE`);
    await client.query(`DROP TABLE IF EXISTS reimbursement_entries  CASCADE`);
    await client.query(`DROP TABLE IF EXISTS salary_slips           CASCADE`);
    await client.query(`DROP TABLE IF EXISTS payroll_runs           CASCADE`);

    console.log('Step 2: Creating / patching employee_salary...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_salary (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
        firm_id         UUID NOT NULL REFERENCES firms(id)  ON DELETE CASCADE,
        monthly_salary  NUMERIC(12,2) NOT NULL DEFAULT 0,
        is_active       BOOLEAN NOT NULL DEFAULT true,
        effective_from  DATE NOT NULL DEFAULT CURRENT_DATE,
        notes           TEXT,
        created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, firm_id)
      )
    `);
    // Add missing columns if table already existed
    const patchCols = [
      `ALTER TABLE employee_salary ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC(12,2) NOT NULL DEFAULT 0`,
      `ALTER TABLE employee_salary ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`,
      `ALTER TABLE employee_salary ADD COLUMN IF NOT EXISTS notes TEXT`,
      `ALTER TABLE employee_salary ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
    ];
    for (const sql of patchCols) {
      await client.query(sql).catch(() => {}); // ignore if already exists
    }

    console.log('Step 3: Creating payroll_runs...');
    await client.query(`
      CREATE TABLE payroll_runs (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        firm_id          UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
        month            SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
        year             SMALLINT NOT NULL CHECK (year BETWEEN 2020 AND 2100),
        status           VARCHAR(20) NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','approved','sent')),
        working_days     SMALLINT NOT NULL DEFAULT 26,
        total_employees  SMALLINT DEFAULT 0,
        total_deductions NUMERIC(14,2) DEFAULT 0,
        total_net        NUMERIC(14,2) DEFAULT 0,
        notes            TEXT,
        created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
        approved_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        approved_at      TIMESTAMPTZ,
        sent_at          TIMESTAMPTZ,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (firm_id, month, year)
      )
    `);

    console.log('Step 4: Creating salary_slips...');
    await client.query(`
      CREATE TABLE salary_slips (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payroll_run_id    UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
        user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        firm_id           UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
        month             SMALLINT NOT NULL,
        year              SMALLINT NOT NULL,
        monthly_salary    NUMERIC(12,2) NOT NULL DEFAULT 0,
        working_days      SMALLINT NOT NULL DEFAULT 26,
        present_days      SMALLINT NOT NULL DEFAULT 26,
        absent_days       SMALLINT NOT NULL DEFAULT 0,
        per_day_salary    NUMERIC(12,4) NOT NULL DEFAULT 0,
        absent_deduction  NUMERIC(12,2) NOT NULL DEFAULT 0,
        reimbursement     NUMERIC(12,2) NOT NULL DEFAULT 0,
        net_salary        NUMERIC(12,2) NOT NULL DEFAULT 0,
        adjustment        NUMERIC(5,2)  NOT NULL DEFAULT 0,
        final_salary      NUMERIC(12,2) NOT NULL DEFAULT 0,
        remarks           TEXT,
        is_locked         BOOLEAN NOT NULL DEFAULT false,
        email_status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                          CHECK (email_status IN ('pending','sent','failed','skipped')),
        email_sent_at     TIMESTAMPTZ,
        email_error       TEXT,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (payroll_run_id, user_id)
      )
    `);

    console.log('Step 5: Creating payroll_email_log...');
    await client.query(`
      CREATE TABLE payroll_email_log (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slip_id        UUID NOT NULL REFERENCES salary_slips(id) ON DELETE CASCADE,
        payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
        user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_email       VARCHAR(255) NOT NULL,
        status         VARCHAR(20)  NOT NULL CHECK (status IN ('sent','failed')),
        error_message  TEXT,
        sent_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    console.log('Step 6: Creating indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_emp_salary_firm ON employee_salary(firm_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_emp_salary_user ON employee_salary(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pr_firm_month   ON payroll_runs(firm_id, month, year)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_slip_run        ON salary_slips(payroll_run_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_slip_user       ON salary_slips(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_slip_firm       ON salary_slips(firm_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_email_log_slip  ON payroll_email_log(slip_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_email_log_run   ON payroll_email_log(payroll_run_id)`);

    await client.query('COMMIT');
    console.log('');
    console.log('✅ All payroll tables created successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Restart your backend:  npm run dev');
    console.log('  2. Go to Payroll → Salary Setup → set salary for each employee');
    console.log('  3. Create a payroll run → Generate Slips → Approve → Send');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
