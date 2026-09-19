import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/index.js';

const router = express.Router();

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const usersRes = await query('SELECT count(*) FROM users');
    const sessionsRes = await query(`SELECT count(*) FROM sessions WHERE status = 'ACTIVE'`);
    const highRiskRes = await query(`SELECT count(*) FROM sessions WHERE current_risk >= 61`);
    const alertsRes = await query(`SELECT count(*) FROM security_events WHERE severity = 'CRITICAL'`);
    const passkeyRes = await query(`SELECT count(*) FROM security_events WHERE event_type LIKE '%PASSKEY%'`);
    const approvalsRes = await query(`SELECT count(*) FROM access_requests WHERE status = 'APPROVED'`);
    const anomaliesRes = await query(`SELECT count(*) FROM security_events WHERE event_type LIKE '%ANOMALY%'`);

    return res.json({
      totalUsers: parseInt(usersRes.rows[0]?.count || 6),
      activeSessions: parseInt(sessionsRes.rows[0]?.count || 4),
      highRiskSessions: parseInt(highRiskRes.rows[0]?.count || 1),
      criticalAlerts: parseInt(alertsRes.rows[0]?.count || 2),
      blockedRequests: 14,
      passkeyEvents: parseInt(passkeyRes.rows[0]?.count || 28),
      managerApprovals: parseInt(approvalsRes.rows[0]?.count || 5),
      aiAnomalies: parseInt(anomaliesRes.rows[0]?.count || 7),
      systemHealth: [
        { service: 'Authentication Service (Passkey/FIDO2)', status: 'Operational', latency: '24ms' },
        { service: 'Authorization Engine (Action-Level RBAC)', status: 'Operational', latency: '12ms' },
        { service: 'Risk Engine (0-100 Normalization)', status: 'Operational', latency: '18ms' },
        { service: 'AI Behavior Engine (Isolation Forest)', status: 'Operational', latency: '35ms' },
        { service: 'Policy Engine (Dual-Control)', status: 'Operational', latency: '8ms' },
        { service: 'Audit Service (Append-Only)', status: 'Operational', latency: '15ms' },
        { service: 'Socket.IO Real-Time Daemon', status: 'Connected', latency: '4ms' },
      ],
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.department,
        u.status,
        u.created_at as "createdAt",
        COALESCE(s.current_risk, 18) as "riskScore",
        COALESCE(s.risk_level, 'LOW') as "riskLevel",
        COALESCE(d.name, 'Default Laptop') as "deviceName",
        COALESCE(d.trusted, true) as "deviceTrusted",
        s.id as "sessionId",
        s.status as "sessionStatus"
      FROM users u
      LEFT JOIN (
        SELECT DISTINCT ON (user_id) * FROM sessions ORDER BY user_id, started_at DESC
      ) s ON u.id = s.user_id
      LEFT JOIN (
        SELECT DISTINCT ON (user_id) * FROM devices ORDER BY user_id, first_seen DESC
      ) d ON u.id = d.user_id
      ORDER BY u.created_at ASC
    `);
    return res.json(result.rows);
  } catch (err) {
    console.error('Admin users error:', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/admin/devices
router.get('/devices', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        d.id,
        d.name,
        d.platform,
        d.browser,
        d.trusted,
        d.trust_level as "trustLevel",
        d.risk_score as "riskScore",
        d.ip,
        d.first_seen as "firstSeen",
        d.last_seen as "lastSeen",
        u.name as "userName",
        u.email as "userEmail",
        u.role as "userRole"
      FROM devices d
      JOIN users u ON d.user_id = u.id
      ORDER BY d.first_seen DESC
    `);
    return res.json(result.rows);
  } catch (err) {
    console.error('Admin devices error:', err);
    return res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// GET /api/admin/web-policies
router.get('/web-policies', async (req, res) => {
  try {
    const result = await query('SELECT * FROM website_policies ORDER BY created_at ASC');
    return res.json(result.rows);
  } catch (err) {
    console.error('Admin web policies error:', err);
    return res.status(500).json({ error: 'Failed to fetch web policies' });
  }
});

// PUT /api/admin/web-policies/:id
router.put('/web-policies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { policy, risk, category, description } = req.body;
    const result = await query(
      `UPDATE website_policies
       SET policy = COALESCE($1, policy),
           risk = COALESCE($2, risk),
           category = COALESCE($3, category),
           description = COALESCE($4, description)
       WHERE id = $5
       RETURNING *`,
      [policy, risk, category, description, id]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Update web policy error:', err);
    return res.status(500).json({ error: 'Failed to update web policy' });
  }
});

// GET /api/admin/policies
router.get('/policies', async (req, res) => {
  // Returns high-level role authorization matrices
  return res.json({
    EMPLOYEE: [
      { rule: 'Normal View (Low/Medium)', requirement: 'ALLOW 🟢' },
      { rule: 'Sensitive View (High/Critical)', requirement: 'PASSKEY 🟠' },
      { rule: 'Data Download', requirement: 'MANAGER_APPROVAL 🟣' },
      { rule: 'Data Bulk Export', requirement: 'APPROVAL + PASSKEY 🔵' },
      { rule: 'Admin Console & Config', requirement: 'DENY 🔴' },
    ],
    MANAGER: [
      { rule: 'Team & Department Resources', requirement: 'ALLOW 🟢' },
      { rule: 'Sensitive Operational Reports', requirement: 'PASSKEY 🟠' },
      { rule: 'Approve Employee Download', requirement: 'MANAGER_APPROVAL 🟣' },
      { rule: 'Approve Employee Export', requirement: 'APPROVAL + PASSKEY 🔵' },
      { rule: 'Critical Infrastructure Modification', requirement: 'APPROVAL + PASSKEY 🔵' },
    ],
    IT_ADMINISTRATOR: [
      { rule: 'SOC Dashboard & Telemetry', requirement: 'ALLOW 🟢' },
      { rule: 'User Role Modification', requirement: 'PASSKEY 🟠' },
      { rule: 'Security Policy Updates', requirement: 'PASSKEY 🟠' },
      { rule: 'Session Revocation', requirement: 'PASSKEY 🟠' },
      { rule: 'Root Configuration Deletion', requirement: 'APPROVAL + PASSKEY 🔵' },
    ],
  });
});

export default router;
