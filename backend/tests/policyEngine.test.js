import { decideAction } from '../logic/policyEngine.js';

function runTests() {
  console.log('=== Starting Policy Engine Unit Tests ===\n');
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`FAIL: ${name}`);
      console.error(`  ${err.message}`);
      failed++;
    }
  }

  // 1. Low risk band -> ALLOW
  test('Low band returns ALLOW', () => {
    const action = decideAction({ riskBand: 'Low', role: 'employee', resourceSensitivity: 'low' });
    if (action !== 'ALLOW') throw new Error(`Expected 'ALLOW', got '${action}'`);
  });

  // 2. Medium risk band -> MFA
  test('Medium band returns MFA', () => {
    const action = decideAction({ riskBand: 'Medium', role: 'employee', resourceSensitivity: 'medium' });
    if (action !== 'MFA') throw new Error(`Expected 'MFA', got '${action}'`);
  });

  // 3. High risk band + employee -> READ_ONLY
  test('High band with role=employee returns READ_ONLY', () => {
    const action = decideAction({ riskBand: 'High', role: 'employee', resourceSensitivity: 'high' });
    if (action !== 'READ_ONLY') throw new Error(`Expected 'READ_ONLY', got '${action}'`);
  });

  // 4. High risk band + manager -> MFA_PLUS_APPROVAL
  test('High band with role=manager returns MFA_PLUS_APPROVAL', () => {
    const action = decideAction({ riskBand: 'High', role: 'manager', resourceSensitivity: 'high' });
    if (action !== 'MFA_PLUS_APPROVAL') throw new Error(`Expected 'MFA_PLUS_APPROVAL', got '${action}'`);
  });

  // 5. High risk band + admin -> MFA_PLUS_APPROVAL
  test('High band with role=admin returns MFA_PLUS_APPROVAL', () => {
    const action = decideAction({ riskBand: 'High', role: 'admin', resourceSensitivity: 'high' });
    if (action !== 'MFA_PLUS_APPROVAL') throw new Error(`Expected 'MFA_PLUS_APPROVAL', got '${action}'`);
  });

  // 6. Critical risk band -> DENY
  test('Critical band returns DENY', () => {
    const action = decideAction({ riskBand: 'Critical', role: 'admin', resourceSensitivity: 'high' });
    if (action !== 'DENY') throw new Error(`Expected 'DENY', got '${action}'`);
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

runTests();
