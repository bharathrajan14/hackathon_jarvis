/**
 * Pure function to decide authorization action based on pre-computed riskBand, role, and resourceSensitivity.
 * No I/O, no imports of riskEngine.js or db.
 *
 * Full action set: ALLOW, MFA, MFA_PLUS_APPROVAL, RESTRICT, READ_ONLY, DENY, SESSION_SUSPEND
 *
 * @param {Object|string} paramsOrBand
 * @param {'Low'|'Medium'|'High'|'Critical'} [paramsOrBand.riskBand]
 * @param {'employee'|'manager'|'admin'} [paramsOrBand.role]
 * @param {'low'|'medium'|'high'} [paramsOrBand.resourceSensitivity]
 * @param {number} [paramsOrBand.score]
 * @param {number} [paramsOrBand.priorRisk]
 * @returns {'ALLOW'|'MFA'|'MFA_PLUS_APPROVAL'|'RESTRICT'|'READ_ONLY'|'DENY'|'SESSION_SUSPEND'} Action string
 */
export function decideAction(paramsOrBand) {
  let riskBand = 'Low';
  let role = 'employee';
  let resourceSensitivity = 'medium';
  let score = null;
  let priorRisk = 0;

  if (typeof paramsOrBand === 'string') {
    riskBand = paramsOrBand;
  } else if (typeof paramsOrBand === 'object' && paramsOrBand !== null) {
    riskBand = paramsOrBand.riskBand || 'Low';
    role = paramsOrBand.role || 'employee';
    resourceSensitivity = paramsOrBand.resourceSensitivity || 'medium';
    score = paramsOrBand.score ?? null;
    priorRisk = paramsOrBand.priorRisk ?? 0;
  }

  switch (riskBand) {
    case 'Low':
      return 'ALLOW';

    case 'Medium':
      if (role === 'hr') {
        return resourceSensitivity === 'high' ? 'RESTRICT' : 'READ_ONLY';
      }
      return 'MFA';

    case 'High':
      if (role === 'admin') {
        return 'MFA_PLUS_APPROVAL';
      }
      if (role === 'manager') {
        return resourceSensitivity === 'high' ? 'RESTRICT' : 'MFA_PLUS_APPROVAL';
      }
      if (role === 'employee') {
        // Under escalating priorRisk or medium/high sensitivity, restrict access
        if (priorRisk > 0 || resourceSensitivity === 'medium' || resourceSensitivity === 'high') {
          return 'RESTRICT';
        }
        return 'READ_ONLY';
      }
      if (role === 'hr') {
        return 'RESTRICT';
      }
      return 'RESTRICT';

    case 'Critical':
      if ((score !== null && score >= 85) || priorRisk >= 60) {
        return 'SESSION_SUSPEND';
      }
      return 'DENY';

    default:
      return 'DENY';
  }
}

export default decideAction;
