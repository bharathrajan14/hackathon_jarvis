import pkg from 'pg';
import { newDb, DataType } from 'pg-mem';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const { Pool } = pkg;

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
  } catch (err) {
    console.warn(`[DB] Real PostgreSQL unavailable (${err.message || 'timeout'}). Initializing AdaptiveGuard in-memory database engine.`);
    const db = newDb();

    db.public.registerFunction({
      name: 'gen_random_uuid',
      returns: DataType.uuid,
      impure: true,
      implementation: () => crypto.randomUUID(),
    });

    // 1. Users table
    db.public.none(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'EMPLOYEE',
        department TEXT DEFAULT 'General',
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 2. Resources table
    db.public.none(`
      CREATE TABLE IF NOT EXISTS resources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        sensitivity TEXT NOT NULL DEFAULT 'LOW',
        allowed_roles JSONB NOT NULL DEFAULT '["EMPLOYEE", "MANAGER", "IT_ADMINISTRATOR"]'::jsonb,
        actions JSONB NOT NULL DEFAULT '["VIEW"]'::jsonb,
        policy_id TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 3. Devices table
    db.public.none(`
      CREATE TABLE IF NOT EXISTS devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL DEFAULT 'Workstation',
        platform TEXT NOT NULL DEFAULT 'Windows',
        browser TEXT NOT NULL DEFAULT 'Chrome',
        fingerprint TEXT NOT NULL,
        trusted BOOLEAN NOT NULL DEFAULT true,
        trust_level TEXT NOT NULL DEFAULT 'trusted',
        risk_score INTEGER NOT NULL DEFAULT 0,
        ip TEXT DEFAULT '10.0.4.12',
        first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT uq_user_device_fingerprint UNIQUE (user_id, fingerprint)
      );
    `);

    // 4. Sessions table
    db.public.none(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        current_risk INTEGER NOT NULL DEFAULT 18,
        risk_level TEXT NOT NULL DEFAULT 'LOW',
        network TEXT NOT NULL DEFAULT 'corporate',
        location TEXT NOT NULL DEFAULT 'office',
        ip TEXT DEFAULT '10.0.4.12',
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '8 hours')
      );
    `);

    // 5. Access Requests & Approvals
    db.public.none(`
      CREATE TABLE IF NOT EXISTS access_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
        requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
        resource_name TEXT NOT NULL,
        action TEXT NOT NULL,
        action_description TEXT NOT NULL,
        risk_score INTEGER NOT NULL DEFAULT 50,
        risk_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
        status TEXT NOT NULL DEFAULT 'PENDING',
        manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '15 minutes'),
        approved_at TIMESTAMP WITH TIME ZONE,
        rejected_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // 6. Security Events (SOC telemetry)
    db.public.none(`
      CREATE TABLE IF NOT EXISTS security_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'LOW',
        resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
        risk_score INTEGER NOT NULL DEFAULT 0,
        risk_band TEXT NOT NULL DEFAULT 'LOW',
        risk_before INTEGER,
        risk_after INTEGER,
        policy_action TEXT NOT NULL DEFAULT 'ALLOW',
        factors_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        evidence_json JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 7. Audit Logs (Immutable security logs)
    db.public.none(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
        device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
        resource TEXT NOT NULL,
        action TEXT NOT NULL,
        decision TEXT NOT NULL,
        risk_score INTEGER NOT NULL,
        risk_level TEXT NOT NULL,
        risk_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
        context JSONB NOT NULL DEFAULT '{}'::jsonb,
        behavior_score INTEGER DEFAULT 0,
        anomaly_score INTEGER DEFAULT 0,
        policy_id TEXT,
        approval_id UUID,
        passkey_event BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 8. Website Policies
    db.public.none(`
      CREATE TABLE IF NOT EXISTS website_policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        risk TEXT NOT NULL DEFAULT 'LOW',
        policy TEXT NOT NULL DEFAULT 'ALLOW',
        description TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 9. Passkey Credentials
    db.public.none(`
      CREATE TABLE IF NOT EXISTS passkey_credentials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        credential_id TEXT UNIQUE NOT NULL,
        public_key TEXT NOT NULL,
        device_name TEXT NOT NULL DEFAULT 'Touch ID / Windows Hello',
        counter INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 10. Real-time Notifications
    db.public.none(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'LOW',
        read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Legacy table alias for backwards compatibility
    db.public.none(`
      CREATE TABLE IF NOT EXISTS approval_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
        requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action_description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        resolved_at TIMESTAMP WITH TIME ZONE
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

    // =========================================================
    // SEED INITIAL DATA
    // =========================================================
    const passwordHash = bcrypt.hashSync('password123', 10);

    // Seed Demo Users
    const seedUsers = [
      { name: 'Alice', email: 'alice@adaptiveguard.internal', role: 'EMPLOYEE', dept: 'Engineering & Finance' },
      { name: 'Bob', email: 'bob@adaptiveguard.internal', role: 'MANAGER', dept: 'Risk & Compliance' },
      { name: 'David', email: 'david@adaptiveguard.internal', role: 'IT_ADMINISTRATOR', dept: 'Security Operations' },
      { name: 'John', email: 'john@adaptiveguard.internal', role: 'EMPLOYEE', dept: 'Sales' },
      { name: 'Ravi', email: 'ravi@adaptiveguard.internal', role: 'EMPLOYEE', dept: 'Marketing' },
      { name: 'Priya', email: 'priya@adaptiveguard.internal', role: 'EMPLOYEE', dept: 'Product' },
    ];

    for (const u of seedUsers) {
      db.public.none(`
        INSERT INTO users (name, email, password_hash, role, department)
        VALUES ('${u.name}', '${u.email}', '${passwordHash}', '${u.role}', '${u.dept}');
      `);
    }

    // Seed 9 Protected Resources
    const seedResources = [
      { name: 'Employee Portal', sens: 'LOW', roles: '["EMPLOYEE", "MANAGER", "IT_ADMINISTRATOR"]', acts: '["VIEW"]', desc: 'Internal company news, policies, and directory.' },
      { name: 'Employee Records', sens: 'MEDIUM', roles: '["EMPLOYEE", "MANAGER", "IT_ADMINISTRATOR"]', acts: '["VIEW", "DOWNLOAD", "UPDATE"]', desc: 'Employee personnel files and compensation overview.' },
      { name: 'Customer Records', sens: 'MEDIUM', roles: '["EMPLOYEE", "MANAGER", "IT_ADMINISTRATOR"]', acts: '["VIEW", "DOWNLOAD", "UPDATE", "CREATE"]', desc: 'Client account records and enterprise CRM pipeline.' },
      { name: 'Financial Reports', sens: 'HIGH', roles: '["EMPLOYEE", "MANAGER", "IT_ADMINISTRATOR"]', acts: '["VIEW", "DOWNLOAD", "EXPORT"]', desc: 'Audited balance sheets, EBITDA summaries, and quarterly earnings.' },
      { name: 'Financial Database', sens: 'CRITICAL', roles: '["EMPLOYEE", "MANAGER", "IT_ADMINISTRATOR"]', acts: '["VIEW", "DOWNLOAD", "EXPORT", "DELETE"]', desc: 'Core ledger, transactional banking records, and payment clearinghouse.' },
      { name: 'Security Reports', sens: 'HIGH', roles: '["MANAGER", "IT_ADMINISTRATOR"]', acts: '["VIEW", "DOWNLOAD", "EXPORT"]', desc: 'SOC telemetry, penetration testing disclosures, and vulnerability reports.' },
      { name: 'Audit Logs', sens: 'HIGH', roles: '["MANAGER", "IT_ADMINISTRATOR"]', acts: '["VIEW", "EXPORT"]', desc: 'Immutable enterprise security audit trail and policy evaluations.' },
      { name: 'Admin Console', sens: 'CRITICAL', roles: '["IT_ADMINISTRATOR"]', acts: '["VIEW", "UPDATE", "CONFIGURE"]', desc: 'Platform IAM settings, tenant administration, and identity federation.' },
      { name: 'System Configuration', sens: 'CRITICAL', roles: '["IT_ADMINISTRATOR"]', acts: '["VIEW", "CONFIGURE", "UPDATE", "DELETE"]', desc: 'Cryptographic key rings, API gateways, and core kernel parameters.' },
    ];

    for (const r of seedResources) {
      db.public.none(`
        INSERT INTO resources (name, sensitivity, allowed_roles, actions, description)
        VALUES ('${r.name}', '${r.sens}', '${r.roles}'::jsonb, '${r.acts}'::jsonb, '${r.desc}');
      `);
    }

    // Seed 4 Website Policies
    const seedWebPolicies = [
      { domain: 'company-portal.local', category: 'Corporate', risk: 'LOW', policy: 'ALLOW', desc: 'Official internal intranet and enterprise knowledge base.' },
      { domain: 'restricted-demo.local', category: 'Restricted', risk: 'MEDIUM', policy: 'PASSKEY', desc: 'Outside standard corporate browsing scope. Requires biometric step-up.' },
      { domain: 'suspicious-download.local', category: 'Suspicious', risk: 'HIGH', policy: 'PASSKEY', desc: 'Untrusted repository detected. Elevated controls mandated.' },
      { domain: 'blocked-demo.local', category: 'Blocked', risk: 'CRITICAL', policy: 'DENY', desc: 'Malicious or non-compliant destination prohibited by security policy.' },
    ];

    for (const wp of seedWebPolicies) {
      db.public.none(`
        INSERT INTO website_policies (domain, category, risk, policy, description)
        VALUES ('${wp.domain}', '${wp.category}', '${wp.risk}', '${wp.policy}', '${wp.desc}');
      `);
    }

    // Link devices for Alice, Bob, David, Ravi
    const allUsers = db.public.many('SELECT id, name FROM users;');
    for (const u of allUsers) {
      const isTrusted = u.name !== 'Ravi';
      const devName = `${u.name} ${u.name === 'David' ? 'Workstation' : 'Laptop'}`;
      const platform = u.name === 'Alice' ? 'macOS' : u.name === 'David' ? 'Linux' : 'Windows';
      const trustLevel = isTrusted ? 'trusted' : 'untrusted';
      const riskScore = isTrusted ? 0 : 35;

      db.public.none(`
        INSERT INTO devices (user_id, name, platform, browser, fingerprint, trusted, trust_level, risk_score)
        VALUES ('${u.id}', '${devName}', '${platform}', 'Chrome', 'fp_${u.name.toLowerCase()}_primary', ${isTrusted}, '${trustLevel}', ${riskScore});
      `);

      // Seed Passkey for Alice, Bob, David
      if (['Alice', 'Bob', 'David'].includes(u.name)) {
        db.public.none(`
          INSERT INTO passkey_credentials (user_id, credential_id, public_key, device_name)
          VALUES ('${u.id}', 'cred_${u.name.toLowerCase()}_fido2_key', 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA', '${devName} (TouchID / FIDO2)');
        `);
      }
    }

    const adapter = db.adapters.createPg();
    pool = new adapter.Pool();
    isInMemory = true;
    console.log('[DB] AdaptiveGuard database initialized: 6 Users, 9 Resources, 4 Web Policies, Devices & Passkeys seeded.');
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
