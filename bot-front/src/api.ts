const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export async function sendMessage(userId: number, message: string) {
  const res = await fetch(`${API_BASE}/api/chat/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, message }),
  });
  return res.json();
}
