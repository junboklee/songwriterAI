import type { User } from 'firebase/auth';

import { authedJson, errorMessage } from '@/lib/authedFetch';

const respond = (status: number, body?: unknown) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => (body === undefined ? Promise.reject(new Error('no body')) : Promise.resolve(body))
  }) as unknown as typeof fetch;
  return global.fetch as jest.Mock;
};

const user = { getIdToken: jest.fn().mockResolvedValue('token-1') } as unknown as User;

describe('authedJson', () => {
  it('sends the ID token with the caller headers and returns the body', async () => {
    const fetchMock = respond(200, { ok: true });
    await expect(
      authedJson(user, '/api/x', 'fallback', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
    ).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith('/api/x', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-1' }
    });
  });

  it('sends no Authorization header without a user', async () => {
    const fetchMock = respond(200, {});
    await authedJson(null, '/api/public', 'fallback');
    expect(fetchMock.mock.calls[0][1].headers).toEqual({});
  });

  it('returns null for an empty 204 response', async () => {
    respond(204);
    await expect(authedJson(user, '/api/x', 'fallback', { method: 'DELETE' })).resolves.toBeNull();
  });

  it('throws the API error message, or the fallback when there is none', async () => {
    respond(400, { error: '잘못된 요청' });
    await expect(authedJson(user, '/api/x', 'fallback')).rejects.toThrow('잘못된 요청');
    respond(500);
    await expect(authedJson(user, '/api/x', 'fallback')).rejects.toThrow('fallback');
  });

  it('accepts listed non-2xx statuses', async () => {
    respond(404, { error: 'gone' });
    await expect(authedJson(user, '/api/x', 'fallback', { okStatuses: [404] })).resolves.toEqual({ error: 'gone' });
  });
});

describe('errorMessage', () => {
  it('uses the error message or the fallback', () => {
    expect(errorMessage(new Error('boom'), 'fallback')).toBe('boom');
    expect(errorMessage('nope', 'fallback')).toBe('fallback');
  });
});
