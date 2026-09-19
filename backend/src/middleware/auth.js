import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token missing or invalid' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_development');
    req.user = decoded;

    // Verify user still exists in database (handles server restarts with in-memory DB)
    if (decoded.id) {
      const userRes = await query('SELECT id, name, email, role FROM users WHERE id = $1', [decoded.id]);
      if (userRes.rows.length === 0) {
        // Attempt recovery by email/name if token was issued prior to DB restart
        if (decoded.name || decoded.email) {
          const recRes = await query(
            'SELECT id, name, email, role FROM users WHERE LOWER(name) = LOWER($1) OR LOWER(email) = LOWER($2)',
            [decoded.name || '', decoded.email || '']
          );
          if (recRes.rows.length > 0) {
            req.user.id = recRes.rows[0].id;
            req.user.role = recRes.rows[0].role;
            req.user.name = recRes.rows[0].name;
          } else {
            return res.status(401).json({ error: 'Session expired due to database refresh. Please login again.' });
          }
        } else {
          return res.status(401).json({ error: 'User account not found. Please login again.' });
        }
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const authenticateToken = requireAuth;
export default requireAuth;
