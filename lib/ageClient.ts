import type { User } from 'firebase/auth';

export type ConfirmAgeResult = { ok: true } | { ok: false; underAge: boolean; message: string };

// Browser call to POST /api/profile/age.
export async function confirmAge(user: User, birthDate: string, fallbackError: string): Promise<ConfirmAgeResult> {
  try {
    const response = await fetch('/api/profile/age', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify({ birthDate })
    });
    if (response.ok) {
      return { ok: true };
    }
    const payload = await response.json().catch(() => ({}));
    return {
      ok: false,
      underAge: payload.code === 'UNDER_AGE',
      message: typeof payload.error === 'string' && payload.error ? payload.error : fallbackError
    };
  } catch {
    return { ok: false, underAge: false, message: fallbackError };
  }
}
