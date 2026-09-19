import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/index.js';

const router = express.Router();

// Middleware: restrict to admin, hr, or soc roles only
function requireSocAdminOrHr(req, res, next) {
  const allowed = ['admin', 'hr', 'soc'];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Forbidden: Admin, HR, or SOC role required' });
  }
  next();
}

// GET /soc/events (protected, admin/hr/soc role only)
// Query params: ?userId= & ?eventType=
router.get('/events', requireAuth, requireSocAdminOrHr, async (req, res) => {
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
        COALESCE(r.name, 'System') AS "resourceName",
        se.event_type AS "eventType",
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

    sql += ` ORDER BY se.created_at DESC`;

    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching SOC events:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /soc/sessions/:id (protected, admin/hr/soc role only)
router.get('/sessions/:id', requireAuth, requireSocAdminOrHr, async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch session row joined with user info
    const sessionRes = await query(
      `SELECT
         s.id,
         s.user_id AS "userId",
         s.status,
         s.current_risk AS "currentRisk",
         s.started_at AS "startedAt",
         s.last_evaluated_at AS "lastEvaluatedAt",
         u.name AS "userName",
         u.email AS "userEmail",
         u.role AS "userRole"
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [id]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionRes.rows[0];

    // Fetch full ordered list of security_events for this session (timeline order)
    const eventsRes = await query(
      `SELECT
         se.id,
         se.session_id AS "sessionId",
         se.user_id AS "userId",
         se.event_type AS "eventType",
         se.resource_id AS "resourceId",
         COALESCE(r.name, 'System') AS "resourceName",
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
    console.error('Error fetching SOC session timeline:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
