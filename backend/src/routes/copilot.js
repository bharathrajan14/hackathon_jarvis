import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/index.js';

const router = express.Router();

/**
 * Deterministic factual fallback engine that strictly synthesizes
 * System Facts and Recommendations from evidence without fabrication.
 */
function generateFactualExplanation(evidence) {
  const { sessionId, user, sessionStatus, currentRisk, timeline } = evidence;

  let facts = `### System Facts\n\n`;
  facts += `- **Session ID**: ${sessionId}\n`;
  facts += `- **User**: ${user.name} (${user.email}, Role: ${user.role})\n`;
  facts += `- **Session Status**: ${sessionStatus}\n`;
  facts += `- **Current Risk Score**: ${currentRisk}\n`;
  facts += `- **Total Timeline Events**: ${timeline.length}\n\n`;

  facts += `**Chronological Event Timeline:**\n`;
  if (timeline.length === 0) {
    facts += `- No security events recorded for this session.\n`;
  } else {
    timeline.forEach((evt) => {
      const factorsDesc =
        evt.factors && evt.factors.length > 0
          ? evt.factors.map((f) => `${f.name} (+${f.points})`).join(', ')
          : 'None';
      facts += `- **Step ${evt.step} [${evt.eventType}]**: Resource: "${evt.resource}" | Risk Score: ${evt.riskScore} (${evt.riskBand}) | Action: ${evt.action} | Factors: ${factorsDesc} | Time: ${evt.timestamp}\n`;
    });
  }

  if (timeline.length > 1) {
    const startScore = timeline[0].riskScore;
    const endScore = timeline[timeline.length - 1].riskScore;
    const finalAction = timeline[timeline.length - 1].action;
    facts += `\n**Risk Progression Analysis**: The session risk score escalated from ${startScore} to ${endScore} across ${timeline.length} evaluation points, triggering policy outcome **${finalAction}** and setting session status to **${sessionStatus}**.\n`;
  }

  let recs = `### Recommendation\n\n`;
  if (sessionStatus === 'RESTRICTED' || sessionStatus === 'SUSPENDED') {
    recs += `1. **Containment & Enforcement**: Session is currently ${sessionStatus}. Keep restricted policy gates in place and review any concurrent active sessions for ${user.email}.\n`;
    recs += `2. **Out-of-Band Verification**: Conduct out-of-band administrator verification with ${user.name} before lifting session restrictions.\n`;
    recs += `3. **Forensic Audit**: Inspect telemetry indicators (anomaly scores, untrusted network, or device changes) logged during the risk escalation.\n`;
  } else if (sessionStatus === 'MFA_REQUIRED') {
    recs += `1. **MFA Enforcement**: Enforce OTP verification before allowing session elevation to ACTIVE.\n`;
    recs += `2. **Telemetry Monitoring**: Track subsequent access attempts post-verification to ensure risk stabilizes.\n`;
  } else {
    recs += `1. **Continuous Telemetry Evaluation**: Session is ${sessionStatus} with risk score ${currentRisk}. Continue tracking risk dynamically across subsequent resource access requests.\n`;
    recs += `2. **Zero Trust Posture**: Maintain principle of least privilege for requested resources.\n`;
  }

  return `${facts}\n${recs}`;
}

// POST /copilot/explain
// Protected, accepts { sessionId }
router.post('/explain', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    // 1. Fetch session row
    const sessionRes = await query(
      `SELECT
         s.id,
         s.user_id AS "userId",
         s.status,
         s.current_risk AS "currentRisk",
         s.started_at AS "startedAt",
         s.last_evaluated_at AS "lastEvaluatedAt",
         u.name AS "userName",
         u.email AS "userEmail",
         u.role AS "userRole"
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [sessionId]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionRes.rows[0];

    // 2. Fetch full timeline from security_events
    const eventsRes = await query(
      `SELECT
         se.id,
         se.session_id AS "sessionId",
         se.user_id AS "userId",
         se.event_type AS "eventType",
         se.resource_id AS "resourceId",
         COALESCE(r.name, 'System') AS "resourceName",
         se.risk_score AS "riskScore",
         se.risk_band AS "riskBand",
         se.policy_action AS "action",
         se.factors_json AS "factors",
         se.evidence_json AS "evidence",
         se.created_at AS "createdAt"
       FROM security_events se
       LEFT JOIN resources r ON se.resource_id = r.id
       WHERE se.session_id = $1
       ORDER BY se.created_at ASC`,
      [sessionId]
    );

    // 3. Assemble structured evidence object
    const evidence = {
      sessionId: session.id,
      user: {
        id: session.userId,
        name: session.userName,
        email: session.userEmail,
        role: session.userRole,
      },
      sessionStatus: session.status,
      currentRisk: session.currentRisk,
      startedAt: session.startedAt,
      lastEvaluatedAt: session.lastEvaluatedAt,
      timeline: eventsRes.rows.map((e, idx) => ({
        step: idx + 1,
        id: e.id,
        eventType: e.eventType,
        resource: e.resourceName,
        riskScore: e.riskScore,
        riskBand: e.riskBand,
        action: e.action,
        factors: typeof e.factors === 'string' ? JSON.parse(e.factors) : e.factors,
        evidence: typeof e.evidence === 'string' ? JSON.parse(e.evidence) : e.evidence,
        timestamp: e.createdAt,
      })),
    };

    let explanation = '';
    let source = 'factual_engine';

    // 4. If GEMINI_API_KEY is configured, call Gemini with strict instructions
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const prompt = `You are a cybersecurity SOC Incident Analyst AI Copilot.
Analyze the following session and its chronological event timeline.

STRICT INSTRUCTIONS:
1. Base your response EXCLUSIVELY on the provided evidence JSON below.
2. NEVER invent, fabricate, extrapolate, or assume facts not explicitly stated in the evidence.
3. Structure your response into EXACTLY two labeled markdown sections:
### System Facts
### Recommendation
4. In "### System Facts", chronologically explain the session progression, risk climb across events, key contributing factors, final policy action, and session status.
5. In "### Recommendation", provide concrete, fact-grounded recommendations for SOC responders.

EVIDENCE JSON:
${JSON.stringify(evidence, null, 2)}
`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            explanation = candidateText;
            source = 'gemini';
          }
        } else {
          console.warn('Gemini API call returned status:', response.status, 'falling back to deterministic engine');
        }
      } catch (geminiErr) {
        console.warn('Gemini API call failed, falling back to deterministic engine:', geminiErr.message);
      }
    }

    if (!explanation) {
      explanation = generateFactualExplanation(evidence);
      source = 'factual_engine';
    }

    return res.json({
      sessionId,
      explanation,
      evidence,
      source,
    });
  } catch (err) {
    console.error('Error generating copilot explanation:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
