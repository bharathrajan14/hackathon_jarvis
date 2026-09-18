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

  return loginRes.data.token;
}

async function runRbacTests() {
  await ensureServer();
  console.log('=== Starting RBAC / Resource Authorization Test Suite ===\n');
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
    // Obtain tokens for employee, manager, admin
    const empToken = await registerAndLogin('RBAC Employee', `rbac_emp_${ts}@example.com`, password, 'employee');
    const mgrToken = await registerAndLogin('RBAC Manager', `rbac_mgr_${ts}@example.com`, password, 'manager');
    const adminToken = await registerAndLogin('RBAC Admin', `rbac_admin_${ts}@example.com`, password, 'admin');

    // 1. Employee access check
    const empRes = await request('/resources', {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    assert(empRes.status === 200, 'Employee GET /resources returns 200');
    assert(Array.isArray(empRes.data), 'Employee response is an array');
    
    const empNames = empRes.data.map(r => r.name);
    console.log('Employee sees:', empNames);
    assert(empNames.includes('Team Calendar'), 'Employee sees Team Calendar');
    assert(empNames.includes('Employee Handbook'), 'Employee sees Employee Handbook');
    assert(!empNames.includes('Sales Report'), 'Employee CANNOT see Sales Report (manager-level)');
    assert(!empNames.includes('Payroll.xlsx'), 'Employee CANNOT see Payroll.xlsx (manager-level)');
    assert(!empNames.includes('System Config'), 'Employee CANNOT see System Config (admin-level)');
    assert(!empNames.includes('Audit Logs & Keys'), 'Employee CANNOT see Audit Logs & Keys (admin-level)');
    assert(empRes.data.length === 2, `Employee sees exactly 2 resources (got ${empRes.data.length})`);

    // Verify response shape: id, name, sensitivity and NO min_role
    for (const item of empRes.data) {
      assert(item.id && item.name && item.sensitivity, `Resource contains {id, name, sensitivity}: ${item.name}`);
      assert(item.min_role === undefined, `min_role is NOT leaked to client: ${item.name}`);
    }

    // 2. Manager access check
    const mgrRes = await request('/resources', {
      headers: { Authorization: `Bearer ${mgrToken}` },
    });
    assert(mgrRes.status === 200, 'Manager GET /resources returns 200');
    assert(Array.isArray(mgrRes.data), 'Manager response is an array');

    const mgrNames = mgrRes.data.map(r => r.name);
    console.log('Manager sees:', mgrNames);
    assert(mgrNames.includes('Team Calendar'), 'Manager sees Team Calendar (employee-level)');
    assert(mgrNames.includes('Employee Handbook'), 'Manager sees Employee Handbook (employee-level)');
    assert(mgrNames.includes('Sales Report'), 'Manager sees Sales Report (manager-level)');
    assert(mgrNames.includes('Payroll.xlsx'), 'Manager sees Payroll.xlsx (manager-level)');
    assert(!mgrNames.includes('System Config'), 'Manager CANNOT see System Config (admin-level)');
    assert(!mgrNames.includes('Audit Logs & Keys'), 'Manager CANNOT see Audit Logs & Keys (admin-level)');
    assert(mgrRes.data.length === 4, `Manager sees exactly 4 resources (got ${mgrRes.data.length})`);
    assert(mgrRes.data.length > empRes.data.length, 'Manager sees strictly more resources than Employee');

    for (const item of mgrRes.data) {
      assert(item.min_role === undefined, `min_role is NOT leaked to manager client: ${item.name}`);
    }

    // 3. Admin access check
    const adminRes = await request('/resources', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminRes.status === 200, 'Admin GET /resources returns 200');
    assert(Array.isArray(adminRes.data), 'Admin response is an array');

    const adminNames = adminRes.data.map(r => r.name);
    console.log('Admin sees:', adminNames);
    assert(adminNames.includes('Team Calendar'), 'Admin sees Team Calendar');
    assert(adminNames.includes('Sales Report'), 'Admin sees Sales Report');
    assert(adminNames.includes('Payroll.xlsx'), 'Admin sees Payroll.xlsx');
    assert(adminNames.includes('System Config'), 'Admin sees System Config (admin-level)');
    assert(adminNames.includes('Audit Logs & Keys'), 'Admin sees Audit Logs & Keys (admin-level)');
    assert(adminRes.data.length === 6, `Admin sees all 6 resources (got ${adminRes.data.length})`);
    assert(adminRes.data.length > mgrRes.data.length, 'Admin sees strictly more resources than Manager');

    for (const item of adminRes.data) {
      assert(item.min_role === undefined, `min_role is NOT leaked to admin client: ${item.name}`);
    }

    // 4. Test manual tampering: Employee attempts sending headers or params
    const tamperedRes = await request('/resources?role=admin', {
      headers: {
        Authorization: `Bearer ${empToken}`,
        'X-Role': 'admin',
        'X-Override-Role': 'admin',
      },
    });
    const tamperedNames = tamperedRes.data.map(r => r.name);
    assert(!tamperedNames.includes('System Config'), 'Manually crafted employee request still CANNOT see admin resource');
    assert(tamperedRes.data.length === 2, 'Tampered request strictly yields only employee resources');

    // 5. Unauthenticated access check
    const unauthRes = await request('/resources');
    assert(unauthRes.status === 401, 'Unauthenticated request to GET /resources returns 401');

    const badTokenRes = await request('/resources', {
      headers: { Authorization: 'Bearer forged.bad.jwt' },
    });
    assert(badTokenRes.status === 401, 'Bad token request to GET /resources returns 401');

    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('RBAC test failed:', err);
    process.exit(1);
  }
}

runRbacTests();
