import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { calculateRisk, calculateRiskAsync } from '../logic/riskEngine.js';
import { decideAction } from '../logic/policyEngine.js';

const router = express.Router();
const ALLOWED_ROLES = ['employee', 'manager', 'admin', 'hr', 'soc'];

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields: name, email, password, role' });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${ALLOWED_ROLES.join(', ')}` });
    }

    // Check for duplicate email
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name.trim(), email.toLowerCase().trim(), passwordHash, role]
    );

    const user = result.rows[0];
    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing required fields: email, password' });
    }

    const result = await query('SELECT id, name, email, password_hash, role FROM users WHERE email = $1', [
      email.toLowerCase().trim(),
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Resolve context for Stage A Login Risk
    const context = {
      network: req.body.network || req.body.context?.network || 'office',
      location: req.body.location || req.body.context?.location || 'office',
      deviceTrust: req.body.deviceTrust || req.body.context?.deviceTrust || req.body.device || 'trusted',
      timeOfDay: req.body.timeOfDay || req.body.context?.timeOfDay || 'normal',
    };

    // Calculate Stage A Login Risk
    const riskResult = await calculateRiskAsync('LOGIN', context);
    const action = decideAction({ riskBand: riskResult.band, role: user.role });

    // Handle Risk Bands
    if (riskResult.band === 'Low') {
      // Create session with status ACTIVE
      const sessionResult = await query(
        `INSERT INTO sessions (user_id, status, current_risk)
         VALUES ($1, 'ACTIVE', $2)
         RETURNING id, status, current_risk`,
        [user.id, riskResult.score]
      );
      const session = sessionResult.rows[0];

      const token = jwt.sign(
        { id: user.id, role: user.role, sessionId: session.id },
        process.env.JWT_SECRET || 'fallback_secret_for_development',
        { expiresIn: '8h' }
      );

      return res.json({
        status: 'ACTIVE',
        token,
        sessionId: session.id,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
        },
      });
    }

    if (riskResult.band === 'Medium') {
      // Create session with status MFA_REQUIRED (no token yet)
      const sessionResult = await query(
        `INSERT INTO sessions (user_id, status, current_risk)
         VALUES ($1, 'MFA_REQUIRED', $2)
         RETURNING id, status, current_risk`,
        [user.id, riskResult.score]
      );
      const session = sessionResult.rows[0];

      // Generate 6-digit OTP code and store in mfa_challenges with 5-minute expiry
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await query(
        `INSERT INTO mfa_challenges (session_id, otp_code, expires_at)
         VALUES ($1, $2, $3)`,
        [session.id, otpCode, expiresAt]
      );

      // Log OTP code to server console (stub notification - no real email needed for prototype)
      console.log(`[MFA STUB] 6-digit OTP for session ${session.id}: ${otpCode} (expires in 5 minutes)`);

      // Log security event for MFA_REQUIRED
      try {
        await query(
          `INSERT INTO security_events (
             session_id, user_id, event_type, resource_id,
             risk_score, risk_band, policy_action, factors_json, evidence_json
           ) VALUES ($1, $2, 'MFA_REQUIRED', NULL, $3, $4, $5, $6, $7)`,
          [
            session.id,
            user.id,
            riskResult.score,
            riskResult.band,
            action,
            JSON.stringify(riskResult.factors || []),
            JSON.stringify(context),
          ]
        );
      } catch (evtErr) {
        console.warn('Failed to log MFA_REQUIRED security event:', evtErr.message);
      }

      return res.json({
        status: 'MFA_REQUIRED',
        sessionId: session.id,
      });
    }

    // High or Critical: Do not create session, return 403 and log security event
    try {
      await query(
        `INSERT INTO security_events (
           session_id, user_id, event_type, resource_id,
           risk_score, risk_band, policy_action, factors_json, evidence_json
         ) VALUES (NULL, $1, 'LOGIN_BLOCKED', NULL, $2, $3, $4, $5, $6)`,
        [
          user.id,
          riskResult.score,
          riskResult.band,
          action,
          JSON.stringify(riskResult.factors || []),
          JSON.stringify(context),
        ]
      );
    } catch (evtErr) {
      console.warn('Failed to log LOGIN_BLOCKED security event:', evtErr.message);
    }

    console.warn(`[SECURITY EVENT] Login blocked: userId=${user.id}, score=${riskResult.score}, band=${riskResult.band}, action=${action}`);

    return res.status(403).json({
      error: 'Access denied: high login risk detected',
      riskScore: riskResult.score,
      riskBand: riskResult.band,
      action,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/mfa/verify
router.post('/mfa/verify', async (req, res) => {
  try {
    const { sessionId, otpCode } = req.body;

    if (!sessionId || !otpCode) {
      return res.status(400).json({ error: 'Missing required fields: sessionId, otpCode' });
    }

    // Lookup session and associated user
    const sessionRes = await query(
      `SELECT s.id, s.user_id, s.status, s.current_risk, u.role, u.name
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [sessionId]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    const session = sessionRes.rows[0];

    // Find latest challenge for this session
    const challengeRes = await query(
      `SELECT id, otp_code, expires_at, verified
       FROM mfa_challenges
       WHERE session_id = $1
       ORDER BY expires_at DESC
       LIMIT 1`,
      [sessionId]
    );

    if (challengeRes.rows.length === 0) {
      return res.status(401).json({ error: 'No MFA challenge found for session' });
    }

    const challenge = challengeRes.rows[0];
    const isExpired = new Date() > new Date(challenge.expires_at);
    const isCorrect = !challenge.verified && !isExpired && challenge.otp_code === String(otpCode).trim();

    if (!isCorrect) {
      // Write MFA_FAILURE security event
      await query(
        `INSERT INTO security_events (
           session_id, user_id, event_type, risk_score, risk_band, policy_action, factors_json, evidence_json
         ) VALUES ($1, $2, 'MFA_FAILURE', $3, 'Medium', 'MFA', '[]'::jsonb, $4)`,
        [
          session.id,
          session.user_id,
          session.current_risk || 40,
          JSON.stringify({
            reason: isExpired ? 'OTP expired' : challenge.verified ? 'OTP already used' : 'Invalid OTP code',
            attemptedCode: String(otpCode).slice(0, 2) + '****',
          }),
        ]
      );

      return res.status(401).json({ error: 'Invalid or expired OTP code' });
    }

    // Mark challenge verified
    await query(`UPDATE mfa_challenges SET verified = true WHERE id = $1`, [challenge.id]);

    // Update session status to ACTIVE
    await query(
      `UPDATE sessions SET status = 'ACTIVE', last_evaluated_at = NOW() WHERE id = $1`,
      [session.id]
    );

    // Issue JWT token
    const token = jwt.sign(
      { id: session.user_id, role: session.role, sessionId: session.id },
      process.env.JWT_SECRET || 'fallback_secret_for_development',
      { expiresIn: '8h' }
    );

    return res.json({
      status: 'ACTIVE',
      token,
      sessionId: session.id,
      user: {
        id: session.user_id,
        name: session.name,
        role: session.role,
      },
    });
  } catch (err) {
    console.error('MFA verify error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
