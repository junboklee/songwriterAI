import {
  buildConversationTitle,
  groupConversationsByDate,
  type ConversationSummary
} from '@/lib/conversationUtils';

describe('groupConversationsByDate', () => {
  const baseConversation: ConversationSummary = {
    id: 'base',
    threadId: 'thread-base',
    title: null,
    lastMessagePreview: '',
    lastMessageRole: null,
    messageCount: 0,
    characterId: null,
    createdAt: null,
    updatedAt: null
  };

  it('groups conversations by day, preserving insertion order within each group', () => {
    const conversations: ConversationSummary[] = [
      { ...baseConversation, id: 'no-date' },
      {
        ...baseConversation,
        id: 'second',
        threadId: 'thread-second',
        createdAt: '2025-01-01T05:00:00.000Z'
      },
      {
        ...baseConversation,
        id: 'latest',
        threadId: 'thread-latest',
        updatedAt: '2025-01-02T12:00:00.000Z',
        createdAt: '2025-01-01T12:00:00.000Z'
      }
    ];

    const groups = groupConversationsByDate(conversations);

    expect(groups).toHaveLength(3);
    expect(groups[0][0]).toBe('unknown');
    expect(groups[0][1].map(item => item.id)).toEqual(['no-date']);

    expect(groups[1][0]).toBe('2025-01-02');
    expect(groups[1][1].map(item => item.id)).toEqual(['latest']);

    expect(groups[2][0]).toBe('2025-01-01');
    expect(groups[2][1].map(item => item.id)).toEqual(['second']);
  });
});

describe('buildConversationTitle', () => {
  const baseConversation: ConversationSummary = {
    id: 'conv',
    threadId: 'thread-abc123',
    title: null,
    lastMessagePreview: '',
    lastMessageRole: null,
    messageCount: 0,
    characterId: null,
    createdAt: null,
    updatedAt: null
  };

  it('returns existing title when available', () => {
    const result = buildConversationTitle(
      { ...baseConversation, title: 'Saved title' },
      {}
    );
    expect(result).toBe('Saved title');
  });

  it('falls back to mapped character name when title is missing', () => {
    const result = buildConversationTitle(
      { ...baseConversation, characterId: 'char-1' },
      { 'char-1': 'Muse' }
    );
    expect(result).toBe('Muse');
  });

  it('generates character placeholder when mapping is missing', () => {
    const result = buildConversationTitle(
      { ...baseConversation, characterId: 'char-123456' },
      {}
    );
    expect(result).toBe('Character char-1');
  });

  it('falls back to thread label when title and character are absent', () => {
    const result = buildConversationTitle(baseConversation, {});
    expect(result).toBe('Thread thread');
  });
});
