const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const ct = res.headers.get('content-type') || '';
  const text = await res.text();
  let data: any = null;
  if (ct.includes('application/json') && text) {
    try { data = JSON.parse(text); } catch { data = { error: text }; }
  } else if (text) {
    data = { error: text };
  }
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

export async function login(username: string, password: string) {
  return request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
}

export async function sendMessage(userId: number, message: string) {
  return request('/api/chat/send', { method: 'POST', body: JSON.stringify({ userId, message }) });
}
