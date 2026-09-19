const API_BASE = 'http://localhost:5000';

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_) {
    data = { raw: text };
  }

  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes('/login') && !endpoint.includes('/register') && !endpoint.includes('/mfa/verify')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('sessionId');
      window.location.href = '/login';
    }
    const errorMsg = data?.error || data?.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  login: (email, password, context = {}) => apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      network: context.network || 'office',
      location: context.location || 'office',
      deviceTrust: context.deviceTrust || 'trusted',
      timeOfDay: context.timeOfDay || 'normal',
    }),
  }),

  verifyMfa: (sessionId, otpCode) => apiFetch('/auth/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({ sessionId, otpCode }),
  }),

  register: (name, email, password, role) => apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role }),
  }),

  getResources: () => apiFetch('/resources', {
    method: 'GET',
  }),

  registerDevice: (fingerprint) => apiFetch('/devices/register', {
    method: 'POST',
    body: JSON.stringify({ fingerprint }),
  }),

  requestAccess: (resourceId, network, location, deviceId, sessionId) => apiFetch('/access/request', {
    method: 'POST',
    body: JSON.stringify({ resourceId, network, location, deviceId, sessionId }),
  }),

  getAuditLogs: () => apiFetch('/audit-logs', {
    method: 'GET',
  }),

  // Approval Center
  submitSensitiveAction: (sessionId, actionDescription) => apiFetch('/actions/sensitive', {
    method: 'POST',
    body: JSON.stringify({ sessionId, actionDescription }),
  }),

  getPendingApprovals: () => apiFetch('/approvals/pending', {
    method: 'GET',
  }),

  decideApproval: (id, decision) => apiFetch(`/approvals/${id}/decision`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  }),

  // SOC Dashboard & Copilot
  getSocEvents: (params = {}) => {
    const queryParts = [];
    if (params.userId) queryParts.push(`userId=${encodeURIComponent(params.userId)}`);
    if (params.eventType) queryParts.push(`eventType=${encodeURIComponent(params.eventType)}`);
    const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return apiFetch(`/soc/events${qs}`, { method: 'GET' });
  },

  getSocSession: (sessionId) => apiFetch(`/soc/sessions/${sessionId}`, {
    method: 'GET',
  }),

  explainWithCopilot: (sessionId) => apiFetch('/copilot/explain', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  }),
};

export default api;
