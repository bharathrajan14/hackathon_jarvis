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

const TIME_OF_DAY_POINTS = {
  normal: 0,
  office_hours: 0,
  day: 0,
  unusual: 10,
  after_hours: 10,
  night: 20,
  critical: 20,
};

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000/anomaly-score';

/**
 * Maps numeric score to risk band.
 * @param {number} score
 * @returns {'Low'|'Medium'|'High'|'Critical'}
 */
export function scoreToBand(score) {
  if (score >= 75) return 'Critical';
  if (score >= 55) return 'High';
  if (score >= 30) return 'Medium';
  return 'Low';
}

/**
 * Pure function to calculate risk score, band, and factor breakdown.
 * No imports of db, express, or any I/O. Standalone with no side effects.
 *
 * @param {'LOGIN'|'ACCESS'|Object} evaluationTypeOrParams - Evaluation mode ('LOGIN' or 'ACCESS') or params object for backward compatibility
 * @param {Object} [paramsObj] - Context parameters if evaluationType was specified
 * @returns {{ score: number, band: string, factors: Array<{ name: string, value: string, points: number }> }}
 */
export function calculateRisk(evaluationTypeOrParams, paramsObj) {
  let evaluationType = 'ACCESS';
  let params = {};

  if (typeof evaluationTypeOrParams === 'string') {
    evaluationType = evaluationTypeOrParams.toUpperCase();
    params = paramsObj || {};
  } else if (typeof evaluationTypeOrParams === 'object' && evaluationTypeOrParams !== null) {
    evaluationType = 'ACCESS';
    params = evaluationTypeOrParams;
  }

  const network = params.network ?? 'unknown';
  const location = params.location ?? 'far';
  const deviceTrust = params.deviceTrust ?? params.device ?? 'unknown';

  const networkPts = NETWORK_POINTS[network] ?? 25;
  const locationPts = LOCATION_POINTS[location] ?? 20;
  const deviceTrustPts = DEVICE_TRUST_POINTS[deviceTrust] ?? 30;

  if (evaluationType === 'LOGIN') {
    // For LOGIN, use only network/location/device/time-of-day factors (no resourceSensitivity)
    const timeOfDay = params.timeOfDay ?? params['time-of-day'] ?? 'normal';
    const timeOfDayPts = TIME_OF_DAY_POINTS[timeOfDay] ?? 0;

    const score = networkPts + locationPts + deviceTrustPts + timeOfDayPts;
    const band = scoreToBand(score);

    const factors = [
      { name: 'network', value: network, points: networkPts },
      { name: 'location', value: location, points: locationPts },
      { name: 'deviceTrust', value: deviceTrust, points: deviceTrustPts },
      { name: 'timeOfDay', value: timeOfDay, points: timeOfDayPts },
    ];

    return {
      score,
      band,
      factors,
    };
  }

  // ACCESS evaluation (full feature set with resourceSensitivity)
  const resourceSensitivity = params.resourceSensitivity ?? 'high';
  const sensitivityPts = SENSITIVITY_POINTS[resourceSensitivity] ?? 20;

  // Factor in prior session risk if provided
  let priorRiskPts = 0;
  const hasPriorRisk = params.priorRisk !== undefined && params.priorRisk !== null;
  const priorRisk = hasPriorRisk ? Number(params.priorRisk) || 0 : 0;
  if (hasPriorRisk) {
    priorRiskPts = Math.min(25, Math.round(priorRisk * 0.5));
  }

  const score = Math.min(100, networkPts + locationPts + deviceTrustPts + sensitivityPts + priorRiskPts);
  const band = scoreToBand(score);

  const factors = [
    { name: 'network', value: network, points: networkPts },
    { name: 'location', value: location, points: locationPts },
    { name: 'deviceTrust', value: deviceTrust, points: deviceTrustPts },
    { name: 'resourceSensitivity', value: resourceSensitivity, points: sensitivityPts },
  ];

  if (hasPriorRisk) {
    factors.push({ name: 'priorRisk', value: String(priorRisk), points: priorRiskPts });
  }

  return {
    score,
    band,
    factors,
  };
}

/**
 * Async wrapper that calls the ML Anomaly service and blends behaviorAnomaly (0-30 pts)
 * into the factor sum for both LOGIN and ACCESS evaluation types.
 *
 * @param {'LOGIN'|'ACCESS'|Object} evaluationTypeOrParams
 * @param {Object} [paramsObj]
 * @returns {Promise<{ score: number, band: string, factors: Array<{ name: string, value: string, points: number }> }>}
 */
export async function calculateRiskAsync(evaluationTypeOrParams, paramsObj) {
  const baseResult = calculateRisk(evaluationTypeOrParams, paramsObj);

  let params = {};
  if (typeof evaluationTypeOrParams === 'string') {
    params = paramsObj || {};
  } else if (typeof evaluationTypeOrParams === 'object' && evaluationTypeOrParams !== null) {
    params = evaluationTypeOrParams;
  }

  let anomalyScore = 0;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const mlPayload = {
      userId: params.userId || params.user_id,
      network: params.network ?? 'office',
      location: params.location ?? 'office',
      deviceTrust: params.deviceTrust ?? params.device ?? 'trusted',
      resourceSensitivity: params.resourceSensitivity ?? 'low',
      timeOfDay: params.timeOfDay ?? 'normal',
      hour: params.hour ?? (params.timeOfDay === 'night' ? 2 : undefined),
    };

    const response = await fetch(ML_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mlPayload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      anomalyScore = Number(data.anomalyScore) || 0;
    }
  } catch (_) {
    // Graceful fallback if ML service is unreachable
    anomalyScore = 0;
  }

  const anomalyPoints = Math.min(30, Math.round(anomalyScore * 30));
  const finalScore = Math.min(100, baseResult.score + anomalyPoints);
  const finalBand = scoreToBand(finalScore);

  const finalFactors = [
    ...baseResult.factors,
    {
      name: 'behaviorAnomaly',
      value: String(anomalyScore.toFixed(2)),
      points: anomalyPoints,
    },
  ];

  return {
    score: finalScore,
    band: finalBand,
    factors: finalFactors,
  };
}

export default calculateRisk;
