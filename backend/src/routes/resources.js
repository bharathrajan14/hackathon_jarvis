import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/index.js';

const router = express.Router();

// GET /resources or /api/resources
router.get('/', requireAuth, async (req, res) => {
  try {
    const userRole = String(req.user?.role || 'EMPLOYEE').toUpperCase();

    const sql = `
      SELECT id, name, description, sensitivity, allowed_roles as "allowedRoles", actions, status
      FROM resources
      ORDER BY
        CASE sensitivity
          WHEN 'LOW' THEN 1
          WHEN 'MEDIUM' THEN 2
          WHEN 'HIGH' THEN 3
          WHEN 'CRITICAL' THEN 4
          ELSE 5
        END ASC,
        name ASC
    `;

    const result = await query(sql);

    // Map and optionally flag entitlement
    const resources = result.rows.map((r) => {
      const allowedRoles = Array.isArray(r.allowedRoles) ? r.allowedRoles : ['EMPLOYEE', 'MANAGER', 'IT_ADMINISTRATOR'];
      const isEntitled = allowedRoles.includes(userRole) || userRole === 'IT_ADMINISTRATOR';

      return {
        id: r.id,
        name: r.name,
        description: r.description,
        sensitivity: r.sensitivity,
        allowedRoles,
        actions: Array.isArray(r.actions) ? r.actions : ['VIEW'],
        status: r.status,
        isEntitled,
      };
    });

    return res.json(resources);
  } catch (err) {
    console.error('Error fetching resources:', err);
    return res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// GET /resources/:id or /api/resources/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT id, name, description, sensitivity, allowed_roles as "allowedRoles", actions, status
       FROM resources
       WHERE id = $1 OR name = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching single resource:', err);
    return res.status(500).json({ error: 'Failed to fetch resource' });
  }
});

export default router;
