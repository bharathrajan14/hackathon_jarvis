import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/index.js';

const router = express.Router();

// POST /actions/sensitive (protected, any role)
router.post('/sensitive', requireAuth, async (req, res) => {
  try {
    const { actionDescription } = req.body;
    let sessionId = req.body.sessionId || req.user.sessionId || null;

    if (!actionDescription) {
      return res.status(400).json({ error: 'Missing required field: actionDescription' });
    }

    // If sessionId not passed, look up recent active session for user
    if (!sessionId) {
      const sessionRes = await query(
        `SELECT id FROM sessions WHERE user_id = $1 ORDER BY started_at DESC LIMIT 1`,
        [req.user.id]
      );
      sessionId = sessionRes.rows[0]?.id || null;
    }

    // Create approval_requests row with status PENDING
    const approvalRes = await query(
      `INSERT INTO approval_requests (session_id, requested_by, action_description, status)
       VALUES ($1, $2, $3, 'PENDING')
       RETURNING id, session_id, requested_by, action_description, status, created_at`,
      [sessionId, req.user.id, actionDescription]
    );
    const approval = approvalRes.rows[0];

    // Write a security_event of type APPROVAL_REQUEST
    await query(
      `INSERT INTO security_events (
         session_id, user_id, event_type, risk_score, risk_band, policy_action, factors_json, evidence_json
       ) VALUES ($1, $2, 'APPROVAL_REQUEST', 50, 'Medium', 'MFA_PLUS_APPROVAL', '[]'::jsonb, $3)`,
      [
        sessionId,
        req.user.id,
        JSON.stringify({
          approvalRequestId: approval.id,
          actionDescription,
          requestedByRole: req.user.role,
        }),
      ]
    );

    return res.status(201).json({
      message: 'Sensitive action submitted for approval',
      approvalRequest: approval,
    });
  } catch (err) {
    console.error('Error submitting sensitive action:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
