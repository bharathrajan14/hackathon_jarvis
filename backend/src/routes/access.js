import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/index.js';
import { calculateRisk } from '../logic/riskEngine.js';
import { decideAction } from '../logic/policyEngine.js';

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

    // 1. Calculate Risk with resolved context
    const riskResult = calculateRisk({
      network,
      location,
      deviceTrust: device.trust_level,
      resourceSensitivity: resource.sensitivity,
    });

    // 2. Decide Policy Action based on riskBand, user role, and resource sensitivity
    const action = decideAction({
      riskBand: riskResult.band,
      role: req.user.role,
      resourceSensitivity: resource.sensitivity,
    });

    // 3. Insert audit log record into access_requests table
    await query(
      `INSERT INTO access_requests (
         user_id, resource_id, device_id, network, location,
         risk_score, risk_band, policy_action, factors_json
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        req.user.id,
        resource.id,
        device.id,
        network,
        location,
        riskResult.score,
        riskResult.band,
        action,
        JSON.stringify(riskResult.factors),
      ]
    );

    // 4. Return evaluated risk and action to the client
    return res.json({
      riskScore: riskResult.score,
      riskBand: riskResult.band,
      factors: riskResult.factors,
      action,
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
