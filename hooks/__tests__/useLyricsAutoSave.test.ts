import { act, renderHook } from '@testing-library/react';

import type { ChatReply } from '@/hooks/useChatSession';
import { useLyricsAutoSave } from '@/hooks/useLyricsAutoSave';

jest.mock('@/lib/analytics', () => ({ trackEvent: jest.fn() }));

const reply = (id: string, content: string): ChatReply => ({
  message: { id, role: 'assistant', content },
  threadId: 't1',
  characterId: '1',
  characterName: 'Dayeon',
  idToken: 'token'
});

const LYRICS = '좋아!\n<lyrics title="비 오는 밤">\n[Verse 1]\n빗소리\n</lyrics>\n<style>ballad</style>';

describe('useLyricsAutoSave', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    window.localStorage.clear();
    fetchMock = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('saves lyrics from a reply once, with keepalive so a reload does not cancel it', () => {
    const { result } = renderHook(() => useLyricsAutoSave('t1', '1'));
    act(() => {
      result.current.handleReply(reply('a1', LYRICS));
      result.current.handleReply(reply('a1', LYRICS));
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/profile/songs');
    expect(init).toMatchObject({ method: 'POST', keepalive: true });
    expect(init.headers).toMatchObject({ Authorization: 'Bearer token' });
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ title: '비 오는 밤', lyrics: '[Verse 1]\n빗소리', threadId: 't1', characterId: '1' });
    expect(body.metadata).toMatchObject({ style: 'ballad', characterName: 'Dayeon' });
  });

  it('ignores ordinary chat replies', () => {
    const { result } = renderHook(() => useLyricsAutoSave('t1', '1'));
    act(() => result.current.handleReply(reply('a1', '안녕! 오늘 어땠어?')));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not save when turned off, and remembers the choice', () => {
    const { result } = renderHook(() => useLyricsAutoSave('t1', '1'));
    act(() => result.current.toggle());
    expect(result.current.enabled).toBe(false);
    expect(window.localStorage.getItem('songwriter:autoSaveLyrics')).toBe('off');

    act(() => result.current.handleReply(reply('a1', LYRICS)));
    expect(fetchMock).not.toHaveBeenCalled();

    const { result: next } = renderHook(() => useLyricsAutoSave('t1', '1'));
    expect(next.current.enabled).toBe(false);
  });
});
