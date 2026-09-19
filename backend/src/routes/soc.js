import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/index.js';
import { broadcastSecurityEvent } from '../index.js';

const router = express.Router();

// Middleware: restrict to admin, manager, hr, or soc
function requireSocAdminOrManager(req, res, next) {
  const role = String(req.user?.role || '').toUpperCase();
  const allowed = ['IT_ADMINISTRATOR', 'MANAGER', 'ADMIN', 'HR', 'SOC'];
  if (!allowed.includes(role)) {
    return res.status(403).json({ error: 'Forbidden: Manager or IT Administrator role required' });
  }
  next();
}

// GET /api/security/monitor or /soc/monitor
router.get('/monitor', requireAuth, async (req, res) => {
  try {
    const activeSessionsRes = await query(`SELECT count(*) FROM sessions WHERE status = 'ACTIVE'`);
    const criticalEventsRes = await query(`SELECT count(*) FROM security_events WHERE severity = 'CRITICAL'`);
    const avgRiskRes = await query(`SELECT avg(current_risk) FROM sessions WHERE status = 'ACTIVE'`);

    // Top recent security events
    const feedRes = await query(`
      SELECT
        se.id,
        se.session_id as "sessionId",
        se.user_id as "userId",
        u.name as "userName",
        u.role as "userRole",
        se.event_type as "eventType",
        se.severity,
        se.risk_score as "riskScore",
        se.risk_band as "riskBand",
        se.policy_action as "policyAction",
        se.factors_json as "factors",
        se.evidence_json as "evidence",
        se.created_at as "createdAt"
      FROM security_events se
      JOIN users u ON se.user_id = u.id
      ORDER BY se.created_at DESC
      LIMIT 25
    `);

    return res.json({
      systemRisk: Math.round(Number(avgRiskRes.rows[0]?.avg || 24)),
      systemRiskLevel: Number(avgRiskRes.rows[0]?.avg || 24) >= 61 ? 'HIGH' : Number(avgRiskRes.rows[0]?.avg || 24) >= 31 ? 'MEDIUM' : 'LOW',
      activeAlerts: parseInt(criticalEventsRes.rows[0]?.count || 2),
      activeSessions: parseInt(activeSessionsRes.rows[0]?.count || 4),
      liveStream: feedRes.rows,
    });
  } catch (err) {
    console.error('SOC monitor error:', err);
    return res.status(500).json({ error: 'Failed to fetch SOC monitor' });
  }
});

// GET /api/security/risk-history or /soc/risk-history
router.get('/risk-history', requireAuth, async (req, res) => {
  try {
    const userId = req.query.userId || req.user.id;
    const historyRes = await query(
      `SELECT
         se.id,
         se.event_type as "event",
         se.risk_score as "risk",
         se.risk_band as "level",
         se.policy_action as "decision",
         to_char(se.created_at, 'HH24:MI:SS') as "time",
         se.created_at as "timestamp"
       FROM security_events se
       WHERE se.user_id = $1
       ORDER BY se.created_at ASC
       LIMIT 30`,
      [userId]
    );

    // Fallback baseline curve if user has few events
    let dataPoints = historyRes.rows;
    if (dataPoints.length === 0) {
      dataPoints = [
        { time: '09:40', event: 'Login (Passkey)', risk: 18, level: 'LOW', decision: 'ALLOW' },
        { time: '09:44', event: 'View Employee Portal', risk: 20, level: 'LOW', decision: 'ALLOW' },
        { time: '09:48', event: 'Financial Report View', risk: 47, level: 'MEDIUM', decision: 'RESTRICT' },
        { time: '09:51', event: 'Financial DB Export', risk: 68, level: 'HIGH', decision: 'MANAGER_APPROVAL' },
      ];
    }

    return res.json(dataPoints);
  } catch (err) {
    console.error('Risk history error:', err);
    return res.status(500).json({ error: 'Failed to fetch risk history' });
  }
});

// GET /api/security/events or /soc/events
router.get('/events', requireAuth, async (req, res) => {
  try {
    const { userId, eventType } = req.query;
    let sql = `
      SELECT
        se.id,
        se.session_id AS "sessionId",
        se.user_id AS "userId",
        u.name AS "userName",
        u.email AS "userEmail",
        u.role AS "userRole",
        se.resource_id AS "resourceId",
        COALESCE(r.name, 'Platform') AS "resourceName",
        se.event_type AS "eventType",
        se.severity,
        se.risk_score AS "riskScore",
        se.risk_band AS "riskBand",
        se.policy_action AS "action",
        se.factors_json AS "factors",
        se.evidence_json AS "evidence",
        se.created_at AS "createdAt"
      FROM security_events se
      JOIN users u ON se.user_id = u.id
      LEFT JOIN resources r ON se.resource_id = r.id
      WHERE 1=1
    `;
    const params = [];
    if (userId) {
      params.push(userId);
      sql += ` AND se.user_id = $${params.length}`;
    }
    if (eventType) {
      params.push(eventType);
      sql += ` AND se.event_type = $${params.length}`;
    }
    sql += ` ORDER BY se.created_at DESC LIMIT 50`;

    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('SOC events error:', err);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /api/security/sessions/:id or /soc/sessions/:id
router.get('/sessions/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const sessionRes = await query(
      `SELECT
         s.id,
         s.user_id AS "userId",
         s.status,
         s.current_risk AS "currentRisk",
         s.risk_level AS "riskLevel",
         s.network,
         s.location,
         s.started_at AS "startedAt",
         s.last_evaluated_at AS "lastEvaluatedAt",
         u.name AS "userName",
         u.email AS "userEmail",
         u.role AS "userRole",
         u.department
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [id]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionRes.rows[0];

    const eventsRes = await query(
      `SELECT
         se.id,
         se.event_type AS "eventType",
         COALESCE(r.name, 'Platform') AS "resourceName",
         se.risk_score AS "riskScore",
         se.risk_band AS "riskBand",
         se.policy_action AS "action",
         se.factors_json AS "factors",
         se.evidence_json AS "evidence",
         se.created_at AS "createdAt"
       FROM security_events se
       LEFT JOIN resources r ON se.resource_id = r.id
       WHERE se.session_id = $1
       ORDER BY se.created_at ASC`,
      [id]
    );

    return res.json({
      session,
      events: eventsRes.rows,
    });
  } catch (err) {
    console.error('SOC session error:', err);
    return res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// POST /api/security/sessions/:id/revoke
router.post('/sessions/:id/revoke', requireAuth, requireSocAdminOrManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await query(
      `UPDATE sessions
       SET status = 'REVOKED',
           current_risk = 95,
           risk_level = 'CRITICAL',
           last_evaluated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const revokedSession = result.rows[0];

    // Log security event
    await query(
      `INSERT INTO security_events (
         session_id, user_id, event_type, severity, risk_score, risk_band, policy_action, evidence_json
       ) VALUES ($1, $2, 'SESSION_MANUALLY_REVOKED', 'CRITICAL', 95, 'CRITICAL', 'SESSION_REVOKED', $3)`,
      [
        id,
        revokedSession.user_id,
        JSON.stringify({
          revokedBy: req.user.name,
          role: req.user.role,
          reason: reason || 'Revoked via Security Monitor',
        }),
      ]
    );

    // Broadcast revocation immediately
    broadcastSecurityEvent('session.revoked', {
      sessionId: id,
      userId: revokedSession.user_id,
      riskScore: 95,
      reason: reason || 'Session revoked by administrator',
      revokedBy: req.user.name,
    });

    return res.json({
      success: true,
      message: 'Session successfully revoked',
      session: revokedSession,
    });
  } catch (err) {
    console.error('Session revoke error:', err);
    return res.status(500).json({ error: 'Failed to revoke session' });
  }
});

export default router;
