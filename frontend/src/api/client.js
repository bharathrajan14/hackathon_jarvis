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
    if (response.status === 401 && !endpoint.includes('/login') && !endpoint.includes('/register')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
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
  login: (email, password) => apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
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

  requestAccess: (resourceId, network, location, deviceId) => apiFetch('/access/request', {
    method: 'POST',
    body: JSON.stringify({ resourceId, network, location, deviceId }),
  }),

  getAuditLogs: () => apiFetch('/audit-logs', {
    method: 'GET',
  }),
};

export default api;
