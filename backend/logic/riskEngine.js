const NETWORK_POINTS = {
  office: 0,
  public: 15,
  unknown: 25,
};

const LOCATION_POINTS = {
  office: 0,
  near: 10,
  far: 20,
};

const DEVICE_TRUST_POINTS = {
  trusted: 0,
  unknown: 20,
  untrusted: 30,
};

const SENSITIVITY_POINTS = {
  low: 0,
  medium: 10,
  high: 20,
};

/**
 * Pure function to calculate risk score, band, and factor breakdown.
 * No imports of db, express, or any I/O. Standalone with no side effects.
 *
 * @param {Object} params
 * @param {'office'|'public'|'unknown'} params.network
 * @param {'office'|'near'|'far'} params.location
 * @param {'trusted'|'unknown'|'untrusted'} params.deviceTrust
 * @param {'low'|'medium'|'high'} params.resourceSensitivity
 * @returns {{ score: number, band: string, factors: Array<{ name: string, value: string, points: number }> }}
 */
export function calculateRisk({ network, location, deviceTrust, resourceSensitivity }) {
  const networkPts = NETWORK_POINTS[network] ?? 25;
  const locationPts = LOCATION_POINTS[location] ?? 20;
  const deviceTrustPts = DEVICE_TRUST_POINTS[deviceTrust] ?? 30;
  const sensitivityPts = SENSITIVITY_POINTS[resourceSensitivity] ?? 20;

  const score = networkPts + locationPts + deviceTrustPts + sensitivityPts;

  let band = 'Low';
  if (score >= 75) {
    band = 'Critical';
  } else if (score >= 55) {
    band = 'High';
  } else if (score >= 30) {
    band = 'Medium';
  } else {
    band = 'Low';
  }

  const factors = [
    { name: 'network', value: network, points: networkPts },
    { name: 'location', value: location, points: locationPts },
    { name: 'deviceTrust', value: deviceTrust, points: deviceTrustPts },
    { name: 'resourceSensitivity', value: resourceSensitivity, points: sensitivityPts },
  ];

  return {
    score,
    band,
    factors,
  };
}

export default calculateRisk;
