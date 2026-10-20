import { apiFetch } from "./apiClient";

export type MemoryItem = {
  id: number;
  fact: string;
  createdAt: string;
};

export async function getMemory(userId: number): Promise<MemoryItem[]> {
  return apiFetch<MemoryItem[]>(`/api/memory/${userId}`);
}
