export type ConversationSummary = {
  id: string;
  threadId: string;
  title: string | null;
  lastMessagePreview: string;
  lastMessageRole: string | null;
  messageCount: number;
  characterId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ConversationTitleSource = Pick<
  ConversationSummary,
  'threadId' | 'title' | 'characterId'
>;

type ConversationGroups = Array<[string, ConversationSummary[]]>;

const ISO_DATE_SEPARATOR = 'T';
const UNKNOWN_KEY = 'unknown';
const FALLBACK_CHARACTER_PREFIX = 'Character';

const deriveGroupKey = (item: ConversationSummary) => {
  const source = item.updatedAt ?? item.createdAt;
  if (!source) {
    return UNKNOWN_KEY;
  }

  const date = new Date(source);
  if (Number.isNaN(date.getTime())) {
    return UNKNOWN_KEY;
  }

  return date.toISOString().split(ISO_DATE_SEPARATOR)[0];
};

export function groupConversationsByDate(
  conversations: ConversationSummary[]
): ConversationGroups {
  const groups = new Map<string, ConversationSummary[]>();

  conversations.forEach(item => {
    const key = deriveGroupKey(item);

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key)!.push(item);
  });

  return Array.from(groups.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

export const buildConversationTitle = (
  conversation: ConversationTitleSource,
  characterMap: Record<string, string>
) => {
  if (conversation.title && conversation.title.trim()) {
    return conversation.title.trim();
  }

  if (conversation.characterId) {
    const mapped = characterMap[conversation.characterId];
    if (mapped && mapped.trim()) {
      return mapped.trim();
    }
    return `${FALLBACK_CHARACTER_PREFIX} ${conversation.characterId.slice(0, 6)}`;
  }

  return conversation.threadId ? `Thread ${conversation.threadId.slice(0, 6)}` : 'Conversation';
};
