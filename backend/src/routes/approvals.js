import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/index.js';
import { broadcastSecurityEvent } from '../index.js';

const router = express.Router();

// Middleware: restrict to Manager, IT Admin, Admin, HR
function requireManagerOrAdmin(req, res, next) {
  const role = String(req.user?.role || '').toUpperCase();
  const allowed = ['MANAGER', 'IT_ADMINISTRATOR', 'ADMIN', 'HR', 'SOC'];
  if (!allowed.includes(role)) {
    return res.status(403).json({ error: 'Forbidden: Manager or IT Administrator role required' });
  }
  next();
}

// GET /api/manager/approvals and /approvals/pending
const getPendingApprovals = async (req, res) => {
  try {
    const sql = `
      SELECT
        ar.id,
        ar.session_id AS "sessionId",
        ar.requested_by AS "requestedBy",
        ar.resource_name AS "resourceName",
        ar.action,
        ar.action_description AS "actionDescription",
        ar.risk_score AS "riskScore",
        ar.risk_factors AS "riskFactors",
        ar.status,
        ar.created_at AS "createdAt",
        ar.expires_at AS "expiresAt",
        ar.approved_at AS "approvedAt",
        u.name AS "requestedByName",
        u.email AS "requestedByEmail",
        u.role AS "requestedByRole"
      FROM access_requests ar
      JOIN users u ON ar.requested_by = u.id
      ORDER BY ar.created_at DESC
    `;

    const result = await query(sql);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching pending approvals:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

router.get('/', requireAuth, requireManagerOrAdmin, getPendingApprovals);
router.get('/pending', requireAuth, requireManagerOrAdmin, getPendingApprovals);

// POST /api/manager/approvals (submit a new access request from employee)
router.post('/request', requireAuth, async (req, res) => {
  try {
    const { resourceName, action, actionDescription, riskScore, riskFactors } = req.body;
    const userId = req.user.id;
    const sessionId = req.user.sessionId || req.body.sessionId || null;

    if (!resourceName || !action) {
      return res.status(400).json({ error: 'resourceName and action are required' });
    }

    const desc = actionDescription || `Requesting ${action} access to ${resourceName}`;
    const score = Number(riskScore) || 68;

    const result = await query(
      `INSERT INTO access_requests (
         session_id, requested_by, resource_name, action, action_description, risk_score, risk_factors, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
       RETURNING *`,
      [sessionId, userId, resourceName, action, desc, score, JSON.stringify(riskFactors || [])]
    );

    const createdReq = result.rows[0];

    // Broadcast real-time Socket.IO notification to Managers
    broadcastSecurityEvent('approval.created', {
      approvalId: createdReq.id,
      user: req.user.name,
      role: req.user.role,
      resource: resourceName,
      action,
      riskScore: score,
      status: 'PENDING',
      message: `New access request from ${req.user.name} for ${resourceName} (${action})`,
    });

    broadcastSecurityEvent('notification.created', {
      title: 'New Access Request Pending',
      message: `${req.user.name} requested ${action} for ${resourceName}`,
      severity: 'HIGH',
      user: req.user.name,
    });

    return res.status(201).json(createdReq);
  } catch (err) {
    console.error('Create access request error:', err);
    return res.status(500).json({ error: 'Failed to create access request' });
  }
});

// Common handler for decision
async function handleDecision(req, res, decision) {
  try {
    const { id } = req.params;

    const existingRes = await query('SELECT * FROM access_requests WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    const reqRow = existingRes.rows[0];
    const updateRes = await query(
      `UPDATE access_requests
       SET status = $1,
           manager_id = $2,
           approved_at = ${decision === 'APPROVED' ? 'NOW()' : 'NULL'},
           rejected_at = ${decision === 'REJECTED' ? 'NOW()' : 'NULL'}
       WHERE id = $3
       RETURNING *`,
      [decision, req.user.id, id]
    );
    const updated = updateRes.rows[0];

    // Write security_event and audit_log
    const eventType = decision === 'APPROVED' ? 'APPROVAL_GRANTED' : 'APPROVAL_DENIED';
    await query(
      `INSERT INTO security_events (
         session_id, user_id, event_type, severity, risk_score, risk_band, policy_action, evidence_json
       ) VALUES ($1, $2, $3, 'LOW', $4, 'LOW', $5, $6)`,
      [
        reqRow.session_id,
        reqRow.requested_by,
        eventType,
        decision === 'APPROVED' ? 25 : 70,
        decision === 'APPROVED' ? 'ALLOW' : 'DENY',
        JSON.stringify({
          approvalId: id,
          reviewedBy: req.user.name,
          resource: reqRow.resource_name,
          action: reqRow.action,
        }),
      ]
    );

    await query(
      `INSERT INTO audit_logs (
         user_id, role, session_id, resource, action, decision, risk_score, risk_level, approval_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        reqRow.requested_by,
        'EMPLOYEE',
        reqRow.session_id,
        reqRow.resource_name,
        reqRow.action,
        decision === 'APPROVED' ? 'ALLOW' : 'DENY',
        decision === 'APPROVED' ? 25 : 70,
        decision === 'APPROVED' ? 'LOW' : 'HIGH',
        id,
      ]
    );

    // Broadcast Socket.IO update
    broadcastSecurityEvent('approval.updated', {
      approvalId: id,
      status: decision,
      reviewer: req.user.name,
      resource: reqRow.resource_name,
      action: reqRow.action,
      message: `${req.user.name} ${decision.toLowerCase()} request for ${reqRow.resource_name}`,
    });

    broadcastSecurityEvent('notification.created', {
      title: `Access Request ${decision}`,
      message: `Your request for ${reqRow.resource_name} (${reqRow.action}) was ${decision.toLowerCase()}`,
      severity: decision === 'APPROVED' ? 'LOW' : 'HIGH',
      userId: reqRow.requested_by,
    });

    return res.json({
      message: `Access request ${decision.toLowerCase()} successfully`,
      approvalRequest: updated,
    });
  } catch (err) {
    console.error('Approval decision error:', err);
    return res.status(500).json({ error: 'Failed to process decision' });
  }
}

// POST /approvals/:id/decision
router.post('/:id/decision', requireAuth, requireManagerOrAdmin, async (req, res) => {
  const { decision } = req.body;
  if (!decision || !['APPROVED', 'REJECTED'].includes(decision)) {
    return res.status(400).json({ error: "Invalid decision. Must be 'APPROVED' or 'REJECTED'" });
  }
  return handleDecision(req, res, decision);
});

// POST /:id/approve
router.post('/:id/approve', requireAuth, requireManagerOrAdmin, async (req, res) => {
  return handleDecision(req, res, 'APPROVED');
});

// POST /:id/reject
router.post('/:id/reject', requireAuth, requireManagerOrAdmin, async (req, res) => {
  return handleDecision(req, res, 'REJECTED');
});

export default router;
