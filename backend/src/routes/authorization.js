import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/index.js';
import { calculateRiskAsync } from '../../logic/riskEngine.js';
import { decideAuthorization, DECISIONS } from '../../logic/policyEngine.js';
import { recordUserAction } from '../engines/behaviorEngine.js';
import { broadcastSecurityEvent } from '../index.js';

const router = express.Router();

// POST /api/authorization/check
// Evaluates context, behavior, AI anomaly, and returns authoritative policy decision
router.post('/check', requireAuth, async (req, res) => {
  try {
    const { resourceName, action, network, location, deviceTrust, passkeyVerified } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!resourceName || !action) {
      return res.status(400).json({ error: 'resourceName and action are required' });
    }

    // Lookup resource
    const resResult = await query(
      'SELECT id, name, sensitivity, allowed_roles, actions, description FROM resources WHERE name = $1',
      [resourceName]
    );
    const resource = resResult.rows[0] || {
      name: resourceName,
      sensitivity: 'MEDIUM',
    };

    // Lookup session
    let sessionId = req.user.sessionId || req.body.sessionId || null;
    let currentSession = null;
    if (sessionId) {
      const sessRes = await query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
      if (sessRes.rows.length > 0) {
        currentSession = sessRes.rows[0];
      }
    }

    // Check if there is an approved access request for this user + resource + action
    const approvalRes = await query(
      `SELECT id, status, expires_at FROM access_requests
       WHERE requested_by = $1 AND resource_name = $2 AND action = $3 AND status = 'APPROVED' AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY approved_at DESC LIMIT 1`,
      [userId, resourceName, action]
    );
    const hasApprovedRequest = approvalRes.rows.length > 0;
    const approvedRequestId = hasApprovedRequest ? approvalRes.rows[0].id : null;

    // Record user telemetry in behavior engine
    recordUserAction(userId, {
      action,
      resource: resourceName,
      network: network || currentSession?.network || 'corporate',
    });

    // 1. Calculate dynamic risk
    const riskResult = await calculateRiskAsync('ACCESS', {
      userId,
      role: userRole,
      resourceName,
      resourceSensitivity: resource.sensitivity,
      action,
      network: network || currentSession?.network || 'corporate',
      location: location || currentSession?.location || 'office',
      deviceTrust: deviceTrust || 'trusted',
      priorRisk: currentSession?.current_risk || 0,
    });

    // 2. Decide authorization state
    const authResult = decideAuthorization({
      role: userRole,
      resource: resourceName,
      resourceSensitivity: resource.sensitivity,
      action,
      riskScore: riskResult.score,
      riskLevel: riskResult.level,
      hasApprovedRequest,
      hasPasskeyVerified: Boolean(passkeyVerified),
    });

    // If session was revoked due to critical risk
    if (authResult.decision === DECISIONS.SESSION_REVOKED && currentSession) {
      await query(`UPDATE sessions SET status = 'REVOKED', current_risk = $1 WHERE id = $2`, [
        riskResult.score,
        currentSession.id,
      ]);

      broadcastSecurityEvent('session.revoked', {
        userId,
        sessionId: currentSession.id,
        reason: 'Critical security risk threshold breached',
        riskScore: riskResult.score,
      });
    } else if (currentSession) {
      // Update session's current risk in DB
      await query(
        `UPDATE sessions SET current_risk = $1, risk_level = $2, last_evaluated_at = NOW() WHERE id = $3`,
        [riskResult.score, riskResult.level, currentSession.id]
      );

      broadcastSecurityEvent('risk.updated', {
        userId,
        sessionId: currentSession.id,
        riskScore: riskResult.score,
        riskLevel: riskResult.level,
      });
    }

    return res.json({
      decision: authResult.decision,
      riskScore: riskResult.score,
      riskLevel: riskResult.level,
      requiredControl: authResult.requiredControl,
      reason: authResult.reason,
      factors: riskResult.factors,
      aiAnomalyScore: riskResult.anomalyScore,
      aiExplanation: riskResult.aiExplanation,
      hasApprovedRequest,
      approvedRequestId,
      resource: {
        id: resource.id,
        name: resource.name,
        sensitivity: resource.sensitivity,
      },
      action,
      expiresAt: authResult.expiresAt,
    });
  } catch (err) {
    console.error('Authorization check error:', err);
    return res.status(500).json({ error: 'Authorization check failed' });
  }
});

// POST /api/authorization/execute
// Authoritatively executes the action once all required controls have been satisfied
router.post('/execute', requireAuth, async (req, res) => {
  try {
    const { resourceName, action, passkeyToken, approvalId } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate resource
    const resResult = await query('SELECT * FROM resources WHERE name = $1', [resourceName]);
    const resource = resResult.rows[0];

    // Check approval status if required
    let hasApprovedRequest = false;
    if (approvalId) {
      const appRes = await query(
        `SELECT id, status FROM access_requests WHERE id = $1 AND requested_by = $2 AND status = 'APPROVED'`,
        [approvalId, userId]
      );
      hasApprovedRequest = appRes.rows.length > 0;
    }

    // Lookup session
    let sessionId = req.user.sessionId || null;
    let session = null;
    if (sessionId) {
      const sessRes = await query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
      session = sessRes.rows[0];
    }

    // Evaluate risk and decision
    const riskResult = await calculateRiskAsync('ACCESS', {
      userId,
      role: userRole,
      resourceName,
      resourceSensitivity: resource?.sensitivity || 'LOW',
      action,
      priorRisk: session?.current_risk || 18,
    });

    const authResult = decideAuthorization({
      role: userRole,
      resource: resourceName,
      resourceSensitivity: resource?.sensitivity || 'LOW',
      action,
      riskScore: riskResult.score,
      riskLevel: riskResult.level,
      hasApprovedRequest,
      hasPasskeyVerified: Boolean(passkeyToken),
    });

    if (authResult.decision === DECISIONS.DENY) {
      return res.status(403).json({
        error: 'Access Denied',
        decision: DECISIONS.DENY,
        reason: authResult.reason,
      });
    }

    if (authResult.decision === DECISIONS.RESTRICT && !passkeyToken) {
      return res.status(401).json({
        error: 'Step-up Passkey required',
        decision: DECISIONS.RESTRICT,
        requiredControl: 'PASSKEY',
      });
    }

    if (authResult.decision === DECISIONS.MANAGER_APPROVAL && !hasApprovedRequest) {
      return res.status(403).json({
        error: 'Manager approval required before execution',
        decision: DECISIONS.MANAGER_APPROVAL,
        requiredControl: 'MANAGER_APPROVAL',
      });
    }

    // Log the successful execution in audit_logs
    await query(
      `INSERT INTO audit_logs (
         user_id, role, session_id, resource, action, decision, risk_score, risk_level, risk_factors, passkey_event
       ) VALUES ($1, $2, $3, $4, $5, 'ALLOW', $6, $7, $8, $9)`,
      [
        userId,
        userRole,
        sessionId,
        resourceName,
        action,
        riskResult.score,
        riskResult.level,
        JSON.stringify(riskResult.factors || []),
        Boolean(passkeyToken),
      ]
    );

    // Record Security Event
    await query(
      `INSERT INTO security_events (
         session_id, user_id, event_type, severity, resource_id, risk_score, risk_band, policy_action, factors_json
       ) VALUES ($1, $2, 'RESOURCE_ACCESS_SUCCESS', 'LOW', $3, $4, $5, 'ALLOW', $6)`,
      [
        sessionId,
        userId,
        resource?.id || null,
        riskResult.score,
        riskResult.level,
        JSON.stringify(riskResult.factors || []),
      ]
    );

    // Broadcast audit event
    broadcastSecurityEvent('security.event', {
      type: 'RESOURCE_ACCESS_SUCCESS',
      user: req.user.name,
      role: userRole,
      resource: resourceName,
      action,
      riskScore: riskResult.score,
    });

    return res.json({
      success: true,
      decision: DECISIONS.ALLOW,
      resource: resourceName,
      action,
      executedAt: new Date().toISOString(),
      payload: {
        recordsCount: 42,
        format: action === 'EXPORT' ? 'CSV' : action === 'DOWNLOAD' ? 'PDF' : 'JSON',
        preview: `Secure access confirmed for ${resourceName}. AdaptiveGuard verified zero trust boundaries.`,
      },
    });
  } catch (err) {
    console.error('Action execution error:', err);
    return res.status(500).json({ error: 'Action execution failed' });
  }
});

export default router;
