import { apiFetch } from './apiClient';

export type ChatMessage = {
  id?: number;
  sender: 'USER' | 'BOT';
  content: string;
  createdAt?: string;
};

export type ChatRequest = {
  userId: number;
  message: string;
};

export async function getChatHistory(userId: number): Promise<ChatMessage[]> {
  return apiFetch<ChatMessage[]>(`/api/chat/history/${userId}`);
}

export async function sendChatMessage(payload: ChatRequest): Promise<{ reply: string }> {
  return apiFetch<{ reply: string }>('/api/chat/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
