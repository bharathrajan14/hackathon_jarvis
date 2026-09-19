import pkg from 'pg';
import { newDb, DataType } from 'pg-mem';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pool;
let isInMemory = false;

const realPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 1500,
});

export const initDb = async () => {
  if (pool) return pool;

  try {
    const client = await realPool.connect();
    client.release();
    pool = realPool;
    console.log('[DB] Connected to PostgreSQL via DATABASE_URL');

    const migrationsDir = path.join(__dirname, '../../db/migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).sort();
      for (const file of files) {
        if (file.endsWith('.sql')) {
          const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
          await pool.query(sql);
          console.log(`[DB] Applied migration ${file} to PostgreSQL`);
        }
      }
    }
  } catch (err) {
    console.warn(`[DB] Real PostgreSQL unavailable (${err.message || 'connection timeout'}). Initializing in-memory PostgreSQL emulator.`);
    const db = newDb();
    
    db.public.registerFunction({
      name: 'gen_random_uuid',
      returns: DataType.uuid,
      impure: true,
      implementation: () => crypto.randomUUID(),
    });

    try {
      db.public.none("CREATE TYPE user_role AS ENUM ('employee', 'manager', 'admin', 'hr', 'soc');");
    } catch (_) {}

    try {
      db.public.none("CREATE TYPE resource_sensitivity AS ENUM ('low', 'medium', 'high');");
    } catch (_) {}

    try {
      db.public.none("CREATE TYPE device_trust_level AS ENUM ('trusted', 'unknown', 'untrusted');");
    } catch (_) {}

    try {
      db.public.none("CREATE TYPE session_status AS ENUM ('ACTIVE', 'MFA_REQUIRED', 'RESTRICTED', 'SUSPENDED');");
    } catch (_) {}

    try {
      db.public.none("CREATE TYPE approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');");
    } catch (_) {}

    db.public.none(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role user_role NOT NULL DEFAULT 'employee',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    db.public.none(`
      CREATE TABLE IF NOT EXISTS resources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        sensitivity resource_sensitivity NOT NULL,
        min_role user_role NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    db.public.none(`
      CREATE TABLE IF NOT EXISTS devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        fingerprint TEXT NOT NULL,
        trust_level device_trust_level NOT NULL DEFAULT 'unknown',
        first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT uq_user_device_fingerprint UNIQUE (user_id, fingerprint)
      );
    `);

    db.public.none(`
      CREATE TABLE IF NOT EXISTS access_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
        device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        network TEXT NOT NULL,
        location TEXT NOT NULL,
        risk_score INTEGER NOT NULL,
        risk_band TEXT NOT NULL,
        policy_action TEXT NOT NULL,
        factors_json JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    db.public.none(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status session_status NOT NULL,
        current_risk INTEGER NOT NULL DEFAULT 0,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    db.public.none(`
      CREATE TABLE IF NOT EXISTS security_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
        risk_score INTEGER NOT NULL,
        risk_band TEXT NOT NULL,
        policy_action TEXT NOT NULL,
        factors_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        evidence_json JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    db.public.none(`
      CREATE TABLE IF NOT EXISTS mfa_challenges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        otp_code TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        verified BOOLEAN NOT NULL DEFAULT false
      );
    `);

    db.public.none(`
      CREATE TABLE IF NOT EXISTS approval_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
        requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action_description TEXT NOT NULL,
        status approval_status NOT NULL DEFAULT 'PENDING',
        reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        resolved_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // Seed resources in emulator
    const seedResources = [
      { name: 'Team Calendar', sensitivity: 'low', min_role: 'employee' },
      { name: 'Employee Handbook', sensitivity: 'low', min_role: 'employee' },
      { name: 'Sales Report', sensitivity: 'medium', min_role: 'manager' },
      { name: 'Payroll.xlsx', sensitivity: 'high', min_role: 'manager' },
      { name: 'System Config', sensitivity: 'high', min_role: 'admin' },
      { name: 'Audit Logs & Keys', sensitivity: 'high', min_role: 'admin' },
    ];

    for (const r of seedResources) {
      db.public.none(
        `INSERT INTO resources (name, sensitivity, min_role) VALUES ('${r.name}', '${r.sensitivity}', '${r.min_role}');`
      );
    }

    const adapter = db.adapters.createPg();
    pool = new adapter.Pool();
    isInMemory = true;
    console.log('[DB] In-memory PostgreSQL initialized with users and resources tables');
  }

  return pool;
};

const readyPromise = initDb();

export const query = async (text, params) => {
  await readyPromise;
  return pool.query(text, params);
};

export const getPool = async () => {
  await readyPromise;
  return pool;
};

export default {
  query,
  getPool,
  initDb,
};
