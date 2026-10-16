import type { User } from 'firebase/auth';

type AuthedInit = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
  // Non-2xx statuses to treat as success (e.g. 404 when deleting something already gone).
  okStatuses?: number[];
};

// fetch() with the user's ID token. Returns the parsed JSON body (null when there is none) and
// throws an Error carrying the API's `error` message, or `fallbackError` when it has none.
export async function authedJson<T = unknown>(
  user: User | null,
  url: string,
  fallbackError: string,
  { okStatuses = [], headers = {}, ...init }: AuthedInit = {}
): Promise<T | null> {
  const finalHeaders = { ...headers };
  if (user) {
    finalHeaders.Authorization = `Bearer ${await user.getIdToken()}`;
  }

  const response = await fetch(url, { ...init, headers: finalHeaders });
  const payload = await response.json().catch(() => null);

  if (!response.ok && !okStatuses.includes(response.status)) {
    const message = payload && typeof payload.error === 'string' && payload.error ? payload.error : fallbackError;
    throw new Error(message);
  }
  return payload as T | null;
}

export const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
