import { calculateRisk } from '../logic/riskEngine.js';

function assertDeepEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${message}\nExpected: ${expectedStr}\nActual:   ${actualStr}`);
  }
}

function runTests() {
  console.log('=== Starting Risk Engine Unit Tests ===\n');
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

  // 1. All-zero baseline test case
  test('All-zero baseline (office/office/trusted/low) -> score=0, band=Low', () => {
    const input = {
      network: 'office',
      location: 'office',
      deviceTrust: 'trusted',
      resourceSensitivity: 'low',
    };
    const result = calculateRisk(input);

    if (result.score !== 0) throw new Error(`Expected score 0, got ${result.score}`);
    if (result.band !== 'Low') throw new Error(`Expected band 'Low', got ${result.band}`);

    assertDeepEqual(result.factors, [
      { name: 'network', value: 'office', points: 0 },
      { name: 'location', value: 'office', points: 0 },
      { name: 'deviceTrust', value: 'trusted', points: 0 },
      { name: 'resourceSensitivity', value: 'low', points: 0 },
    ], 'Factors array must include all 4 factors with 0 points');
  });

  // 2. Mixed-medium test case
  test('Mixed-medium (public/near/trusted/medium) -> score=35, band=Medium', () => {
    const input = {
      network: 'public',
      location: 'near',
      deviceTrust: 'trusted',
      resourceSensitivity: 'medium',
    };
    const result = calculateRisk(input);

    if (result.score !== 35) throw new Error(`Expected score 35, got ${result.score}`);
    if (result.band !== 'Medium') throw new Error(`Expected band 'Medium', got ${result.band}`);

    assertDeepEqual(result.factors, [
      { name: 'network', value: 'public', points: 15 },
      { name: 'location', value: 'near', points: 10 },
      { name: 'deviceTrust', value: 'trusted', points: 0 },
      { name: 'resourceSensitivity', value: 'medium', points: 10 },
    ], 'Factors array must accurately capture points for mixed-medium case');
  });

  // 3. High risk test case
  test('High risk (unknown/near/unknown/low) -> score=55, band=High', () => {
    const input = {
      network: 'unknown',
      location: 'near',
      deviceTrust: 'unknown',
      resourceSensitivity: 'low',
    };
    const result = calculateRisk(input);

    if (result.score !== 55) throw new Error(`Expected score 55, got ${result.score}`);
    if (result.band !== 'High') throw new Error(`Expected band 'High', got ${result.band}`);

    assertDeepEqual(result.factors, [
      { name: 'network', value: 'unknown', points: 25 },
      { name: 'location', value: 'near', points: 10 },
      { name: 'deviceTrust', value: 'unknown', points: 20 },
      { name: 'resourceSensitivity', value: 'low', points: 0 },
    ], 'Factors array must accurately reflect high risk threshold');
  });

  // 4. Exact Manager / Payroll / unknown device / public Wi-Fi / far location
  test('Manager/Payroll case (public/far/unknown/high) -> score=75+, band=Critical', () => {
    const input = {
      network: 'public',
      location: 'far',
      deviceTrust: 'unknown',
      resourceSensitivity: 'high',
    };
    const result = calculateRisk(input);

    if (result.score < 75) throw new Error(`Expected score >= 75, got ${result.score}`);
    if (result.score !== 75) throw new Error(`Expected exact score 75, got ${result.score}`);
    if (result.band !== 'Critical') throw new Error(`Expected band 'Critical', got ${result.band}`);

    assertDeepEqual(result.factors, [
      { name: 'network', value: 'public', points: 15 },
      { name: 'location', value: 'far', points: 20 },
      { name: 'deviceTrust', value: 'unknown', points: 20 },
      { name: 'resourceSensitivity', value: 'high', points: 20 },
    ], 'Factors array must match exact Manager/Payroll critical parameters');
  });

  // 5. Maximum Critical case (unknown/far/untrusted/high) -> score=95, band=Critical
  test('Maximum critical (unknown/far/untrusted/high) -> score=95, band=Critical', () => {
    const input = {
      network: 'unknown',
      location: 'far',
      deviceTrust: 'untrusted',
      resourceSensitivity: 'high',
    };
    const result = calculateRisk(input);

    if (result.score !== 95) throw new Error(`Expected score 95, got ${result.score}`);
    if (result.band !== 'Critical') throw new Error(`Expected band 'Critical', got ${result.band}`);

    assertDeepEqual(result.factors, [
      { name: 'network', value: 'unknown', points: 25 },
      { name: 'location', value: 'far', points: 20 },
      { name: 'deviceTrust', value: 'untrusted', points: 30 },
      { name: 'resourceSensitivity', value: 'high', points: 20 },
    ], 'Factors array must match maximum critical values');
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

runTests();
