import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/index.js';

const router = express.Router();

// GET /audit-logs (protected, returns security_events combined with historical access_requests)
router.get('/', requireAuth, async (req, res) => {
  try {
    const sql = `
      SELECT
        u.name AS "userName",
        COALESCE(r.name, 'System') AS "resourceName",
        se.risk_score AS "riskScore",
        se.risk_band AS "riskBand",
        se.policy_action AS "action",
        se.created_at AS "createdAt"
      FROM security_events se
      JOIN users u ON se.user_id = u.id
      LEFT JOIN resources r ON se.resource_id = r.id

      UNION ALL

      SELECT
        u.name AS "userName",
        COALESCE(r.name, 'System') AS "resourceName",
        ar.risk_score AS "riskScore",
        ar.risk_band AS "riskBand",
        ar.policy_action AS "action",
        ar.created_at AS "createdAt"
      FROM access_requests ar
      JOIN users u ON ar.user_id = u.id
      LEFT JOIN resources r ON ar.resource_id = r.id

      ORDER BY "createdAt" DESC
    `;

    const result = await query(sql);
    return res.json(result.rows);
  } catch (err) {
    console.error('Audit logs error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
