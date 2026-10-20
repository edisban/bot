import { apiFetch } from "./apiClient";

export type ReminderItem = {
  id: number;
  title: string;
  scheduledAt: string;
  status: string;
  notes?: string;
};

export type ReminderStatus = "PENDING" | "SENT" | "DONE";

export async function getReminders(userId: number): Promise<ReminderItem[]> {
  return apiFetch<ReminderItem[]>(`/api/reminders/${userId}`);
}

export async function updateReminderStatus(
  reminderId: number,
  status: ReminderStatus,
): Promise<void> {
  await apiFetch<void>(`/api/reminders/${reminderId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function deleteReminder(reminderId: number): Promise<void> {
  await apiFetch<void>(`/api/reminders/${reminderId}`, {
    method: "DELETE",
  });
}
