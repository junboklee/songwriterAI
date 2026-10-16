import { act, renderHook, waitFor } from '@testing-library/react';
import type { User } from 'firebase/auth';

import { useSongLibrary } from '@/hooks/useSongLibrary';
import type { SongEntry } from '@/types/suno';

jest.mock('@/lib/analytics', () => ({ trackEvent: jest.fn() }));

const text = { loadError: 'load', deleteError: 'delete', saveError: 'save', sessionExpired: 'session' };
const user = { getIdToken: jest.fn().mockResolvedValue('token') } as unknown as User;

const song = (id: string): SongEntry => ({
  id,
  title: id,
  lyrics: '가사',
  prompt: null,
  characterId: null,
  threadId: null,
  metadata: {},
  createdAt: null,
  updatedAt: null
});

const json = (body: unknown, status = 200) =>
  Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response);

function mockApi(routes: Record<string, (init?: RequestInit) => Promise<Response>>) {
  const fetchMock = jest.fn((url: string, init?: RequestInit) => {
    const route = routes[`${init?.method ?? 'GET'} ${url}`];
    return route ? route(init) : json({ error: `unexpected ${url}` }, 500);
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('useSongLibrary', () => {
  it('loads the first page and appends the next one without duplicates', async () => {
    mockApi({
      'GET /api/profile/songs': () => json({ songs: [song('a'), song('b')], nextCursor: 1700000000000 }),
      'GET /api/profile/songs?cursor=1700000000000': () => json({ songs: [song('b'), song('c')], nextCursor: null })
    });
    const { result } = renderHook(() => useSongLibrary(user, text));
    await waitFor(() => expect(result.current.songs).toHaveLength(2));
    expect(result.current.nextCursor).toBe('1700000000000');

    await act(() => result.current.loadMore());

    expect(result.current.songs.map(item => item.id)).toEqual(['a', 'b', 'c']);
    expect(result.current.nextCursor).toBeNull();
  });

  it('shows the API error when loading fails', async () => {
    mockApi({ 'GET /api/profile/songs': () => json({ error: '불러오기 실패' }, 500) });
    const { result } = renderHook(() => useSongLibrary(user, text));
    await waitFor(() => expect(result.current.error).toBe('불러오기 실패'));
    expect(result.current.loading).toBe(false);
  });

  it('adds a created song to the top', async () => {
    const fetchMock = mockApi({
      'GET /api/profile/songs': () => json({ songs: [song('a')] }),
      'POST /api/profile/songs': () => json({ song: song('new') }, 201)
    });
    const { result } = renderHook(() => useSongLibrary(user, text));
    await waitFor(() => expect(result.current.songs).toHaveLength(1));

    await act(() => result.current.createSong({ title: null, prompt: null, lyrics: '새 가사' }));

    expect(result.current.songs.map(item => item.id)).toEqual(['new', 'a']);
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ title: null, prompt: null, lyrics: '새 가사' });
  });

  it('refuses to save while signed out', async () => {
    mockApi({});
    const { result } = renderHook(() => useSongLibrary(null, text));
    await expect(result.current.createSong({ title: null, prompt: null, lyrics: 'x' })).rejects.toThrow('session');
  });

  it('deletes selected songs, or all of them', async () => {
    const fetchMock = mockApi({
      'GET /api/profile/songs': () => json({ songs: [song('a'), song('b'), song('c')], nextCursor: 5 }),
      'DELETE /api/profile/songs': () => json(null, 204)
    });
    const { result } = renderHook(() => useSongLibrary(user, text));
    await waitFor(() => expect(result.current.songs).toHaveLength(3));

    await act(async () => {
      expect(await result.current.deleteSongs(['a', 'c'])).toBe(true);
    });
    expect(result.current.songs.map(item => item.id)).toEqual(['b']);

    await act(async () => {
      expect(await result.current.deleteSongs('all')).toBe(true);
    });
    expect(result.current.songs).toEqual([]);
    expect(result.current.nextCursor).toBeNull();
    const bodies = fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE').map(([, init]) => JSON.parse(String(init?.body)));
    expect(bodies).toEqual([{ ids: ['a', 'c'] }, { deleteAll: true }]);
  });

  it('keeps the songs and shows the error when deletion fails', async () => {
    mockApi({
      'GET /api/profile/songs': () => json({ songs: [song('a')] }),
      'DELETE /api/profile/songs': () => json({ error: '삭제 실패' }, 500)
    });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() => useSongLibrary(user, text));
    await waitFor(() => expect(result.current.songs).toHaveLength(1));

    await act(async () => {
      expect(await result.current.deleteSongs(['a'])).toBe(false);
    });
    expect(result.current.songs).toHaveLength(1);
    expect(result.current.error).toBe('삭제 실패');
  });
});
