import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/index.js';

const router = express.Router();

// GET /api/audit or /audit-logs
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search, user, decision, risk, resource, action } = req.query;

    let sql = `
      SELECT
        al.id,
        u.name AS "userName",
        u.email AS "userEmail",
        al.role AS "userRole",
        al.resource AS "resourceName",
        al.action,
        al.decision,
        al.risk_score AS "riskScore",
        al.risk_level AS "riskLevel",
        al.risk_factors AS "riskFactors",
        al.context,
        al.passkey_event AS "passkeyEvent",
        al.created_at AS "createdAt"
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (user) {
      params.push(`%${user.toLowerCase()}%`);
      sql += ` AND LOWER(u.name) LIKE $${params.length}`;
    }

    if (decision) {
      params.push(decision.toUpperCase());
      sql += ` AND al.decision = $${params.length}`;
    }

    if (risk) {
      params.push(risk.toUpperCase());
      sql += ` AND al.risk_level = $${params.length}`;
    }

    if (resource) {
      params.push(`%${resource.toLowerCase()}%`);
      sql += ` AND LOWER(al.resource) LIKE $${params.length}`;
    }

    if (action) {
      params.push(action.toUpperCase());
      sql += ` AND al.action = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(u.name) LIKE $${params.length} OR LOWER(al.resource) LIKE $${params.length} OR LOWER(al.action) LIKE $${params.length})`;
    }

    sql += ` ORDER BY al.created_at DESC LIMIT 100`;

    const result = await query(sql, params);

    // If audit_logs is empty yet, fallback to security_events for seamless presentation
    if (result.rows.length === 0) {
      const fallbackRes = await query(`
        SELECT
          se.id,
          u.name AS "userName",
          u.email AS "userEmail",
          u.role AS "userRole",
          COALESCE(r.name, 'Platform') AS "resourceName",
          se.policy_action AS "action",
          se.policy_action AS "decision",
          se.risk_score AS "riskScore",
          se.risk_band AS "riskLevel",
          se.factors_json AS "riskFactors",
          se.evidence_json AS "context",
          false AS "passkeyEvent",
          se.created_at AS "createdAt"
        FROM security_events se
        JOIN users u ON se.user_id = u.id
        LEFT JOIN resources r ON se.resource_id = r.id
        ORDER BY se.created_at DESC LIMIT 50
      `);
      return res.json(fallbackRes.rows);
    }

    return res.json(result.rows);
  } catch (err) {
    console.error('Audit logs error:', err);
    return res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
