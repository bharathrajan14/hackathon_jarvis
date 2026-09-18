import dotenv from 'dotenv';
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

async function runContextTests() {
  console.log('=== Starting Context Capture Test Suite ===\n');
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
    // 1. Create User A and User B
    const userA = await registerAndLogin('Context User A', `context_a_${ts}@example.com`, password, 'employee');
    const userB = await registerAndLogin('Context User B', `context_b_${ts}@example.com`, password, 'manager');

    // 2. User A registers device 1
    const dev1Res = await request('/devices/register', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userA.token}` },
      body: { fingerprint: `fp_macbook_${ts}` },
    });
    assert(dev1Res.status === 201, 'User A registers device 1 returns 201');
    assert(dev1Res.data.device && dev1Res.data.device.trust_level === 'unknown', 'Device 1 defaults to trust_level unknown');
    const device1 = dev1Res.data.device;

    // 3. User A registers device 2
    const dev2Res = await request('/devices/register', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userA.token}` },
      body: { fingerprint: `fp_iphone_${ts}` },
    });
    assert(dev2Res.status === 201, 'User A registers device 2 returns 201');
    assert(dev2Res.data.device && dev2Res.data.device.trust_level === 'unknown', 'Device 2 defaults to trust_level unknown');
    const device2 = dev2Res.data.device;
    assert(device1.id !== device2.id, 'Device 1 and Device 2 have distinct IDs');

    // 4. User A registers device 1 again (idempotency check)
    const dev1DuplicateRes = await request('/devices/register', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userA.token}` },
      body: { fingerprint: `fp_macbook_${ts}` },
    });
    assert(dev1DuplicateRes.status === 200, 'Re-registering existing fingerprint returns 200');
    assert(dev1DuplicateRes.data.device.id === device1.id, 'Returns existing device record on duplicate fingerprint');

    // 5. User B registers device 3
    const devBRes = await request('/devices/register', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userB.token}` },
      body: { fingerprint: `fp_userb_tablet_${ts}` },
    });
    assert(devBRes.status === 201, 'User B registers device 3 returns 201');
    const deviceB = devBRes.data.device;

    // 6. Get a valid resource ID for User A
    const resList = await request('/resources', {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    assert(resList.status === 200 && resList.data.length > 0, 'Fetched resources for user A');
    const targetResource = resList.data[0];
    console.log(`Using target resource: "${targetResource.name}" (id: ${targetResource.id}, sensitivity: ${targetResource.sensitivity})`);

    // 7. POST /access/request with a valid combination
    const validAccessRes = await request('/access/request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userA.token}` },
      body: {
        resourceId: targetResource.id,
        network: 'office',
        location: 'office',
        deviceId: device1.id,
      },
    });
    assert(validAccessRes.status === 200, 'Valid access request returns 200');
    assert(validAccessRes.data.network === 'office', 'Echoed network is office');
    assert(validAccessRes.data.location === 'office', 'Echoed location is office');
    assert(validAccessRes.data.deviceTrust === device1.trust_level, `Echoed deviceTrust matches device trust_level (${device1.trust_level})`);
    assert(validAccessRes.data.resourceSensitivity === targetResource.sensitivity, `Echoed resourceSensitivity matches resource sensitivity (${targetResource.sensitivity})`);

    // 8. POST /access/request with invalid network value
    const invalidNetRes = await request('/access/request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userA.token}` },
      body: {
        resourceId: targetResource.id,
        network: 'satellite_starlink',
        location: 'office',
        deviceId: device1.id,
      },
    });
    assert(invalidNetRes.status === 400, 'Invalid network value returns 400');
    assert(!!invalidNetRes.data.error, 'Returns clear error message on invalid network');

    // 9. POST /access/request with invalid location value
    const invalidLocRes = await request('/access/request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userA.token}` },
      body: {
        resourceId: targetResource.id,
        network: 'office',
        location: 'mars',
        deviceId: device1.id,
      },
    });
    assert(invalidLocRes.status === 400, 'Invalid location value returns 400');
    assert(!!invalidLocRes.data.error, 'Returns clear error message on invalid location');

    // 10. POST /access/request with a deviceId belonging to a different user
    const wrongDeviceRes = await request('/access/request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userA.token}` },
      body: {
        resourceId: targetResource.id,
        network: 'office',
        location: 'office',
        deviceId: deviceB.id,
      },
    });
    assert(wrongDeviceRes.status === 403, 'DeviceId belonging to different user returns 403');
    assert(wrongDeviceRes.data.error && wrongDeviceRes.data.error.includes('logged-in user'), 'Returns clear forbidden message on foreign deviceId');

    // 11. POST /access/request with non-existent resourceId
    const badResourceRes = await request('/access/request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userA.token}` },
      body: {
        resourceId: 'a0000000-0000-0000-0000-000000000000',
        network: 'office',
        location: 'office',
        deviceId: device1.id,
      },
    });
    assert(badResourceRes.status === 400, 'Non-existent resourceId returns 400');

    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Context capture test failed:', err);
    process.exit(1);
  }
}

runContextTests();
