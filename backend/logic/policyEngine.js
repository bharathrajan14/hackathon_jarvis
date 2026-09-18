/**
 * Pure function to decide authorization action based on pre-computed riskBand, role, and resourceSensitivity.
 * No I/O, no imports of riskEngine.js or db.
 *
 * @param {Object} params
 * @param {'Low'|'Medium'|'High'|'Critical'} params.riskBand
 * @param {'employee'|'manager'|'admin'} params.role
 * @param {'low'|'medium'|'high'} [params.resourceSensitivity]
 * @returns {'ALLOW'|'MFA'|'READ_ONLY'|'MFA_PLUS_APPROVAL'|'DENY'} Action string
 */
export function decideAction({ riskBand, role, resourceSensitivity }) {
  switch (riskBand) {
    case 'Low':
      return 'ALLOW';

    case 'Medium':
      return 'MFA';

    case 'High':
      if (role === 'employee') {
        return 'READ_ONLY';
      }
      if (role === 'manager' || role === 'admin') {
        return 'MFA_PLUS_APPROVAL';
      }
      return 'READ_ONLY';

    case 'Critical':
      return 'DENY';

    default:
      return 'DENY';
  }
}

export default decideAction;
