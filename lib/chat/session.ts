// Pure helpers for the chat session (hooks/useChatSession.ts): API payloads -> UI state.
import type { ChatApiMessage, ChatApiResult } from '@/lib/chatClient';
import { toDisplayText } from '@/lib/lyricsFormat';

import { normaliseMessages, type ChatMessage, type ConversationSummary } from './model';

export const INTRO_MESSAGE_ID = 'intro';
export const MAX_SIDEBAR_CONVERSATIONS = 20;

const str = (value: unknown) => (typeof value === 'string' ? value : null);

// One item of GET /api/profile/conversations. Previews hide the <lyrics>/<style> markup.
export const toConversationSummary = (item: Record<string, unknown>): ConversationSummary => {
  const id = String(item.id ?? '');
  return {
    id,
    threadId: str(item.threadId) || id,
    title: str(item.title),
    lastMessagePreview: toDisplayText(str(item.lastMessagePreview) ?? ''),
    updatedAt: str(item.updatedAt),
    characterId: str(item.characterId)
  };
};

// Messages after a chat reply: the server's history when present (keeping the local greeting).
export function mergeChatResult(prev: ChatMessage[], data: ChatApiResult, emptyReplyText: string): ChatMessage[] {
  const intro = prev[0]?.id === INTRO_MESSAGE_ID ? [prev[0]] : [];
  if (data.messages?.length) {
    return [...intro, ...normaliseMessages(data.messages)];
  }
  if (data.reply) {
    return [...intro, ...normaliseMessages([...prev.filter(item => item.id !== INTRO_MESSAGE_ID), data.reply])];
  }
  return [...prev, { id: `assistant-fallback-${Date.now()}`, role: 'assistant', content: emptyReplyText }];
}

export function latestAssistantMessage(data: ChatApiResult): ChatApiMessage | null {
  if (data.reply?.role === 'assistant' && data.reply.content.trim()) {
    return data.reply;
  }
  return (
    [...(data.messages ?? [])]
      .reverse()
      .find(item => item.role === 'assistant' && typeof item.content === 'string' && item.content.trim()) ?? null
  );
}

// Moves the conversation that just got a reply to the top of the sidebar list.
export function upsertConversation(
  prev: ConversationSummary[],
  update: { threadId: string; characterId: string | null; preview: string }
): ConversationSummary[] {
  const existing = prev.find(item => item.threadId === update.threadId);
  const updated: ConversationSummary = {
    id: existing?.id ?? update.threadId,
    threadId: update.threadId,
    title: existing?.title ?? null,
    lastMessagePreview: toDisplayText(update.preview),
    updatedAt: new Date().toISOString(),
    characterId: update.characterId
  };
  return [updated, ...prev.filter(item => item.threadId !== update.threadId)].slice(0, MAX_SIDEBAR_CONVERSATIONS);
}

export type InitialThreadChoice = { threadId: string; characterId: string } | null;

// Which conversation to open when /chat is visited without a threadId: the latest one with the
// requested character, otherwise (only when no character was requested) the latest overall.
export function chooseInitialThread(
  conversations: ConversationSummary[],
  characterId: string,
  explicitCharacter: boolean,
  latestForCharacter?: ConversationSummary | null
): InitialThreadChoice {
  const forCharacter = conversations.find(item => item.characterId === characterId) ?? latestForCharacter ?? null;
  if (forCharacter) {
    return { threadId: forCharacter.threadId, characterId };
  }
  if (explicitCharacter || !conversations[0]) {
    return null;
  }
  return { threadId: conversations[0].threadId, characterId: conversations[0].characterId ?? characterId };
}
