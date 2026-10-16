import { act, renderHook, waitFor } from '@testing-library/react';
import type { User } from 'firebase/auth';

import { useChatSession } from '@/hooks/useChatSession';
import { sendChatMessage } from '@/lib/chatClient';

const router = { query: {} as Record<string, string>, replace: jest.fn(() => Promise.resolve(true)) };
jest.mock('next/router', () => ({ useRouter: () => router }));
jest.mock('@/lib/analytics', () => ({ trackEvent: jest.fn() }));
jest.mock('@/lib/chatClient', () => ({
  ...jest.requireActual('@/lib/chatClient'),
  sendChatMessage: jest.fn()
}));

const user = { getIdToken: jest.fn().mockResolvedValue('token') } as unknown as User;
const sendMock = sendChatMessage as jest.Mock;

const json = (body: unknown, status = 200) =>
  Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response);

function mockApi(routes: Record<string, () => Promise<Response>>) {
  const fetchMock = jest.fn((url: string) => (routes[url] ? routes[url]() : json({ error: `unexpected ${url}` }, 500)));
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const conversation = (threadId: string, characterId: string, updatedAt: string) => ({
  id: threadId,
  threadId,
  characterId,
  updatedAt,
  lastMessagePreview: '<lyrics title="밤">\n별'
});

beforeEach(() => {
  router.query = {};
  router.replace.mockClear();
  sendMock.mockReset();
});

describe('useChatSession', () => {
  it('starts a new chat with the greeting when the character has no conversation', async () => {
    mockApi({
      '/api/profile/conversations?limit=20': () => json({ conversations: [] }),
      '/api/profile/conversations?limit=1&characterId=1': () => json({ conversations: [] })
    });
    router.query = { characterId: '1' };
    const { result } = renderHook(() => useChatSession(user, '1'));

    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    expect(result.current.messages[0].id).toBe('intro');
    expect(result.current.threadId).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('opens the latest conversation for the character and puts it in the URL', async () => {
    mockApi({
      '/api/profile/conversations?limit=20': () =>
        json({
          conversations: [
            conversation('old', '1', '2026-10-01T00:00:00Z'),
            conversation('new', '1', '2026-10-10T00:00:00Z')
          ]
        }),
      '/api/profile/conversations/new?limit=100': () =>
        json({
          conversation: { threadId: 'new', characterId: '1' },
          messages: [
            { id: 'u1', role: 'user', content: '가사 써줘' },
            { id: 'a1', role: 'assistant', content: '좋아' }
          ]
        })
    });
    const { result } = renderHook(() => useChatSession(user, '1'));

    await waitFor(() => expect(result.current.threadId).toBe('new'));
    expect(result.current.messages.map(item => item.id)).toEqual(['u1', 'a1']);
    // Sorted newest first, and the preview hides lyrics markup.
    expect(result.current.conversations.map(item => item.threadId)).toEqual(['new', 'old']);
    expect(result.current.conversations[0].lastMessagePreview).toBe('🎵 밤\n\n별');
    expect(router.replace).toHaveBeenCalledWith(
      { pathname: '/chat', query: { characterId: '1', threadId: 'new' } },
      undefined,
      { shallow: true }
    );
  });

  it('shows the API message when the conversation list fails', async () => {
    mockApi({
      '/api/profile/conversations?limit=20': () => json({ error: '목록 오류' }, 500),
      '/api/profile/conversations?limit=1&characterId=1': () => json({ conversations: [] })
    });
    const { result } = renderHook(() => useChatSession(user, '1'));

    await waitFor(() => expect(result.current.conversationsError).toBe('목록 오류'));
  });

  it('sends a message, stores the thread and reports the reply', async () => {
    mockApi({
      '/api/profile/conversations?limit=20': () => json({ conversations: [] }),
      '/api/profile/conversations?limit=1&characterId=1': () => json({ conversations: [] })
    });
    sendMock.mockResolvedValue({
      threadId: 't9',
      reply: { id: 'a1', role: 'assistant', content: '<lyrics title="비">\n빗소리\n</lyrics>' },
      messages: [
        { id: 'u1', role: 'user', content: '비 노래' },
        { id: 'a1', role: 'assistant', content: '<lyrics title="비">\n빗소리\n</lyrics>' }
      ],
      usage: { used: 5, limit: 300 }
    });
    const onReply = jest.fn();
    const { result } = renderHook(() => useChatSession(user, '1', { onReply }));
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    await act(() => result.current.send('  비 노래  '));

    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ message: '비 노래', threadId: null, characterId: '1' }));
    expect(result.current.threadId).toBe('t9');
    expect(result.current.messages.map(item => item.id)).toEqual(['intro', 'u1', 'a1']);
    expect(result.current.quota).toEqual({ used: 5, limit: 300 });
    expect(result.current.conversations[0]).toMatchObject({ threadId: 't9', title: null, lastMessagePreview: '🎵 비\n\n빗소리' });
    expect(onReply).toHaveBeenCalledWith(
      expect.objectContaining({ threadId: 't9', characterId: '1', characterName: 'Dayeon', idToken: 'token' })
    );
    expect(router.replace).toHaveBeenCalledWith(
      { pathname: '/chat', query: { characterId: '1', threadId: 't9' } },
      undefined,
      { shallow: true }
    );
  });

  it('shows a Korean message when the request is rate limited', async () => {
    mockApi({
      '/api/profile/conversations?limit=20': () => json({ conversations: [] }),
      '/api/profile/conversations?limit=1&characterId=1': () => json({ conversations: [] })
    });
    const { ChatRequestError } = jest.requireActual('@/lib/chatClient');
    sendMock.mockRejectedValue(new ChatRequestError('', 429));
    const { result } = renderHook(() => useChatSession(user, '1'));
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    await act(() => result.current.send('안녕'));

    expect(result.current.error).toBe('요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.');
    expect(result.current.messages.at(-1)).toMatchObject({ role: 'assistant', content: result.current.error });
  });
});
