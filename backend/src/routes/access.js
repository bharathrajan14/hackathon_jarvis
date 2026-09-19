import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/index.js';
import { reevaluateSession } from '../logic/reevaluateSession.js';

const router = express.Router();

const VALID_NETWORKS = ['office', 'public', 'unknown'];
const VALID_LOCATIONS = ['office', 'near', 'far'];

// POST /access/request (protected)
router.post('/request', requireAuth, async (req, res) => {
  try {
    const { resourceId, network, location, deviceId } = req.body;

    // Check required fields
    if (!resourceId || !network || !location || !deviceId) {
      return res.status(400).json({
        error: 'Missing required fields: resourceId, network, location, deviceId',
      });
    }

    // Validate network enum
    if (!VALID_NETWORKS.includes(network)) {
      return res.status(400).json({
        error: `Invalid network value '${network}'. Must be one of: ${VALID_NETWORKS.join(', ')}`,
      });
    }

    // Validate location enum
    if (!VALID_LOCATIONS.includes(location)) {
      return res.status(400).json({
        error: `Invalid location value '${location}'. Must be one of: ${VALID_LOCATIONS.join(', ')}`,
      });
    }

    // Validate resourceId exists
    const resourceRes = await query(
      'SELECT id, name, sensitivity FROM resources WHERE id = $1',
      [resourceId]
    );
    if (resourceRes.rows.length === 0) {
      return res.status(400).json({ error: 'Resource not found' });
    }
    const resource = resourceRes.rows[0];

    // Validate deviceId exists
    const deviceRes = await query(
      'SELECT id, user_id, trust_level FROM devices WHERE id = $1',
      [deviceId]
    );
    if (deviceRes.rows.length === 0) {
      return res.status(400).json({ error: 'Device not found' });
    }
    const device = deviceRes.rows[0];

    // Validate device ownership: must belong to the logged-in user
    if (device.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden: Device does not belong to the logged-in user',
      });
    }

    // Resolve active session ID from token, request body, or recent session
    let sessionId = req.user.sessionId || req.body.sessionId || req.headers['x-session-id'] || null;
    if (!sessionId) {
      const sessionRes = await query(
        `SELECT id FROM sessions WHERE user_id = $1 ORDER BY started_at DESC LIMIT 1`,
        [req.user.id]
      );
      sessionId = sessionRes.rows[0]?.id || null;
    }

    // Call reevaluateSession to re-evaluate risk, update session, enforce action, and write security_events
    const evalResult = await reevaluateSession(sessionId, 'ACCESS_REQUEST', {
      userId: req.user.id,
      role: req.user.role,
      resourceId: resource.id,
      resourceSensitivity: resource.sensitivity,
      network,
      location,
      deviceTrust: device.trust_level,
      deviceId: device.id,
    });

    // Return evaluated risk and action to the client
    return res.json({
      riskScore: evalResult.riskScore,
      riskBand: evalResult.riskBand,
      factors: evalResult.factors,
      action: evalResult.action,
      session: evalResult.session,
      sessionStatus: evalResult.session?.status,
      currentRisk: evalResult.session?.current_risk,
      network,
      location,
      deviceTrust: device.trust_level,
      resourceSensitivity: resource.sensitivity,
    });
  } catch (err) {
    console.error('Access request error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
