import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/index.js';

const router = express.Router();

const ROLE_HIERARCHY = {
  employee: ['employee'],
  manager: ['employee', 'manager'],
  hr: ['employee', 'manager'],
  soc: ['employee', 'manager', 'admin'],
  admin: ['employee', 'manager', 'admin'],
};

// GET /resources - returns entitled resources based on user's role hierarchy
router.get('/', requireAuth, async (req, res) => {
  try {
    const userRole = req.user?.role;
    const allowedRoles = ROLE_HIERARCHY[userRole] || [];

    if (allowedRoles.length === 0) {
      return res.json([]);
    }

    const placeholders = allowedRoles.map((_, idx) => `$${idx + 1}`).join(', ');
    const sql = `
      SELECT id, name, sensitivity
      FROM resources
      WHERE min_role IN (${placeholders})
      ORDER BY name ASC
    `;

    const result = await query(sql, allowedRoles);

    // Return only { id, name, sensitivity }, strictly preventing any leakage of min_role
    const resources = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      sensitivity: row.sensitivity,
    }));

    return res.json(resources);
  } catch (err) {
    console.error('Error fetching resources:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
