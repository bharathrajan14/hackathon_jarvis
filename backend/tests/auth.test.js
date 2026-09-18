import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const API_BASE = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_replace_in_production';

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

async function runTests() {
  console.log('=== Starting Auth + Roles Test Suite ===\n');
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
  const employeeEmail = `employee_${ts}@example.com`;
  const managerEmail = `manager_${ts}@example.com`;
  const adminEmail = `admin_${ts}@example.com`;
  const password = 'Password123!';

  try {
    // 1. Register Employee
    const empReg = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'John Employee',
        email: employeeEmail,
        password,
        role: 'employee',
      },
    });
    assert(empReg.status === 201, 'Register employee returns 201');
    assert(empReg.data.user && empReg.data.user.role === 'employee', 'Employee user created with correct role');

    // 2. Register Manager
    const mgrReg = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Sarah Manager',
        email: managerEmail,
        password,
        role: 'manager',
      },
    });
    assert(mgrReg.status === 201, 'Register manager returns 201');
    assert(mgrReg.data.user && mgrReg.data.user.role === 'manager', 'Manager user created with correct role');

    // 3. Register Admin
    const adminReg = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Alex Admin',
        email: adminEmail,
        password,
        role: 'admin',
      },
    });
    assert(adminReg.status === 201, 'Register admin returns 201');
    assert(adminReg.data.user && adminReg.data.user.role === 'admin', 'Admin user created with correct role');

    // 4. Duplicate email registration
    const dupReg = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Duplicate Admin',
        email: adminEmail,
        password,
        role: 'admin',
      },
    });
    assert(dupReg.status === 409, 'Duplicate email registration returns 409 Conflict');

    // 5. Login Employee & decode JWT
    const empLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        email: employeeEmail,
        password,
      },
    });
    assert(empLogin.status === 200, 'Employee login returns 200');
    assert(!!empLogin.data.token, 'Employee login returns JWT token');
    const decodedEmp = jwt.verify(empLogin.data.token, JWT_SECRET);
    assert(decodedEmp.role === 'employee', `Decoded employee JWT role claim matches 'employee' (got: ${decodedEmp.role})`);

    // 6. Login Manager & decode JWT
    const mgrLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        email: managerEmail,
        password,
      },
    });
    assert(mgrLogin.status === 200, 'Manager login returns 200');
    assert(!!mgrLogin.data.token, 'Manager login returns JWT token');
    const decodedMgr = jwt.verify(mgrLogin.data.token, JWT_SECRET);
    assert(decodedMgr.role === 'manager', `Decoded manager JWT role claim matches 'manager' (got: ${decodedMgr.role})`);

    // 7. Login Admin & decode JWT
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        email: adminEmail,
        password,
      },
    });
    assert(adminLogin.status === 200, 'Admin login returns 200');
    assert(!!adminLogin.data.token, 'Admin login returns JWT token');
    const decodedAdmin = jwt.verify(adminLogin.data.token, JWT_SECRET);
    assert(decodedAdmin.role === 'admin', `Decoded admin JWT role claim matches 'admin' (got: ${decodedAdmin.role})`);

    // 8. Hit dummy protected route with a bad token -> confirm 401
    const badTokenRes = await request('/dummy-protected', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer invalid.fake.token',
      },
    });
    assert(badTokenRes.status === 401, 'Protected route with bad token returns 401');

    // 9. Hit dummy protected route with missing token -> confirm 401
    const noTokenRes = await request('/dummy-protected', {
      method: 'GET',
    });
    assert(noTokenRes.status === 401, 'Protected route with missing token returns 401');

    // 10. Hit dummy protected route with valid token -> confirm 200
    const validTokenRes = await request('/dummy-protected', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${adminLogin.data.token}`,
      },
    });
    assert(validTokenRes.status === 200, 'Protected route with valid token returns 200');
    assert(validTokenRes.data.user.role === 'admin', 'Protected route returns req.user with role');

    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runTests();
