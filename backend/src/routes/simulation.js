import express from 'express';
import { query } from '../db/index.js';
import { calculateRiskAsync } from '../../logic/riskEngine.js';
import { decideAuthorization, DECISIONS } from '../../logic/policyEngine.js';
import { recordUserAction, resetUserProfile } from '../engines/behaviorEngine.js';
import { broadcastSecurityEvent } from '../index.js';

const router = express.Router();

// Helper to fetch Alice's active session or create one
async function getOrCreateAliceSession() {
  const aliceRes = await query(`SELECT id, name, role FROM users WHERE name = 'Alice' LIMIT 1`);
  if (aliceRes.rows.length === 0) return null;
  const alice = aliceRes.rows[0];

  let sessionRes = await query(
    `SELECT * FROM sessions WHERE user_id = $1 ORDER BY started_at DESC LIMIT 1`,
    [alice.id]
  );

  let session = sessionRes.rows[0];
  if (!session || session.status === 'REVOKED') {
    const newSess = await query(
      `INSERT INTO sessions (user_id, status, current_risk, risk_level, network, location)
       VALUES ($1, 'ACTIVE', 18, 'LOW', 'corporate', 'office')
       RETURNING *`,
      [alice.id]
    );
    session = newSess.rows[0];
  }
  return { user: alice, session };
}

// GET /api/simulation/state
router.get('/state', async (req, res) => {
  try {
    const data = await getOrCreateAliceSession();
    if (!data) return res.status(404).json({ error: 'Alice demo account not found' });

    // Fetch recent security events for Alice
    const eventsRes = await query(
      `SELECT * FROM security_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 15`,
      [data.user.id]
    );

    return res.json({
      user: data.user,
      session: data.session,
      currentRisk: data.session.current_risk,
      riskLevel: data.session.risk_level,
      status: data.session.status,
      network: data.session.network,
      location: data.session.location,
      events: eventsRes.rows,
    });
  } catch (err) {
    console.error('Simulation state error:', err);
    return res.status(500).json({ error: 'Failed to fetch simulation state' });
  }
});

// POST /api/simulation/event
// Triggers any of the 11 granular simulation buttons
router.post('/event', async (req, res) => {
  try {
    const { triggerType } = req.body;
    const data = await getOrCreateAliceSession();
    if (!data) return res.status(404).json({ error: 'Alice demo account not found' });

    const { user, session } = data;
    let newRisk = session.current_risk;
    let eventName = 'SIMULATION_EVENT';
    let severity = 'LOW';
    let factors = [];
    let network = session.network;
    let location = session.location;
    let sessionStatus = session.status;
    let action = 'VIEW';
    let resourceName = 'System';
    let decision = 'ALLOW';

    switch (triggerType) {
      case 'UNKNOWN_DEVICE':
        newRisk = Math.min(100, Math.max(34, session.current_risk + 20));
        eventName = 'UNKNOWN_DEVICE_DETECTED';
        severity = 'MEDIUM';
        factors.push({ name: 'Device Trust', value: 'Unregistered Hardware (Unknown Fingerprint)', points: 20 });
        break;

      case 'UNUSUAL_LOCATION':
        location = 'far';
        newRisk = Math.min(100, Math.max(42, session.current_risk + 20));
        eventName = 'GEO_VELOCITY_ANOMALY';
        severity = 'MEDIUM';
        factors.push({ name: 'Geographic Location', value: 'Unusual IP Country / ASN Mismatch', points: 20 });
        break;

      case 'SUSPICIOUS_NETWORK':
        network = 'public';
        newRisk = Math.min(100, Math.max(45, session.current_risk + 18));
        eventName = 'UNTRUSTED_NETWORK_JOIN';
        severity = 'MEDIUM';
        factors.push({ name: 'Network Environment', value: 'Public / Free Wi-Fi without VPN', points: 18 });
        break;

      case 'RESTRICTED_WEBSITE':
        recordUserAction(user.id, { restrictedWebsite: true });
        newRisk = Math.min(100, Math.max(52, session.current_risk + 16));
        eventName = 'RESTRICTED_WEBSITE_PROBE';
        severity = 'MEDIUM';
        resourceName = 'restricted-demo.local';
        decision = 'RESTRICT';
        factors.push({ name: 'Browsing Policy Violation', value: 'Probe on restricted-demo.local', points: 16 });
        break;

      case 'FAILED_LOGIN':
        newRisk = Math.min(100, Math.max(48, session.current_risk + 15));
        eventName = 'AUTH_FAILURE_SPIKE';
        severity = 'MEDIUM';
        factors.push({ name: 'Authentication Telemetry', value: 'Invalid credential retry threshold', points: 15 });
        break;

      case 'FAILED_AUTHORIZATION':
        newRisk = Math.min(100, Math.max(58, session.current_risk + 18));
        eventName = 'POLICY_AUTHORIZATION_DENIED';
        severity = 'HIGH';
        factors.push({ name: 'Policy Breach', value: 'Role violation access attempted', points: 18 });
        break;

      case 'REQUEST_SPIKE':
        recordUserAction(user.id, { requestSpike: true });
        newRisk = Math.min(100, Math.max(68, session.current_risk + 25));
        eventName = 'AI_BEHAVIOR_ANOMALY';
        severity = 'HIGH';
        factors.push({ name: 'AI Isolation Forest', value: 'Request frequency spike (78 req/min)', points: 25 });
        break;

      case 'SENSITIVE_DOWNLOAD':
        newRisk = Math.min(100, Math.max(62, session.current_risk + 20));
        eventName = 'SENSITIVE_DOWNLOAD_INITIATED';
        severity = 'HIGH';
        resourceName = 'Financial Reports';
        action = 'DOWNLOAD';
        decision = 'MANAGER_APPROVAL';
        factors.push({ name: 'Action Sensitivity', value: 'High Sensitivity Report Download', points: 20 });
        break;

      case 'BULK_EXPORT':
        recordUserAction(user.id, { action: 'EXPORT' });
        newRisk = Math.min(100, Math.max(76, session.current_risk + 28));
        eventName = 'BULK_EXFILTRATION_RISK';
        severity = 'HIGH';
        resourceName = 'Financial Database';
        action = 'EXPORT';
        decision = 'APPROVAL_AND_PASSKEY';
        factors.push({ name: 'Action Sensitivity', value: 'Financial Database Export (Bulk)', points: 28 });
        break;

      case 'SESSION_HIJACKING':
        newRisk = 88;
        sessionStatus = 'REVOKED';
        eventName = 'SESSION_HIJACK_DETECTED';
        severity = 'CRITICAL';
        decision = 'SESSION_REVOKED';
        factors.push({ name: 'Concurrent Token Collision', value: 'Simultaneous IP collision detected', points: 40 });
        break;

      case 'CRITICAL_ACTION':
        newRisk = 92;
        sessionStatus = 'REVOKED';
        eventName = 'CRITICAL_SECURITY_BREACH';
        severity = 'CRITICAL';
        decision = 'SESSION_REVOKED';
        factors.push({ name: 'Hostile Security Escalation', value: 'Privilege escalation on System Config', points: 45 });
        break;

      default:
        newRisk = session.current_risk + 5;
    }

    const level = newRisk >= 81 ? 'CRITICAL' : newRisk >= 61 ? 'HIGH' : newRisk >= 31 ? 'MEDIUM' : 'LOW';
    if (newRisk >= 85) {
      sessionStatus = 'REVOKED';
      decision = 'SESSION_REVOKED';
    }

    // Update session in DB
    await query(
      `UPDATE sessions SET current_risk = $1, risk_level = $2, status = $3, network = $4, location = $5, last_evaluated_at = NOW() WHERE id = $6`,
      [newRisk, level, sessionStatus, network, location, session.id]
    );

    // Insert security event
    const evtRes = await query(
      `INSERT INTO security_events (
         session_id, user_id, event_type, severity, risk_score, risk_band, risk_before, risk_after, policy_action, factors_json, evidence_json
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        session.id,
        user.id,
        eventName,
        severity,
        newRisk,
        level,
        session.current_risk,
        newRisk,
        decision,
        JSON.stringify(factors),
        JSON.stringify({ triggerType, network, location }),
      ]
    );

    // Write audit log
    await query(
      `INSERT INTO audit_logs (
         user_id, role, session_id, resource, action, decision, risk_score, risk_level, risk_factors, context
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        user.id,
        user.role,
        session.id,
        resourceName,
        action,
        decision,
        newRisk,
        level,
        JSON.stringify(factors),
        JSON.stringify({ triggerType, network, location }),
      ]
    );

    // Broadcast Socket.IO events
    broadcastSecurityEvent('risk.updated', {
      userId: user.id,
      sessionId: session.id,
      riskScore: newRisk,
      riskLevel: level,
      triggerType,
      previousRisk: session.current_risk,
    });

    broadcastSecurityEvent('security.event', {
      type: eventName,
      user: user.name,
      role: user.role,
      severity,
      riskScore: newRisk,
      riskLevel: level,
      decision,
      message: `[Simulation] ${eventName}: Risk escalated to ${newRisk}/100 (${level})`,
    });

    if (sessionStatus === 'REVOKED') {
      broadcastSecurityEvent('session.revoked', {
        userId: user.id,
        sessionId: session.id,
        riskScore: newRisk,
        reason: 'Automated revocation due to critical risk breach',
      });
    }

    return res.json({
      success: true,
      triggerType,
      riskBefore: session.current_risk,
      riskAfter: newRisk,
      riskLevel: level,
      sessionStatus,
      event: evtRes.rows[0],
    });
  } catch (err) {
    console.error('Simulation event error:', err);
    return res.status(500).json({ error: 'Failed to process simulation event' });
  }
});

// POST /api/simulation/full-scenario
// Automates the complete 12-Step Judge Story with real database state changes and broadcasts
router.post('/full-scenario', async (req, res) => {
  try {
    const data = await getOrCreateAliceSession();
    if (!data) return res.status(404).json({ error: 'Alice account not found' });
    const { user, session } = data;

    // Reset Alice to clean baseline first
    resetUserProfile(user.id);
    await query(`UPDATE sessions SET current_risk = 18, risk_level = 'LOW', status = 'ACTIVE', network = 'corporate', location = 'office' WHERE id = $1`, [session.id]);

    // Fetch Bob (Manager) for approval step
    const bobRes = await query(`SELECT id, name FROM users WHERE name = 'Bob' LIMIT 1`);
    const bobId = bobRes.rows[0]?.id;

    // Define the sequence of events matching Section 89 Demo Story
    const steps = [
      { step: 1, action: 'LOGIN', risk: 18, level: 'LOW', resource: 'Authentication Service', event: 'PASSKEY_AUTH_SUCCESS', decision: 'ALLOW', desc: 'Alice logs in with Passkey' },
      { step: 2, action: 'VIEW', risk: 20, level: 'LOW', resource: 'Employee Portal', event: 'RESOURCE_ACCESS_SUCCESS', decision: 'ALLOW', desc: 'Alice opens Employee Portal' },
      { step: 3, action: 'VIEW', risk: 47, level: 'MEDIUM', resource: 'Financial Reports', event: 'PASSKEY_CHALLENGE_ISSUED', decision: 'RESTRICT', desc: 'Alice requests Financial Report: Passkey Required' },
      { step: 4, action: 'EXPORT', risk: 68, level: 'HIGH', resource: 'Financial Database', event: 'APPROVAL_REQUEST_SUBMITTED', decision: 'MANAGER_APPROVAL', desc: 'Alice requests Financial Database Export: Manager Approval Mandated' },
      { step: 5, action: 'APPROVE', risk: 65, level: 'HIGH', resource: 'Financial Database', event: 'APPROVAL_GRANTED', decision: 'ALLOW', desc: 'Bob approves Alice export request in real-time' },
      { step: 6, action: 'VERIFY_PASSKEY', risk: 58, level: 'MEDIUM', resource: 'Financial Database', event: 'PASSKEY_STEP_UP_SUCCESS', decision: 'ALLOW', desc: 'Alice completes step-up Passkey verification' },
      { step: 7, action: 'PROBE_RESTRICTED', risk: 72, level: 'HIGH', resource: 'restricted-demo.local', event: 'RESTRICTED_WEBSITE_PROBE', decision: 'RESTRICT', desc: 'Alice attempts restricted external domain' },
      { step: 8, action: 'REQUEST_SPIKE', risk: 81, level: 'CRITICAL', resource: 'System API', event: 'AI_BEHAVIOR_ANOMALY', decision: 'MONITOR', desc: 'Request spike: AI Anomaly Model detects behavioral drift' },
      { step: 9, action: 'CRITICAL_ACTION', risk: 92, level: 'CRITICAL', resource: 'Admin Console', event: 'CRITICAL_SECURITY_BREACH', decision: 'SESSION_REVOKED', desc: 'Unauthorized administrative escalation: Session instantly Revoked' },
    ];

    for (const s of steps) {
      await query(
        `INSERT INTO security_events (
           session_id, user_id, event_type, severity, risk_score, risk_band, policy_action, factors_json, evidence_json
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, '[]'::jsonb, $8)`,
        [
          session.id,
          user.id,
          s.event,
          s.level,
          s.risk,
          s.level,
          s.decision,
          JSON.stringify({ step: s.step, description: s.desc, resource: s.resource }),
        ]
      );

      await query(
        `INSERT INTO audit_logs (
           user_id, role, session_id, resource, action, decision, risk_score, risk_level, context
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          user.id,
          user.role,
          session.id,
          s.resource,
          s.action,
          s.decision,
          s.risk,
          s.level,
          JSON.stringify({ step: s.step, description: s.desc }),
        ]
      );
    }

    // Final state: Session is REVOKED at 92 risk
    await query(
      `UPDATE sessions SET current_risk = 92, risk_level = 'CRITICAL', status = 'REVOKED', last_evaluated_at = NOW() WHERE id = $1`,
      [session.id]
    );

    // Create an approval request for demonstration record
    await query(
      `INSERT INTO access_requests (
         session_id, requested_by, resource_name, action, action_description, risk_score, status, manager_id, approved_at
       ) VALUES ($1, $2, 'Financial Database', 'EXPORT', 'Export quarterly transactional records for tax audit', 68, 'APPROVED', $3, NOW())`,
      [session.id, user.id, bobId]
    );

    broadcastSecurityEvent('risk.updated', {
      userId: user.id,
      sessionId: session.id,
      riskScore: 92,
      riskLevel: 'CRITICAL',
    });

    broadcastSecurityEvent('session.revoked', {
      userId: user.id,
      sessionId: session.id,
      riskScore: 92,
      reason: 'Critical behavioral escalation culminating in session revocation',
    });

    return res.json({
      success: true,
      message: 'Full Attack Scenario executed successfully across 9 operational steps',
      finalRiskScore: 92,
      finalStatus: 'REVOKED',
      totalStepsExecuted: steps.length,
    });
  } catch (err) {
    console.error('Full attack scenario error:', err);
    return res.status(500).json({ error: 'Failed to execute full attack scenario' });
  }
});

// POST /api/simulation/reset
// Resets Alice and the system to initial clean operational state
router.post('/reset', async (req, res) => {
  try {
    const data = await getOrCreateAliceSession();
    if (!data) return res.status(404).json({ error: 'Alice account not found' });
    const { user, session } = data;

    // Reset user profile in behavior engine
    resetUserProfile(user.id);

    // Reset session in DB
    await query(
      `UPDATE sessions SET
         current_risk = 18,
         risk_level = 'LOW',
         status = 'ACTIVE',
         network = 'corporate',
         location = 'office',
         last_evaluated_at = NOW()
       WHERE id = $1`,
      [session.id]
    );

    // Broadcast reset to all connected clients
    broadcastSecurityEvent('risk.updated', {
      userId: user.id,
      sessionId: session.id,
      riskScore: 18,
      riskLevel: 'LOW',
      reset: true,
    });

    broadcastSecurityEvent('session.updated', {
      userId: user.id,
      sessionId: session.id,
      status: 'ACTIVE',
      currentRisk: 18,
    });

    return res.json({
      success: true,
      message: 'Simulation state successfully reset to initial secure baseline',
      currentRisk: 18,
      riskLevel: 'LOW',
      status: 'ACTIVE',
      network: 'corporate',
      location: 'office',
    });
  } catch (err) {
    console.error('Simulation reset error:', err);
    return res.status(500).json({ error: 'Failed to reset simulation state' });
  }
});

export default router;
