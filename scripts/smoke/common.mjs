// Shared helpers for production smoke tests (scripts/smoke/api.mjs, scripts/smoke/ui.mjs).
//
// They log in as a dedicated, ordinary test account instead of using Firebase Admin credentials,
// so the CI job never needs server secrets. Required env:
//   SMOKE_EMAIL, SMOKE_PASSWORD   the test account (create it once via /auth/register)
// Optional env:
//   SMOKE_BASE_URL                defaults to https://novasingerai.com
//   NEXT_PUBLIC_FIREBASE_API_KEY  defaults to the public web key from apphosting.yaml

export const BASE_URL = (process.env.SMOKE_BASE_URL ?? 'https://novasingerai.com').replace(/\/$/, '');
export const EMAIL = process.env.SMOKE_EMAIL;
export const PASSWORD = process.env.SMOKE_PASSWORD;
const WEB_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyCQNZwdX8XclqhIxkczKaORSu8ciN0B6oo';

if (!EMAIL || !PASSWORD) {
  console.error('SMOKE_EMAIL and SMOKE_PASSWORD must be set.');
  process.exit(2);
}

const results = [];

export function check(name, ok, detail = '') {
  results.push({ name, ok });
  const suffix = detail ? `  — ${String(detail).replace(/\s+/g, ' ').slice(0, 160)}` : '';
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${suffix}`);
}

export function finish() {
  const failed = results.filter(item => !item.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log(`Failed: ${failed.map(item => item.name).join(', ')}`);
  }
  process.exit(failed.length ? 1 : 0);
}

export async function getIdToken() {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${WEB_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true })
    }
  );
  const payload = await response.json();
  if (!payload.idToken) {
    throw new Error(`sign-in failed: ${payload.error?.message ?? response.status}`);
  }
  return payload.idToken;
}

// Removes everything the smoke run created: conversations (with their songs, versions and
// share pages) and any songs saved outside a conversation.
export async function cleanupTestData(idToken) {
  const headers = { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' };
  const conversations = await fetch(`${BASE_URL}/api/profile/conversations`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ scope: 'all' })
  });
  const songs = await fetch(`${BASE_URL}/api/profile/songs`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ deleteAll: true })
  });
  return conversations.ok && songs.ok;
}
