/**
 * AdaptiveGuard Behavior Engine
 * Tracks dynamic user behavioral telemetry across requests, compares against
 * normal baselines, and calculates behavioral risk & anomaly contributions.
 */

// In-memory behavioral profile store per user
const userBehaviorProfiles = new Map();

/**
 * Initializes or retrieves the behavioral profile for a user
 * @param {string} userId
 * @returns {Object}
 */
export function getOrCreateProfile(userId = 'default') {
  if (!userBehaviorProfiles.has(userId)) {
    userBehaviorProfiles.set(userId, {
      userId,
      baseline: {
        requestFrequency: 4.5, // avg req / min
        failedRequests: 0,
        downloadFrequency: 0.2,
        exportFrequency: 0.05,
        restrictedWebsiteAttempts: 0,
        knownDevices: new Set(['Alice Laptop', 'Bob Laptop', 'David Workstation', 'Corporate-PC']),
        knownNetworks: new Set(['corporate', 'office']),
        knownLocations: new Set(['known', 'office', 'HQ']),
      },
      current: {
        requestFrequency: 4.5,
        failedRequests: 0,
        downloadFrequency: 0,
        exportFrequency: 0,
        restrictedWebsiteAttempts: 0,
        sensitiveActionsCount: 0,
        lastRequestTime: Date.now(),
        recentActions: [],
      },
      lastUpdated: new Date().toISOString(),
    });
  }
  return userBehaviorProfiles.get(userId);
}

/**
 * Updates telemetry and computes behavioral metrics
 * @param {string} userId
 * @param {Object} eventTelemetry
 */
export function recordUserAction(userId, eventTelemetry = {}) {
  const profile = getOrCreateProfile(userId);
  const now = Date.now();
  const timeDelta = Math.max(1, (now - profile.current.lastRequestTime) / 1000); // seconds
  profile.current.lastRequestTime = now;

  // Track actions
  if (eventTelemetry.action) {
    profile.current.recentActions.push({
      action: eventTelemetry.action,
      resource: eventTelemetry.resource,
      timestamp: now,
    });
    if (profile.current.recentActions.length > 30) {
      profile.current.recentActions.shift();
    }
  }

  // Handle telemetry updates
  if (eventTelemetry.requestSpike) {
    profile.current.requestFrequency = Math.min(150, profile.current.requestFrequency + 45);
  } else {
    // Gradual decay towards baseline
    profile.current.requestFrequency = Math.max(
      profile.baseline.requestFrequency,
      profile.current.requestFrequency * 0.95
    );
  }

  if (eventTelemetry.failedRequest) {
    profile.current.failedRequests += 1;
  }

  if (eventTelemetry.restrictedWebsite) {
    profile.current.restrictedWebsiteAttempts += 1;
  }

  if (eventTelemetry.action === 'DOWNLOAD') {
    profile.current.downloadFrequency += 1;
  }

  if (eventTelemetry.action === 'EXPORT') {
    profile.current.exportFrequency += 1;
  }

  if (['DELETE', 'REVOKE', 'EXPORT', 'CONFIGURE'].includes(eventTelemetry.action)) {
    profile.current.sensitiveActionsCount += 1;
  }

  profile.lastUpdated = new Date().toISOString();
  return profile;
}

/**
 * Resets user behavioral telemetry back to baseline (used in simulation reset)
 * @param {string} userId
 */
export function resetUserProfile(userId) {
  if (userId) {
    userBehaviorProfiles.delete(userId);
  } else {
    userBehaviorProfiles.clear();
  }
}

/**
 * Evaluates current user behavior against baseline and returns score & factors
 * @param {string} userId
 * @param {Object} currentContext
 * @returns {{ behaviorScore: number, factors: Array<{ name: string, value: string, points: number }>, profile: Object }}
 */
export function evaluateBehavior(userId, currentContext = {}) {
  const profile = getOrCreateProfile(userId);
  let behaviorPoints = 0;
  const factors = [];

  // 1. Request Frequency Spike
  const reqFreq = currentContext.request_frequency ?? profile.current.requestFrequency;
  if (reqFreq >= 40) {
    behaviorPoints += 25;
    factors.push({ name: 'Request Frequency Spike', value: `${Math.round(reqFreq)} req/min (Abnormal)`, points: 25 });
  } else if (reqFreq >= 20) {
    behaviorPoints += 12;
    factors.push({ name: 'Elevated Request Rate', value: `${Math.round(reqFreq)} req/min`, points: 12 });
  }

  // 2. Failed Requests
  const failedCount = currentContext.failed_request_count ?? profile.current.failedRequests;
  if (failedCount >= 5) {
    behaviorPoints += 20;
    factors.push({ name: 'Multiple Failed Requests', value: `${failedCount} failures`, points: 20 });
  } else if (failedCount >= 2) {
    behaviorPoints += 10;
    factors.push({ name: 'Failed Authorization Attempts', value: `${failedCount} failures`, points: 10 });
  }

  // 3. Restricted Website Probing
  const webAttempts = currentContext.restricted_website_attempts ?? profile.current.restrictedWebsiteAttempts;
  if (webAttempts >= 3) {
    behaviorPoints += 25;
    factors.push({ name: 'Repeated Blocked Website Probing', value: `${webAttempts} attempts`, points: 25 });
  } else if (webAttempts >= 1) {
    behaviorPoints += 15;
    factors.push({ name: 'Restricted Website Attempt', value: `${webAttempts} attempt`, points: 15 });
  }

  // 4. Bulk Export / Download Anomaly
  const expFreq = currentContext.export_frequency ?? profile.current.exportFrequency;
  if (expFreq >= 2) {
    behaviorPoints += 20;
    factors.push({ name: 'Rapid Export Operations', value: `${expFreq} bulk exports`, points: 20 });
  }

  const behaviorScore = Math.min(60, behaviorPoints);

  return {
    behaviorScore,
    factors,
    profile: {
      requestFrequency: Math.round(reqFreq),
      failedRequests: failedCount,
      restrictedWebsiteAttempts: webAttempts,
      exportFrequency: expFreq,
      sensitiveActionsCount: profile.current.sensitiveActionsCount,
    },
  };
}

export default {
  getOrCreateProfile,
  recordUserAction,
  resetUserProfile,
  evaluateBehavior,
};
