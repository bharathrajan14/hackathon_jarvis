/**
 * AdaptiveGuard Context Engine
 * Collects and evaluates environmental, temporal, and action context factors.
 */

export const CONTEXT_POINTS = {
  device: {
    trusted: 0,
    unknown: 20,
    untrusted: 30,
  },
  network: {
    corporate: 0,
    office: 0,
    public: 15,
    suspicious: 25,
    unknown: 25,
  },
  location: {
    known: 0,
    office: 0,
    near: 10,
    unusual: 20,
    far: 20,
  },
  timeOfDay: {
    normal: 0,
    business_hours: 0,
    after_hours: 10,
    unusual: 15,
    night: 20,
    critical: 20,
  },
  actionSensitivity: {
    VIEW: 0,
    READ: 0,
    CREATE: 5,
    UPDATE: 10,
    DOWNLOAD: 15,
    EXPORT: 20,
    APPROVE: 10,
    REVOKE: 20,
    CONFIGURE: 25,
    DELETE: 30,
  },
  resourceSensitivity: {
    LOW: 0,
    MEDIUM: 10,
    HIGH: 20,
    CRITICAL: 25,
  },
};

/**
 * Normalizes context inputs into standardized labels and calculates context score
 * @param {Object} rawContext
 * @returns {{ contextScore: number, factors: Array<{ name: string, value: string, points: number }>, normalized: Object }}
 */
export function evaluateContext(rawContext = {}) {
  const deviceRaw = (rawContext.deviceTrust || rawContext.device || 'trusted').toLowerCase();
  const deviceTrust = deviceRaw.includes('untrusted') ? 'untrusted' : deviceRaw.includes('unknown') ? 'unknown' : 'trusted';

  const netRaw = (rawContext.network || 'corporate').toLowerCase();
  const network = netRaw.includes('suspicious') ? 'suspicious' : netRaw.includes('public') ? 'public' : netRaw.includes('unknown') ? 'unknown' : 'corporate';

  const locRaw = (rawContext.location || 'known').toLowerCase();
  const location = locRaw.includes('unusual') || locRaw.includes('far') ? 'unusual' : locRaw.includes('near') ? 'near' : 'known';

  const timeRaw = (rawContext.timeOfDay || rawContext.time || 'normal').toLowerCase();
  const timeOfDay = timeRaw.includes('night') || timeRaw.includes('critical') ? 'night' : timeRaw.includes('after') || timeRaw.includes('unusual') ? 'after_hours' : 'normal';

  const action = String(rawContext.action || 'VIEW').toUpperCase();
  const sensitivity = String(rawContext.resourceSensitivity || rawContext.sensitivity || 'LOW').toUpperCase();

  const devicePts = CONTEXT_POINTS.device[deviceTrust] ?? 20;
  const netPts = CONTEXT_POINTS.network[network] ?? 25;
  const locPts = CONTEXT_POINTS.location[location] ?? 20;
  const timePts = CONTEXT_POINTS.timeOfDay[timeOfDay] ?? 0;
  const actionPts = CONTEXT_POINTS.actionSensitivity[action] ?? 0;
  const sensPts = CONTEXT_POINTS.resourceSensitivity[sensitivity] ?? 0;

  const factors = [
    { name: 'Device Trust', value: deviceTrust, points: devicePts },
    { name: 'Network Environment', value: network, points: netPts },
    { name: 'Geographic Location', value: location, points: locPts },
    { name: 'Time of Access', value: timeOfDay, points: timePts },
  ];

  if (actionPts > 0) {
    factors.push({ name: 'Action Sensitivity', value: action, points: actionPts });
  }
  if (sensPts > 0) {
    factors.push({ name: 'Resource Sensitivity', value: sensitivity, points: sensPts });
  }

  const contextScore = Math.min(65, devicePts + netPts + locPts + timePts);

  return {
    contextScore,
    actionPoints: actionPts + sensPts,
    factors,
    normalized: {
      deviceTrust,
      network,
      location,
      timeOfDay,
      action,
      resourceSensitivity: sensitivity,
    },
  };
}

export default {
  evaluateContext,
  CONTEXT_POINTS,
};
