import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/index.js';

const router = express.Router();

// Middleware: restrict to HR or Admin roles only
function requireHrOrAdmin(req, res, next) {
  if (req.user?.role !== 'hr' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: HR or Admin role required' });
  }
  next();
}

// GET /approvals/pending (protected, hr or admin role only)
router.get('/pending', requireAuth, requireHrOrAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT
        ar.id,
        ar.session_id AS "sessionId",
        ar.requested_by AS "requestedBy",
        ar.action_description AS "actionDescription",
        ar.status,
        ar.created_at AS "createdAt",
        ar.resolved_at AS "resolvedAt",
        u.name AS "requestedByName",
        u.email AS "requestedByEmail",
        u.role AS "requestedByRole"
      FROM approval_requests ar
      JOIN users u ON ar.requested_by = u.id
      WHERE ar.status = 'PENDING'
      ORDER BY ar.created_at ASC
    `;

    const result = await query(sql);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching pending approvals:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /approvals/:id/decision (protected, hr or admin role only)
router.post('/:id/decision', requireAuth, requireHrOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { decision } = req.body;

    if (!decision || (decision !== 'APPROVED' && decision !== 'REJECTED')) {
      return res.status(400).json({ error: "Invalid decision. Must be 'APPROVED' or 'REJECTED'" });
    }

    // Check if request exists and is PENDING
    const existingRes = await query(
      'SELECT id, session_id, requested_by, action_description, status FROM approval_requests WHERE id = $1',
      [id]
    );

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    const approvalReq = existingRes.rows[0];
    if (approvalReq.status !== 'PENDING') {
      return res.status(400).json({ error: `Approval request has already been ${approvalReq.status.toLowerCase()}` });
    }

    // Update approval_requests row
    const updateRes = await query(
      `UPDATE approval_requests
       SET status = $1,
           reviewed_by = $2,
           resolved_at = NOW()
       WHERE id = $3
       RETURNING id, session_id, requested_by, action_description, status, reviewed_by, created_at, resolved_at`,
      [decision, req.user.id, id]
    );
    const updated = updateRes.rows[0];

    // Write security_event: APPROVAL_GRANTED or APPROVAL_DENIED
    const eventType = decision === 'APPROVED' ? 'APPROVAL_GRANTED' : 'APPROVAL_DENIED';
    const policyAction = decision === 'APPROVED' ? 'ALLOW' : 'DENY';

    await query(
      `INSERT INTO security_events (
         session_id, user_id, event_type, risk_score, risk_band, policy_action, factors_json, evidence_json
       ) VALUES ($1, $2, $3, $4, $5, $6, '[]'::jsonb, $7)`,
      [
        approvalReq.session_id,
        approvalReq.requested_by,
        eventType,
        decision === 'APPROVED' ? 25 : 60,
        decision === 'APPROVED' ? 'Low' : 'High',
        policyAction,
        JSON.stringify({
          approvalRequestId: id,
          reviewedBy: req.user.id,
          reviewerRole: req.user.role,
          actionDescription: approvalReq.action_description,
          decision,
        }),
      ]
    );

    return res.json({
      message: `Approval request ${decision.toLowerCase()} successfully`,
      approvalRequest: updated,
    });
  } catch (err) {
    console.error('Error resolving approval request:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
