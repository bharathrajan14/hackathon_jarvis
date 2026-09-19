import { evaluateContext } from '../src/engines/contextEngine.js';
import { evaluateBehavior, getOrCreateProfile } from '../src/engines/behaviorEngine.js';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000/anomaly-score';

/**
 * Maps numeric risk score (0-100) to standardized Risk Level
 * @param {number} score
 * @returns {'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'}
 */
export function scoreToBand(score) {
  const num = Math.round(score);
  if (num >= 81) return 'CRITICAL';
  if (num >= 61) return 'HIGH';
  if (num >= 31) return 'MEDIUM';
  return 'LOW';
}

/**
 * Synchronous core risk calculation (pure deterministic fallback)
 * @param {'LOGIN'|'ACCESS'|string} evaluationType
 * @param {Object} params
 * @returns {{ score: number, level: string, band: string, factors: Array, contextScore: number, behaviorScore: number }}
 */
export function calculateRisk(evaluationType = 'ACCESS', params = {}) {
  // Normalize params if passed as single object
  let options = params;
  if (typeof evaluationType === 'object' && evaluationType !== null) {
    options = evaluationType;
  }

  const userId = options.userId || options.user_id || 'default';
  const contextRes = evaluateContext(options);
  const behaviorRes = evaluateBehavior(userId, options);

  let rawScore = 0;
  const factors = [];

  // 1. Context Factors (device, network, location, time)
  contextRes.factors.forEach((f) => {
    if (f.points > 0) {
      factors.push(f);
      rawScore += f.points;
    }
  });

  // 2. Action & Resource Sensitivity (for ACCESS evaluation)
  if (evaluationType !== 'LOGIN') {
    if (contextRes.actionPoints > 0) {
      rawScore += contextRes.actionPoints;
    }
  }

  // 3. Behavioral Factors
  behaviorRes.factors.forEach((f) => {
    factors.push(f);
    rawScore += f.points;
  });

  // 4. Session Prior Risk influence (momentum)
  const priorRisk = Number(options.priorRisk || options.currentRisk || 0);
  if (priorRisk > 25) {
    const momentumPts = Math.min(20, Math.round((priorRisk - 20) * 0.35));
    if (momentumPts > 0) {
      factors.push({
        name: 'Prior Session Risk',
        value: `${priorRisk}/100`,
        points: momentumPts,
      });
      rawScore += momentumPts;
    }
  }

  // Baseline safe floor for clean enterprise session
  if (rawScore < 15 && evaluationType !== 'LOGIN') {
    rawScore = 18; // Default normal operational risk (Alice baseline ~18-24)
  }

  const finalScore = Math.min(100, Math.max(0, Math.round(rawScore)));
  const level = scoreToBand(finalScore);

  return {
    score: finalScore,
    level,
    band: level, // alias for backwards compatibility
    factors,
    contextScore: contextRes.contextScore,
    behaviorScore: behaviorRes.behaviorScore,
  };
}

/**
 * Async Risk Engine with live AI Anomaly Model integration
 * @param {'LOGIN'|'ACCESS'|string} evaluationType
 * @param {Object} params
 * @returns {Promise<{ score: number, level: string, band: string, factors: Array, anomalyScore: number, aiExplanation: string }>}
 */
export async function calculateRiskAsync(evaluationType = 'ACCESS', params = {}) {
  let options = params;
  if (typeof evaluationType === 'object' && evaluationType !== null) {
    options = evaluationType;
  }

  const baseResult = calculateRisk(evaluationType, options);
  let anomalyScore = 0;
  let aiLevel = 'NORMAL';
  let aiExplanation = 'Consistent with baseline enterprise behavior';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const mlPayload = {
      userId: options.userId || options.user_id || 'default',
      network: options.network || 'corporate',
      location: options.location || 'office',
      deviceTrust: options.deviceTrust || options.device || 'trusted',
      resourceSensitivity: options.resourceSensitivity || options.sensitivity || 'LOW',
      action: options.action || (evaluationType === 'LOGIN' ? 'VIEW' : 'VIEW'),
      timeOfDay: options.timeOfDay || 'normal',
      hour: options.hour,
      request_frequency: options.request_frequency ?? (options.requestSpike ? 65 : undefined),
      failed_request_count: options.failed_request_count,
      download_frequency: options.download_frequency,
      export_frequency: options.export_frequency,
      restricted_website_attempts: options.restricted_website_attempts,
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
      aiLevel = data.level || 'NORMAL';
      aiExplanation = data.explanation || aiExplanation;
    }
  } catch (_) {
    // Fallback heuristic if ML service unavailable
    if (options.requestSpike || options.request_frequency >= 40) {
      anomalyScore = 75;
      aiLevel = 'CRITICAL';
      aiExplanation = 'Simulated behavioral anomaly: request spike detected';
    } else if (options.restricted_website_attempts >= 1) {
      anomalyScore = 48;
      aiLevel = 'ELEVATED';
      aiExplanation = 'Simulated behavioral anomaly: restricted destination probe';
    }
  }

  // Weight AI Anomaly into final risk score (0 to 30 points contribution)
  const aiPoints = Math.round((anomalyScore / 100) * 28);
  const finalScore = Math.min(100, baseResult.score + aiPoints);
  const finalLevel = scoreToBand(finalScore);

  const finalFactors = [...baseResult.factors];
  if (anomalyScore > 20) {
    finalFactors.push({
      name: 'AI Anomaly Detection',
      value: `${anomalyScore}/100 (${aiLevel})`,
      points: aiPoints,
    });
  }

  return {
    score: finalScore,
    riskScore: finalScore,
    level: finalLevel,
    riskLevel: finalLevel,
    band: finalLevel,
    factors: finalFactors,
    anomalyScore,
    aiLevel,
    aiExplanation,
  };
}

export default calculateRisk;
