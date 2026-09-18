import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/index.js';

const router = express.Router();

// GET /audit-logs (protected, any authenticated user can view for MVP)
router.get('/', requireAuth, async (req, res) => {
  try {
    const sql = `
      SELECT
        u.name AS "userName",
        r.name AS "resourceName",
        ar.risk_score AS "riskScore",
        ar.risk_band AS "riskBand",
        ar.policy_action AS "action",
        ar.created_at AS "createdAt"
      FROM access_requests ar
      JOIN users u ON ar.user_id = u.id
      JOIN resources r ON ar.resource_id = r.id
      ORDER BY ar.created_at DESC
    `;

    const result = await query(sql);
    return res.json(result.rows);
  } catch (err) {
    console.error('Audit logs error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
