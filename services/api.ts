
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

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    let errorMsg = 'API Error';
    try {
      const errorData = await res.json();
      errorMsg = errorData.message || errorData.error || errorMsg;
    } catch (e) {
      errorMsg = res.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }
  return res.json();
};

export const api = {
  async get(endpoint: string, token?: string | null) {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: getHeaders(token),
    });
    return handleResponse(res);
  },

  async post(endpoint: string, body: any, token?: string | null) {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async put(endpoint: string, body: any, token?: string | null) {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async delete(endpoint: string, token?: string | null) {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    return handleResponse(res);
  },
};
