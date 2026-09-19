/**
 * AdaptiveGuard Policy Engine
 * Authoritative decision matrix taking identity, RBAC, resource, action, context,
 * risk score, behavioral anomaly, and prior approvals to yield exactly one state:
 * - ALLOW
 * - RESTRICT
 * - MANAGER_APPROVAL
 * - APPROVAL_AND_PASSKEY
 * - MONITOR
 * - DENY
 * - SESSION_REVOKED
 */

export const DECISIONS = {
  ALLOW: 'ALLOW',
  RESTRICT: 'RESTRICT', // requires Passkey step-up
  MANAGER_APPROVAL: 'MANAGER_APPROVAL', // requires manager approval
  APPROVAL_AND_PASSKEY: 'APPROVAL_AND_PASSKEY', // requires manager approval then passkey
  MONITOR: 'MONITOR', // low-risk audited access
  DENY: 'DENY', // access denied by RBAC or policy
  SESSION_REVOKED: 'SESSION_REVOKED', // critical risk security kill-switch
};

/**
 * Standard Role definitions
 */
export const ROLES = {
  EMPLOYEE: 'EMPLOYEE',
  MANAGER: 'MANAGER',
  IT_ADMINISTRATOR: 'IT_ADMINISTRATOR',
};

/**
 * Evaluates authorization policy for a requested resource and action
 * @param {Object} input
 * @param {string} input.role - 'EMPLOYEE' | 'MANAGER' | 'IT_ADMINISTRATOR'
 * @param {string} input.resource - Resource name e.g. 'Financial Database'
 * @param {string} input.resourceSensitivity - 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
 * @param {string} input.action - 'VIEW' | 'DOWNLOAD' | 'EXPORT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'CONFIGURE' | 'REVOKE'
 * @param {number} input.riskScore - Normalized risk score (0 - 100)
 * @param {string} input.riskLevel - 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
 * @param {Object} [input.context] - Device, network, location
 * @param {boolean} [input.hasApprovedRequest] - Whether a valid manager approval exists
 * @param {boolean} [input.hasPasskeyVerified] - Whether step-up passkey verification was fulfilled
 * @returns {{ decision: string, requiredControl: string|null, reason: Array<string>, riskScore: number, riskLevel: string, expiresAt: string|null }}
 */
export function decideAuthorization(input = {}) {
  const role = String(input.role || 'EMPLOYEE').toUpperCase();
  const resource = String(input.resource || input.resourceName || 'Unknown Resource');
  const sensitivity = String(input.resourceSensitivity || input.sensitivity || 'LOW').toUpperCase();
  const action = String(input.action || 'VIEW').toUpperCase();
  const riskScore = Number(input.riskScore || 0);
  const riskLevel = String(input.riskLevel || (riskScore >= 81 ? 'CRITICAL' : riskScore >= 61 ? 'HIGH' : riskScore >= 31 ? 'MEDIUM' : 'LOW')).toUpperCase();
  const hasApprovedRequest = Boolean(input.hasApprovedRequest);
  const hasPasskeyVerified = Boolean(input.hasPasskeyVerified);

  const reasons = [];

  // ==========================================
  // 1. CRITICAL THREAT REVOCATION CHECK
  // ==========================================
  if (riskScore >= 85 || riskLevel === 'CRITICAL') {
    reasons.push('Critical security anomaly detected (Risk >= 85)');
    reasons.push('Session terminated by automated security response');
    return {
      decision: DECISIONS.SESSION_REVOKED,
      requiredControl: 'LOGIN_AGAIN',
      reason: reasons,
      riskScore,
      riskLevel: 'CRITICAL',
      expiresAt: null,
    };
  }

  // ==========================================
  // 2. HARD RBAC CHECKS (Role Boundary Enforcements)
  // Risk must NEVER override a fundamental role restriction
  // ==========================================
  if (role === 'EMPLOYEE') {
    if (['Admin Console', 'System Configuration'].includes(resource)) {
      reasons.push(`Role ${role} is prohibited from accessing ${resource}`);
      return {
        decision: DECISIONS.DENY,
        requiredControl: null,
        reason: reasons,
        riskScore,
        riskLevel,
        expiresAt: null,
      };
    }
    if (['DELETE', 'REVOKE', 'CONFIGURE'].includes(action)) {
      reasons.push(`Action ${action} is strictly prohibited for ${role}`);
      return {
        decision: DECISIONS.DENY,
        requiredControl: null,
        reason: reasons,
        riskScore,
        riskLevel,
        expiresAt: null,
      };
    }
    if (['Security Reports', 'Audit Logs'].includes(resource)) {
      reasons.push(`Security telemetry and audit logs are restricted to Manager and Administrator roles`);
      return {
        decision: DECISIONS.DENY,
        requiredControl: null,
        reason: reasons,
        riskScore,
        riskLevel,
        expiresAt: null,
      };
    }
  }

  if (role === 'MANAGER') {
    if (resource === 'System Configuration' && ['CONFIGURE', 'DELETE'].includes(action)) {
      reasons.push(`Infrastructure configuration is restricted to IT_ADMINISTRATOR`);
      return {
        decision: DECISIONS.DENY,
        requiredControl: null,
        reason: reasons,
        riskScore,
        riskLevel,
        expiresAt: null,
      };
    }
  }

  // ==========================================
  // 3. FULFILLED CONTROLS BYPASS / PERMIT
  // ==========================================
  if (hasApprovedRequest && hasPasskeyVerified) {
    reasons.push('Manager approval granted and Passkey cryptographic challenge verified');
    return {
      decision: DECISIONS.ALLOW,
      requiredControl: null,
      reason: reasons,
      riskScore,
      riskLevel,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  }

  // ==========================================
  // 4. ACTION & RESOURCE SPECIFIC POLICY MATRIX
  // ==========================================

  // --- Financial Database (CRITICAL) ---
  if (resource === 'Financial Database') {
    if (action === 'DELETE') {
      reasons.push('Financial database deletion is prohibited by corporate compliance policy');
      return { decision: DECISIONS.DENY, requiredControl: null, reason: reasons, riskScore, riskLevel, expiresAt: null };
    }

    if (action === 'EXPORT') {
      if (hasApprovedRequest) {
        if (!hasPasskeyVerified) {
          reasons.push('Manager approval recorded. Step-up Passkey required to complete bulk financial export');
          return { decision: DECISIONS.RESTRICT, requiredControl: 'PASSKEY', reason: reasons, riskScore, riskLevel, expiresAt: null };
        }
      }
      reasons.push('Bulk financial database export requires dual control: Manager Approval and Passkey');
      return { decision: DECISIONS.APPROVAL_AND_PASSKEY, requiredControl: 'MANAGER_APPROVAL', reason: reasons, riskScore, riskLevel, expiresAt: null };
    }

    if (action === 'DOWNLOAD') {
      if (hasApprovedRequest) {
        return { decision: DECISIONS.ALLOW, requiredControl: null, reason: ['Manager approval confirmed for download'], riskScore, riskLevel, expiresAt: null };
      }
      reasons.push('Financial records download requires explicit Manager approval');
      return { decision: DECISIONS.MANAGER_APPROVAL, requiredControl: 'MANAGER_APPROVAL', reason: reasons, riskScore, riskLevel, expiresAt: null };
    }

    if (action === 'VIEW') {
      if (!hasPasskeyVerified) {
        reasons.push('Critical financial ledger requires hardware Passkey step-up');
        return { decision: DECISIONS.RESTRICT, requiredControl: 'PASSKEY', reason: reasons, riskScore, riskLevel, expiresAt: null };
      }
      return { decision: DECISIONS.ALLOW, requiredControl: null, reason: ['Passkey verified for financial database access'], riskScore, riskLevel, expiresAt: null };
    }
  }

  // --- Financial Reports (HIGH) ---
  if (resource === 'Financial Reports') {
    if (action === 'EXPORT') {
      if (hasApprovedRequest) {
        return !hasPasskeyVerified
          ? { decision: DECISIONS.RESTRICT, requiredControl: 'PASSKEY', reason: ['Approved. Passkey required to finalize export'], riskScore, riskLevel, expiresAt: null }
          : { decision: DECISIONS.ALLOW, requiredControl: null, reason: ['Export authorized with Dual Control'], riskScore, riskLevel, expiresAt: null };
      }
      return { decision: DECISIONS.APPROVAL_AND_PASSKEY, requiredControl: 'MANAGER_APPROVAL', reason: ['Financial report export requires Manager Approval and Passkey'], riskScore, riskLevel, expiresAt: null };
    }

    if (action === 'DOWNLOAD') {
      if (role === 'EMPLOYEE' && !hasApprovedRequest) {
        return { decision: DECISIONS.MANAGER_APPROVAL, requiredControl: 'MANAGER_APPROVAL', reason: ['Employee download requires Manager approval'], riskScore, riskLevel, expiresAt: null };
      }
      if (!hasPasskeyVerified && (riskScore > 35 || role === 'EMPLOYEE')) {
        return { decision: DECISIONS.RESTRICT, requiredControl: 'PASSKEY', reason: ['High sensitivity report download requires Passkey'], riskScore, riskLevel, expiresAt: null };
      }
      return { decision: DECISIONS.ALLOW, requiredControl: null, reason: ['Download authorized'], riskScore, riskLevel, expiresAt: null };
    }

    if (action === 'VIEW') {
      if (!hasPasskeyVerified && (riskScore > 30 || role === 'EMPLOYEE')) {
        return { decision: DECISIONS.RESTRICT, requiredControl: 'PASSKEY', reason: ['High-sensitivity resource view requires Passkey verification'], riskScore, riskLevel, expiresAt: null };
      }
      return { decision: DECISIONS.ALLOW, requiredControl: null, reason: ['View granted'], riskScore, riskLevel, expiresAt: null };
    }
  }

  // --- Employee Records (MEDIUM) ---
  if (resource === 'Employee Records') {
    if (action === 'DOWNLOAD') {
      if (!hasPasskeyVerified) {
        return { decision: DECISIONS.RESTRICT, requiredControl: 'PASSKEY', reason: ['Personally Identifiable Information (PII) download requires Passkey'], riskScore, riskLevel, expiresAt: null };
      }
      return { decision: DECISIONS.ALLOW, requiredControl: null, reason: ['PII download verified'], riskScore, riskLevel, expiresAt: null };
    }
    if (action === 'EXPORT') {
      return { decision: DECISIONS.DENY, requiredControl: null, reason: ['Bulk export of employee records is not allowed'], riskScore, riskLevel, expiresAt: null };
    }
    return { decision: DECISIONS.ALLOW, requiredControl: null, reason: ['Employee records view permitted'], riskScore, riskLevel, expiresAt: null };
  }

  // --- Customer Records (MEDIUM) ---
  if (resource === 'Customer Records') {
    if (action === 'DOWNLOAD' || action === 'EXPORT') {
      if (!hasApprovedRequest) {
        return { decision: DECISIONS.MANAGER_APPROVAL, requiredControl: 'MANAGER_APPROVAL', reason: ['Customer CRM export requires Manager Authorization'], riskScore, riskLevel, expiresAt: null };
      }
      return { decision: DECISIONS.ALLOW, requiredControl: null, reason: ['Manager approval verified'], riskScore, riskLevel, expiresAt: null };
    }
    return { decision: DECISIONS.ALLOW, requiredControl: null, reason: ['CRM view permitted'], riskScore, riskLevel, expiresAt: null };
  }

  // --- Admin Console & System Config (IT_ADMINISTRATOR) ---
  if (['Admin Console', 'System Configuration'].includes(resource)) {
    if (role === 'IT_ADMINISTRATOR') {
      if (['CONFIGURE', 'DELETE', 'REVOKE'].includes(action)) {
        if (!hasPasskeyVerified) {
          return { decision: DECISIONS.RESTRICT, requiredControl: 'PASSKEY', reason: ['Critical administrative modification requires hardware Passkey verification'], riskScore, riskLevel, expiresAt: null };
        }
      }
      return { decision: DECISIONS.ALLOW, requiredControl: null, reason: ['Administrator access authorized'], riskScore, riskLevel, expiresAt: null };
    }
  }

  // ==========================================
  // 5. DYNAMIC RISK TIER OVERRIDES
  // ==========================================
  if (riskLevel === 'HIGH' || riskScore >= 61) {
    if (action !== 'VIEW' && !hasApprovedRequest) {
      return {
        decision: DECISIONS.MANAGER_APPROVAL,
        requiredControl: 'MANAGER_APPROVAL',
        reason: [`Elevated risk environment (${riskScore}/100) mandates Manager approval for ${action}`],
        riskScore,
        riskLevel,
        expiresAt: null,
      };
    }
    if (!hasPasskeyVerified) {
      return {
        decision: DECISIONS.RESTRICT,
        requiredControl: 'PASSKEY',
        reason: [`Elevated risk context (${riskScore}/100) requires step-up Passkey verification`],
        riskScore,
        riskLevel,
        expiresAt: null,
      };
    }
  }

  if (riskLevel === 'MEDIUM' || riskScore >= 31) {
    if (['DOWNLOAD', 'EXPORT'].includes(action) && !hasPasskeyVerified) {
      return {
        decision: DECISIONS.RESTRICT,
        requiredControl: 'PASSKEY',
        reason: ['Medium risk detected during data extraction attempt: Passkey required'],
        riskScore,
        riskLevel,
        expiresAt: null,
      };
    }
  }

  // Default clean low risk
  return {
    decision: DECISIONS.ALLOW,
    requiredControl: null,
    reason: ['Standard operational access under low contextual risk'],
    riskScore,
    riskLevel: 'LOW',
    expiresAt: null,
  };
}

/**
 * Backward compatibility wrapper matching old decideAction signature
 */
export function decideAction(paramsOrBand) {
  if (typeof paramsOrBand === 'string') {
    if (paramsOrBand === 'Critical') return 'SESSION_SUSPEND';
    if (paramsOrBand === 'High') return 'RESTRICT';
    if (paramsOrBand === 'Medium') return 'MFA';
    return 'ALLOW';
  }
  const auth = decideAuthorization(paramsOrBand);
  if (auth.decision === DECISIONS.SESSION_REVOKED) return 'SESSION_SUSPEND';
  if (auth.decision === DECISIONS.RESTRICT) return 'MFA';
  if (auth.decision === DECISIONS.MANAGER_APPROVAL || auth.decision === DECISIONS.APPROVAL_AND_PASSKEY) return 'MFA_PLUS_APPROVAL';
  if (auth.decision === DECISIONS.DENY) return 'DENY';
  return 'ALLOW';
}

export default {
  decideAuthorization,
  decideAction,
  DECISIONS,
  ROLES,
};
