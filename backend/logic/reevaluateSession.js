import { query } from '../src/db/index.js';
import { calculateRiskAsync } from './riskEngine.js';
import { decideAction } from './policyEngine.js';

/**
 * Re-evaluates a session's risk and status upon an event, updates the session,
 * determines the policy action, and records a security_events log.
 *
 * @param {string|null} sessionId
 * @param {string} eventType - e.g. 'ACCESS_REQUEST'
 * @param {Object} context - Access and environmental context
 * @returns {Promise<{ session: Object, securityEvent: Object, riskScore: number, riskBand: string, factors: Array, action: string }>}
 */
export async function reevaluateSession(sessionId, eventType, context = {}) {
  // 1. Load the session's current_risk
  let session = null;
  let priorRisk = 0;

  if (sessionId) {
    const sessionRes = await query(
      'SELECT id, user_id, status, current_risk FROM sessions WHERE id = $1',
      [sessionId]
    );
    if (sessionRes.rows.length > 0) {
      session = sessionRes.rows[0];
      priorRisk = session.current_risk || 0;
    }
  }

  // 2. Call calculateRiskAsync('ACCESS', { ...context, priorRisk })
  const riskResult = await calculateRiskAsync('ACCESS', {
    ...context,
    priorRisk,
  });

  // 3. Call decideAction on the new band
  const action = decideAction({
    riskBand: riskResult.band,
    role: context.role || 'employee',
    resourceSensitivity: context.resourceSensitivity,
    score: riskResult.score,
    priorRisk,
  });

  // 4. Update session.status if the action implies a status change (RESTRICT→RESTRICTED, SESSION_SUSPEND→SUSPENDED)
  let newStatus = session?.status || 'ACTIVE';
  if (action === 'RESTRICT') {
    newStatus = 'RESTRICTED';
  } else if (action === 'SESSION_SUSPEND') {
    newStatus = 'SUSPENDED';
  }

  // 5. Update session in database
  if (session) {
    const updateRes = await query(
      `UPDATE sessions
       SET current_risk = $1,
           last_evaluated_at = NOW(),
           status = $2
       WHERE id = $3
       RETURNING id, user_id, status, current_risk, started_at, last_evaluated_at`,
      [riskResult.score, newStatus, session.id]
    );
    session = updateRes.rows[0];
  }

  // 6. Write a security_events row with event_type set to whatever was passed in
  const userId = session?.user_id || context.userId;
  const resourceId = context.resourceId || null;
  const factorsJson = JSON.stringify(riskResult.factors || []);
  const evidenceJson = JSON.stringify(context.evidence || {
    network: context.network,
    location: context.location,
    deviceId: context.deviceId,
  });

  const eventRes = await query(
    `INSERT INTO security_events (
       session_id, user_id, event_type, resource_id,
       risk_score, risk_band, policy_action, factors_json, evidence_json
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      session?.id || null,
      userId,
      eventType || 'ACCESS_REQUEST',
      resourceId,
      riskResult.score,
      riskResult.band,
      action,
      factorsJson,
      evidenceJson,
    ]
  );

  return {
    session,
    securityEvent: eventRes.rows[0],
    riskScore: riskResult.score,
    riskBand: riskResult.band,
    factors: riskResult.factors,
    action,
  };
}

export default reevaluateSession;
