import type { ChatMessage, ConversationSummary } from '@/lib/chat/model';
import {
  chooseInitialThread,
  latestAssistantMessage,
  mergeChatResult,
  toConversationSummary,
  upsertConversation
} from '@/lib/chat/session';

const summary = (threadId: string, characterId: string | null): ConversationSummary => ({
  id: threadId,
  threadId,
  title: null,
  lastMessagePreview: '',
  updatedAt: null,
  characterId
});

const intro: ChatMessage = { id: 'intro', role: 'assistant', content: '안녕!' };

describe('toConversationSummary', () => {
  it('falls back to the id and hides lyrics markup in the preview', () => {
    expect(
      toConversationSummary({ id: 'c1', lastMessagePreview: '<lyrics title="밤">\n[Verse 1]\n별이 빛나', characterId: '1' })
    ).toEqual({
      id: 'c1',
      threadId: 'c1',
      title: null,
      lastMessagePreview: '🎵 밤\n\n[Verse 1]\n별이 빛나',
      updatedAt: null,
      characterId: '1'
    });
  });
});

describe('mergeChatResult', () => {
  it('uses the server history and keeps the greeting', () => {
    const merged = mergeChatResult(
      [intro, { id: 'local', role: 'user', content: '가사 써줘' }],
      {
        threadId: 't1',
        reply: null,
        messages: [
          { id: 'u1', role: 'user', content: '가사 써줘' },
          { id: 'a1', role: 'assistant', content: ' 좋아! ' }
        ]
      },
      'empty'
    );
    expect(merged.map(item => item.id)).toEqual(['intro', 'u1', 'a1']);
    expect(merged[2].content).toBe('좋아!');
  });

  it('appends the reply when there is no history, or a notice when there is nothing', () => {
    const local: ChatMessage = { id: 'local', role: 'user', content: '안녕' };
    const withReply = mergeChatResult([intro, local], {
      threadId: 't1',
      messages: [],
      reply: { id: 'a1', role: 'assistant', content: '반가워' }
    }, 'empty');
    expect(withReply.map(item => item.id)).toEqual(['intro', 'local', 'a1']);

    const empty = mergeChatResult([local], { threadId: 't1', messages: [], reply: null }, '답변 없음');
    expect(empty.at(-1)).toMatchObject({ role: 'assistant', content: '답변 없음' });
  });
});

describe('latestAssistantMessage', () => {
  it('prefers the reply, then the last non-empty assistant message', () => {
    const reply = { id: 'r', role: 'assistant' as const, content: '답' };
    expect(latestAssistantMessage({ threadId: 't', messages: [], reply })).toBe(reply);
    expect(
      latestAssistantMessage({
        threadId: 't',
        reply: null,
        messages: [
          { id: 'a1', role: 'assistant', content: '첫 답' },
          { id: 'a2', role: 'assistant', content: '  ' },
          { id: 'u1', role: 'user', content: '질문' }
        ]
      })?.id
    ).toBe('a1');
    expect(latestAssistantMessage({ threadId: 't', messages: [], reply: null })).toBeNull();
  });
});

describe('upsertConversation', () => {
  it('moves the conversation to the top without inventing a title', () => {
    const prev = [summary('a', '1'), summary('b', '1')];
    const next = upsertConversation(prev, { threadId: 'b', characterId: '1', preview: '<lyrics title="새벽">\n가사' });
    expect(next.map(item => item.threadId)).toEqual(['b', 'a']);
    expect(next[0].title).toBeNull();
    expect(next[0].lastMessagePreview).toBe('🎵 새벽\n\n가사');
  });

  it('keeps at most 20 conversations', () => {
    const prev = Array.from({ length: 20 }, (_, index) => summary(`t${index}`, '1'));
    expect(upsertConversation(prev, { threadId: 'new', characterId: '1', preview: 'x' })).toHaveLength(20);
  });
});

describe('chooseInitialThread', () => {
  const list = [summary('latest', 'other'), summary('dayeon-chat', '1')];

  it('opens the latest conversation with the requested character', () => {
    expect(chooseInitialThread(list, '1', true)).toEqual({ threadId: 'dayeon-chat', characterId: '1' });
    expect(chooseInitialThread([summary('x', 'other')], '1', true, summary('older', '1'))).toEqual({
      threadId: 'older',
      characterId: '1'
    });
  });

  it('starts a new chat when the requested character has none', () => {
    expect(chooseInitialThread([summary('x', 'other')], '1', true)).toBeNull();
  });

  it('otherwise opens the most recent conversation with its character', () => {
    expect(chooseInitialThread([summary('x', 'other')], '1', false)).toEqual({ threadId: 'x', characterId: 'other' });
    expect(chooseInitialThread([], '1', false)).toBeNull();
  });
});
