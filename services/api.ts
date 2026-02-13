
const API_BASE_URL = 'http://localhost:5000';

const getHeaders = (token?: string | null) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  async get(endpoint: string, token?: string | null) {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: getHeaders(token),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async post(endpoint: string, body: any, token?: string | null) {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async put(endpoint: string, body: any, token?: string | null) {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async delete(endpoint: string, token?: string | null) {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },
};
