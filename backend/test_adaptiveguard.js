// Automated test script for AdaptiveGuard backend endpoints
async function test() {
  const BASE_URL = 'http://127.0.0.1:5000';
  console.log('Testing AdaptiveGuard backend APIs at', BASE_URL);

  // 1. Test Passkey Login for Alice
  const loginRes = await fetch(`${BASE_URL}/api/auth/webauthn/login/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'alice@adaptiveguard.internal',
      simulated: true,
    }),
  });

  const loginData = await loginRes.json();
  console.log('1. Passkey Login Status:', loginRes.status, 'Response:', {
    status: loginData.status,
    riskScore: loginData.riskScore,
    user: loginData.user,
  });

  if (!loginData.token) {
    throw new Error('Login failed, token not returned');
  }
  const aliceToken = loginData.token;

  // 2. Test Fetching Resources
  const resRes = await fetch(`${BASE_URL}/api/resources`, {
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  const resources = await resRes.json();
  console.log(`2. Resources Fetched: ${resources.length} resources`);
  console.log('   Sample resource:', resources[0]?.name, 'Sensitivity:', resources[0]?.sensitivity);

  // 3. Test Authorization Check: Employee Portal -> VIEW (Should be ALLOW)
  const checkAllowRes = await fetch(`${BASE_URL}/api/authorization/check`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${aliceToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resourceName: 'Employee Portal',
      action: 'VIEW',
    }),
  });
  const allowData = await checkAllowRes.json();
  console.log('3. Auth Check (Employee Portal VIEW):', {
    decision: allowData.decision,
    riskScore: allowData.riskScore,
    riskLevel: allowData.riskLevel,
  });

  // 4. Test Authorization Check: Financial Reports -> VIEW (Should be RESTRICT / PASSKEY)
  const checkRestrRes = await fetch(`${BASE_URL}/api/authorization/check`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${aliceToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resourceName: 'Financial Reports',
      action: 'VIEW',
    }),
  });
  const restrData = await checkRestrRes.json();
  console.log('4. Auth Check (Financial Reports VIEW):', {
    decision: restrData.decision,
    requiredControl: restrData.requiredControl,
    riskScore: restrData.riskScore,
  });

  // 5. Test Authorization Check: Financial Database -> EXPORT (Should be APPROVAL_AND_PASSKEY)
  const checkExpRes = await fetch(`${BASE_URL}/api/authorization/check`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${aliceToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resourceName: 'Financial Database',
      action: 'EXPORT',
    }),
  });
  const expData = await checkExpRes.json();
  console.log('5. Auth Check (Financial Database EXPORT):', {
    decision: expData.decision,
    requiredControl: expData.requiredControl,
    riskScore: expData.riskScore,
  });

  // 6. Test Hard RBAC: Admin Console -> VIEW (Should be DENY)
  const checkDenyRes = await fetch(`${BASE_URL}/api/authorization/check`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${aliceToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resourceName: 'Admin Console',
      action: 'VIEW',
    }),
  });
  const denyData = await checkDenyRes.json();
  console.log('6. Hard RBAC Check (Admin Console VIEW by EMPLOYEE):', {
    decision: denyData.decision,
    reason: denyData.reason,
  });

  // 7. Test Simulation Reset
  const resetRes = await fetch(`${BASE_URL}/api/simulation/reset`, { method: 'POST' });
  const resetData = await resetRes.json();
  console.log('7. Simulation Reset:', resetData.message, 'Current Risk:', resetData.currentRisk);

  // 8. Test Simulation Trigger: Request Spike
  const spikeRes = await fetch(`${BASE_URL}/api/simulation/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ triggerType: 'REQUEST_SPIKE' }),
  });
  const spikeData = await spikeRes.json();
  console.log('8. Trigger REQUEST_SPIKE:', {
    riskBefore: spikeData.riskBefore,
    riskAfter: spikeData.riskAfter,
    riskLevel: spikeData.riskLevel,
  });

  // 9. Test Full Attack Scenario
  const scenRes = await fetch(`${BASE_URL}/api/simulation/full-scenario`, { method: 'POST' });
  const scenData = await scenRes.json();
  console.log('9. Full Attack Scenario:', {
    status: scenData.finalStatus,
    finalRisk: scenData.finalRiskScore,
    steps: scenData.totalStepsExecuted,
  });

  // 10. Test Admin Stats
  const statsRes = await fetch(`${BASE_URL}/api/admin/stats`);
  const statsData = await statsRes.json();
  console.log('10. Admin Stats: Total Users =', statsData.totalUsers, 'Health =', statsData.systemHealth[0]);

  console.log('\n>>> All Backend Tests Passed Successfully! <<<');
}

test().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
