import { apiFetch } from './apiClient';

export type ReminderItem = {
  id: number;
  title: string;
  scheduledAt: string;
  status: string;
  notes?: string;
};

export async function getReminders(userId: number): Promise<ReminderItem[]> {
  return apiFetch<ReminderItem[]>(`/api/reminders/${userId}`);
}
