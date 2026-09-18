import dotenv from 'dotenv';
import { ensureServer } from './testHelper.js';
dotenv.config();

const API_BASE = 'http://localhost:5000';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }

  return { status: res.status, data };
}

async function registerAndLogin(name, email, password, role) {
  await request('/auth/register', {
    method: 'POST',
    body: { name, email, password, role },
  });

  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });

  if (loginRes.status !== 200 || !loginRes.data.token) {
    throw new Error(`Failed to login as ${role}: ${JSON.stringify(loginRes.data)}`);
  }

  return { token: loginRes.data.token, user: loginRes.data.user };
}

async function runAuditTests() {
  await ensureServer();
  console.log('=== Starting Audit Logging + Wiring Test Suite ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`PASS: ${message}`);
      passed++;
    } else {
      console.error(`FAIL: ${message}`);
      failed++;
    }
  }

  const ts = Date.now();
  const password = 'Password123!';

  try {
    // 1. Create 3 different users: Alice (employee), Bob (employee), Carol (manager)
    const user1 = await registerAndLogin('Alice Employee', `audit_alice_${ts}@example.com`, password, 'employee');
    const user2 = await registerAndLogin('Bob Employee', `audit_bob_${ts}@example.com`, password, 'employee');
    const user3 = await registerAndLogin('Carol Manager', `audit_carol_${ts}@example.com`, password, 'manager');

    // 2. Register devices for each user
    const dev1Res = await request('/devices/register', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1.token}` },
      body: { fingerprint: `fp_alice_${ts}` },
    });
    const device1 = dev1Res.data.device;

    const dev2Res = await request('/devices/register', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user2.token}` },
      body: { fingerprint: `fp_bob_${ts}` },
    });
    const device2 = dev2Res.data.device;

    const dev3Res = await request('/devices/register', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user3.token}` },
      body: { fingerprint: `fp_carol_${ts}` },
    });
    const device3 = dev3Res.data.device;

    // 3. Fetch resources to locate Team Calendar (low) and Payroll.xlsx (high)
    const resList = await request('/resources', {
      headers: { Authorization: `Bearer ${user3.token}` },
    });
    const calendarResource = resList.data.find(r => r.name === 'Team Calendar');
    const payrollResource = resList.data.find(r => r.name === 'Payroll.xlsx');

    assert(!!calendarResource, 'Found Team Calendar resource');
    assert(!!payrollResource, 'Found Payroll.xlsx resource');

    // 4. Request 1 (Low Band): Alice Employee on office / office / unknown-device (20) / low-resource (0) = 20 pts -> Low -> ALLOW
    const req1Res = await request('/access/request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1.token}` },
      body: {
        resourceId: calendarResource.id,
        network: 'office',
        location: 'office',
        deviceId: device1.id,
      },
    });
    assert(req1Res.status === 200, 'Request 1 (Low band) returns 200');
    assert(req1Res.data.riskBand === 'Low', `Request 1 riskBand is Low (score: ${req1Res.data.riskScore})`);
    assert(req1Res.data.action === 'ALLOW', `Request 1 action is ALLOW (got: ${req1Res.data.action})`);
    const req1Data = req1Res.data;

    // 5. Request 2 (High Band): Bob Employee on unknown (25) / near (10) / unknown-device (20) / low-resource (0) = 55 pts -> High -> READ_ONLY
    const req2Res = await request('/access/request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user2.token}` },
      body: {
        resourceId: calendarResource.id,
        network: 'unknown',
        location: 'near',
        deviceId: device2.id,
      },
    });
    assert(req2Res.status === 200, 'Request 2 (High band) returns 200');
    assert(req2Res.data.riskBand === 'High', `Request 2 riskBand is High (score: ${req2Res.data.riskScore})`);
    assert(req2Res.data.action === 'READ_ONLY', `Request 2 action is READ_ONLY (got: ${req2Res.data.action})`);
    const req2Data = req2Res.data;

    // 6. Request 3 (Critical Band): Carol Manager on public (15) / far (20) / unknown-device (20) / high-resource (20) = 75 pts -> Critical -> DENY
    const req3Res = await request('/access/request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user3.token}` },
      body: {
        resourceId: payrollResource.id,
        network: 'public',
        location: 'far',
        deviceId: device3.id,
      },
    });
    assert(req3Res.status === 200, 'Request 3 (Critical band) returns 200');
    assert(req3Res.data.riskBand === 'Critical', `Request 3 riskBand is Critical (score: ${req3Res.data.riskScore})`);
    assert(req3Res.data.action === 'DENY', `Request 3 action is DENY (got: ${req3Res.data.action})`);
    const req3Data = req3Res.data;

    // 7. Fetch GET /audit-logs
    const auditRes = await request('/audit-logs', {
      headers: { Authorization: `Bearer ${user1.token}` },
    });
    assert(auditRes.status === 200, 'GET /audit-logs returns 200');
    assert(Array.isArray(auditRes.data), 'GET /audit-logs returns array');
    assert(auditRes.data.length >= 3, `Audit logs has at least 3 entries (got ${auditRes.data.length})`);

    // Verify most recent entry corresponds to Request 3 (Carol Manager, Critical, DENY)
    const log1 = auditRes.data[0];
    assert(log1.userName === 'Carol Manager', `Log 1 userName is Carol Manager (got: ${log1.userName})`);
    assert(log1.resourceName === 'Payroll.xlsx', `Log 1 resourceName is Payroll.xlsx (got: ${log1.resourceName})`);
    assert(log1.riskScore === req3Data.riskScore, `Log 1 riskScore matches request time (${req3Data.riskScore})`);
    assert(log1.riskBand === req3Data.riskBand, `Log 1 riskBand matches request time (${req3Data.riskBand})`);
    assert(log1.action === req3Data.action, `Log 1 action matches request time (${req3Data.action})`);
    assert(!!log1.createdAt, 'Log 1 has createdAt timestamp');

    // Verify second entry corresponds to Request 2 (Bob Employee, High, READ_ONLY)
    const log2 = auditRes.data[1];
    assert(log2.userName === 'Bob Employee', `Log 2 userName is Bob Employee (got: ${log2.userName})`);
    assert(log2.resourceName === 'Team Calendar', `Log 2 resourceName is Team Calendar (got: ${log2.resourceName})`);
    assert(log2.riskScore === req2Data.riskScore, `Log 2 riskScore matches request time (${req2Data.riskScore})`);
    assert(log2.riskBand === req2Data.riskBand, `Log 2 riskBand matches request time (${req2Data.riskBand})`);
    assert(log2.action === req2Data.action, `Log 2 action matches request time (${req2Data.action})`);
    assert(!!log2.createdAt, 'Log 2 has createdAt timestamp');

    // Verify third entry corresponds to Request 1 (Alice Employee, Low, ALLOW)
    const log3 = auditRes.data[2];
    assert(log3.userName === 'Alice Employee', `Log 3 userName is Alice Employee (got: ${log3.userName})`);
    assert(log3.resourceName === 'Team Calendar', `Log 3 resourceName is Team Calendar (got: ${log3.resourceName})`);
    assert(log3.riskScore === req1Data.riskScore, `Log 3 riskScore matches request time (${req1Data.riskScore})`);
    assert(log3.riskBand === req1Data.riskBand, `Log 3 riskBand matches request time (${req1Data.riskBand})`);
    assert(log3.action === req1Data.action, `Log 3 action matches request time (${req1Data.action})`);
    assert(!!log3.createdAt, 'Log 3 has createdAt timestamp');

    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('Audit logging test failed:', err);
    process.exit(1);
  }
}

runAuditTests();
