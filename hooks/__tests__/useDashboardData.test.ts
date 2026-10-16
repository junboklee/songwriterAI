import { act, renderHook, waitFor } from '@testing-library/react';
import type { User } from 'firebase/auth';

import { useDashboardData } from '@/hooks/useDashboardData';
import type { DashboardText } from '@/hooks/useDashboardText';

// Every label resolves to its own key.
const text = new Proxy({} as DashboardText, { get: (_target, key: string) => key });
const user = { getIdToken: jest.fn().mockResolvedValue('token') } as unknown as User;

const json = (body: unknown, status = 200) =>
  Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response);

type Route = (init?: RequestInit) => Promise<Response>;

function mockApi(overrides: Record<string, Route> = {}) {
  const routes: Record<string, Route> = {
    'GET /api/profile/characters?limit=20': () =>
      json({ characters: [{ id: 'mine', name: 'My Singer', updatedAt: '2026-10-01T00:00:00Z' }] }),
    'GET /api/characters/explore?limit=12&sort=popular': () => json({ characters: [] }),
    'GET /api/profile': () =>
      json({
        profile: { displayName: 'Tester', email: null, recentCharacterIds: ['other'], lastCharacterId: null },
        stats: { conversationCount: 2, songCount: 0 }
      }),
    'GET /api/profile/conversations?limit=5': () =>
      json({
        conversations: [
          { id: 't1', threadId: 't1', title: '비 오는 날 가사', characterId: 'other', messageCount: 4 },
          { id: 't2', threadId: 't2', title: null, characterId: 'mine', messageCount: 1 }
        ]
      }),
    'POST /api/profile/characters/batch': () => json({ characters: [{ id: 'other', name: 'Other Singer' }] }),
    ...overrides
  };
  const fetchMock = jest.fn((url: string, init?: RequestInit) => {
    const route = routes[`${init?.method ?? 'GET'} ${url}`];
    return route ? route(init) : json({ error: `unexpected ${url}` }, 500);
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('useDashboardData', () => {
  it('loads every section and resolves character names without using conversation titles', async () => {
    const fetchMock = mockApi();
    const { result } = renderHook(() => useDashboardData(user, text));

    await waitFor(() => expect(result.current.characterNames.other).toBe('Other Singer'));
    expect(result.current.characterNames.mine).toBe('My Singer');
    expect(result.current.myCharacters.data.map(item => item.id)).toEqual(['mine']);
    expect(result.current.profile.data?.stats.conversationCount).toBe(2);
    expect(result.current.recentChats.data).toHaveLength(2);

    // Only ids the user does not own are looked up.
    const batchCall = fetchMock.mock.calls.find(([url]) => url === '/api/profile/characters/batch');
    expect(JSON.parse(String(batchCall?.[1]?.body)).ids).toEqual(['other']);
    expect(batchCall?.[1]?.headers).toMatchObject({ Authorization: 'Bearer token' });
  });

  it('stays empty and skips private requests while signed out', async () => {
    const fetchMock = mockApi();
    const { result } = renderHook(() => useDashboardData(null, text));

    await waitFor(() => expect(result.current.publicCharacters.loading).toBe(false));
    expect(result.current.myCharacters.loading).toBe(false);
    expect(result.current.recentChats.data).toEqual([]);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/characters/explore?limit=12&sort=popular']);
  });

  it('shows the API error message when a section fails to load', async () => {
    mockApi({ 'GET /api/profile/conversations?limit=5': () => json({ error: '대화 목록 오류' }, 500) });
    const { result } = renderHook(() => useDashboardData(user, text));

    await waitFor(() => expect(result.current.recentChats.loading).toBe(false));
    expect(result.current.recentChats.error).toBe('대화 목록 오류');
    expect(result.current.recentChats.data).toEqual([]);
  });

  it('removes a deleted chat, treating 404 as already deleted', async () => {
    mockApi({ 'DELETE /api/profile/conversations/t1': () => json(null, 404) });
    const { result } = renderHook(() => useDashboardData(user, text));
    await waitFor(() => expect(result.current.recentChats.data).toHaveLength(2));

    await act(() => result.current.deleteRecentChat('t1'));

    expect(result.current.recentChats.data.map(chat => chat.threadId)).toEqual(['t2']);
    expect(result.current.recentChats.error).toBeNull();
    expect(result.current.deletingRecentIds).toEqual({});
  });

  it('keeps the character and reports the error when deletion fails', async () => {
    mockApi({ 'DELETE /api/profile/characters/mine': () => json({ error: '삭제 실패' }, 500) });
    const { result } = renderHook(() => useDashboardData(user, text));
    await waitFor(() => expect(result.current.myCharacters.data).toHaveLength(1));

    let deleted = true;
    await act(async () => {
      deleted = await result.current.deleteCharacter('mine');
    });

    expect(deleted).toBe(false);
    expect(result.current.myCharacters.data).toHaveLength(1);
    expect(result.current.myCharacters.error).toBe('삭제 실패');
    expect(result.current.pendingDeleteId).toBeNull();
  });

  it('applies an edited character and its new name', async () => {
    mockApi({
      'PATCH /api/profile/characters/mine': () => json({ character: { id: 'mine', name: 'Renamed' } })
    });
    const { result } = renderHook(() => useDashboardData(user, text));
    await waitFor(() => expect(result.current.myCharacters.data).toHaveLength(1));

    await act(() => result.current.updateCharacter('mine', new FormData()));

    expect(result.current.myCharacters.data[0].name).toBe('Renamed');
    expect(result.current.characterNames.mine).toBe('Renamed');
  });
});
