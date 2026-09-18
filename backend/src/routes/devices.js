import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/index.js';

const router = express.Router();

// POST /devices/register (protected)
router.post('/register', requireAuth, async (req, res) => {
  try {
    const { fingerprint } = req.body;

    if (!fingerprint || typeof fingerprint !== 'string' || !fingerprint.trim()) {
      return res.status(400).json({ error: 'Valid fingerprint string is required' });
    }

    const userId = req.user.id;
    const cleanFingerprint = fingerprint.trim();

    // Check if device already exists for this user
    const existing = await query(
      'SELECT id, user_id, fingerprint, trust_level, first_seen_at FROM devices WHERE user_id = $1 AND fingerprint = $2',
      [userId, cleanFingerprint]
    );

    if (existing.rows.length > 0) {
      return res.status(200).json({ device: existing.rows[0] });
    }

    // Insert new device defaulting to trust_level = 'unknown'
    const insertRes = await query(
      `INSERT INTO devices (user_id, fingerprint, trust_level)
       VALUES ($1, $2, 'unknown')
       RETURNING id, user_id, fingerprint, trust_level, first_seen_at`,
      [userId, cleanFingerprint]
    );

    return res.status(201).json({ device: insertRes.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      const existing = await query(
        'SELECT id, user_id, fingerprint, trust_level, first_seen_at FROM devices WHERE user_id = $1 AND fingerprint = $2',
        [req.user.id, req.body.fingerprint.trim()]
      );
      if (existing.rows.length > 0) {
        return res.status(200).json({ device: existing.rows[0] });
      }
    }
    console.error('Device registration error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
