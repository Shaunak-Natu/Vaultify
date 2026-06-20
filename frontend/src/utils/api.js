const BASE = '/api';

function getToken() {
  return localStorage.getItem('vaultify_token');
}

async function request(method, path, body, isText = false) {
  const headers = { 'Content-Type': body instanceof FormData ? undefined : isText ? 'text/plain' : 'application/json' };
  if (headers['Content-Type'] === undefined) delete headers['Content-Type'];

  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body == null ? undefined : (body instanceof FormData || typeof body === 'string') ? body : JSON.stringify(body),
  });

  // Handle empty responses
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }

  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Auth
  register: (username, password) => request('POST', '/auth/register', { username, password }),
  login: (username, password) => request('POST', '/auth/login', { username, password }),
  verify: () => request('POST', '/auth/verify'),

  // Vault
  listEntries: () => request('GET', '/vault'),
  getEntry: (id) => request('GET', `/vault/${id}`),
  createEntry: (entry) => request('POST', '/vault', entry),
  updateEntry: (id, entry) => request('PUT', `/vault/${id}`, entry),
  toggleFavorite: (id) => request('PATCH', `/vault/${id}/favorite`),
  deleteEntry: (id) => request('DELETE', `/vault/${id}`),
  getCategories: () => request('GET', '/vault/meta/categories'),

  // Export
  exportJSON: () => fetch(`${BASE}/export/json`, { headers: { Authorization: `Bearer ${getToken()}` } }),
  exportCSV: () => fetch(`${BASE}/export/csv`, { headers: { Authorization: `Bearer ${getToken()}` } }),

  // Import
  importJSON: (data) => request('POST', '/import/json', data),
  importCSV: (csvText) => {
    const token = getToken();
    return fetch(`${BASE}/import/csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', Authorization: `Bearer ${token}` },
      body: csvText,
    }).then(async r => {
      const t = await r.text();
      const d = JSON.parse(t);
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      return d;
    });
  },
};
