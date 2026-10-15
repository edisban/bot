export type ChatMessage = {
  sender: 'USER' | 'BOT';
  content: string;
  createdAt?: string;
};

export type ChatRequest = {
  userId: number;
  message: string;
};
