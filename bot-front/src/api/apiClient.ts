const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://bot-n21x.onrender.com";

export async function apiFetch<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const { headers, ...rest } = init ?? {};

  const response = await fetch(`${API_BASE_URL}${input}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const body = (await response.json()) as {
        message?: string;
        error?: string;
      };
      if (body?.message) {
        message = body.message;
      } else if (body?.error) {
        message = body.error;
      }
    } catch {
      // Non-JSON error body; keep the generic message.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined as T;
  }
}
