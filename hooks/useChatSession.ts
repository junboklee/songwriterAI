import { useEffect, useRef, useState } from 'react';
import { useRouter, type NextRouter } from 'next/router';
import type { User } from 'firebase/auth';

import { useChatCharacters } from '@/hooks/useChatCharacters';
import { trackEvent } from '@/lib/analytics';
import { authedJson, errorMessage } from '@/lib/authedFetch';
import { getTimestampValue, normaliseMessages, TEXT, type ChatMessage, type ConversationSummary } from '@/lib/chat/model';
import {
  INTRO_MESSAGE_ID,
  chooseInitialThread,
  latestAssistantMessage,
  mergeChatResult,
  toConversationSummary,
  upsertConversation
} from '@/lib/chat/session';
import { ChatRequestError, sendChatMessage, type ChatApiMessage, type ChatApiResult } from '@/lib/chatClient';

export const DEFAULT_CHARACTER_ID = '1';
const MAX_LIST_LIMIT = 20;

export type ChatReply = {
  message: ChatApiMessage;
  threadId: string;
  characterId: string;
  characterName: string;
  idToken: string;
};

type Quota = { used: number; limit: number | null };

type ConversationListPayload = { conversations?: Array<Record<string, unknown>> };
type ThreadPayload = {
  conversation?: { threadId?: string | null; characterId?: string | null };
  messages?: Array<{ id: string; role: string; content?: string }>;
};

const replaceChatUrl = (router: NextRouter, query: { characterId: string; threadId: string }) => {
  void router.replace({ pathname: '/chat', query }, undefined, { shallow: true });
};

const requestErrorFallback = (status: number) =>
  status === 401 ? TEXT.sessionExpired : status === 429 ? TEXT.rateLimited : TEXT.requestFailed;

// State of the chat page: the active character and thread, its messages, the sidebar's recent
// conversations, and sending messages. Opens the right thread on first visit and keeps the URL
// (?characterId=&threadId=) in sync. `onReply` runs after every assistant reply (lyrics auto-save).
export function useChatSession(
  user: User | null,
  requestedCharacterId: string | null,
  { onReply }: { onReply?: (reply: ChatReply) => void } = {}
) {
  const router = useRouter();
  const characterId = requestedCharacterId ?? DEFAULT_CHARACTER_ID;
  const { character, fetchCustomCharacters, resolveCharacterMeta } = useChatCharacters(user, characterId);

  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [hasAttemptedInitialLoad, setHasAttemptedInitialLoad] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const lastLoadedThreadRef = useRef<string | null>(null);
  const onReplyRef = useRef(onReply);
  onReplyRef.current = onReply;

  useEffect(() => {
    setThreadId(null);
    lastLoadedThreadRef.current = null;
  }, [characterId]);

  // A new chat (no thread yet) starts with the character's greeting.
  useEffect(() => {
    if (threadId || isLoading || !hasAttemptedInitialLoad) {
      return;
    }
    setMessages(character.greeting ? [{ id: INTRO_MESSAGE_ID, role: 'assistant', content: character.greeting }] : []);
    setError(null);
  }, [character, threadId, isLoading, hasAttemptedInitialLoad]);


  useEffect(() => {
    if (!user) {
      setConversations([]);
      setHasAttemptedInitialLoad(true);
      return;
    }

    let cancelled = false;

    const fetchConversationList = async (filter?: { characterId: string; limit: number }) => {
      const params = new URLSearchParams({ limit: String(filter?.limit ?? MAX_LIST_LIMIT) });
      if (filter) {
        params.set('characterId', filter.characterId);
      }
      const payload = await authedJson<ConversationListPayload>(
        user,
        `/api/profile/conversations?${params.toString()}`,
        TEXT.errorDescription
      );
      return (payload?.conversations ?? []).map(toConversationSummary);
    };

    const loadConversations = async (idToken: string) => {
      setConversationsLoading(true);
      setConversationsError(null);
      try {
        const items = (await fetchConversationList()).sort(
          (a, b) => getTimestampValue(b.updatedAt) - getTimestampValue(a.updatedAt)
        );
        if (cancelled) {
          return [];
        }
        setConversations(items);
        const characterIds = items.map(item => item.characterId).filter((id): id is string => Boolean(id));
        if (characterIds.length) {
          await fetchCustomCharacters(characterIds, idToken);
        }
        return items;
      } catch (loadError) {
        if (!cancelled) {
          setConversationsError(errorMessage(loadError, TEXT.errorDescription));
        }
        return [];
      } finally {
        if (!cancelled) {
          setConversationsLoading(false);
        }
      }
    };

    const loadThread = async (idToken: string, threadIdToLoad: string) => {
      setIsLoading(true);
      try {
        // An unknown or deleted thread just falls back to a new chat.
        const payload = await authedJson<ThreadPayload>(
          user,
          `/api/profile/conversations/${encodeURIComponent(threadIdToLoad)}?limit=100`,
          TEXT.threadLoadError,
          { okStatuses: [404] }
        );
        if (cancelled || !payload?.messages) {
          return;
        }

        const resolvedThreadId = payload.conversation?.threadId ?? threadIdToLoad;
        setThreadId(resolvedThreadId);
        lastLoadedThreadRef.current = resolvedThreadId;

        const relatedCharacterId = payload.conversation?.characterId;
        if (typeof relatedCharacterId === 'string' && relatedCharacterId) {
          await fetchCustomCharacters([relatedCharacterId], idToken);
        }
        const loaded = normaliseMessages(
          payload.messages.map<ChatMessage>(item => ({
            id: item.id,
            role: item.role === 'assistant' ? 'assistant' : 'user',
            content: item.content ?? ''
          }))
        );
        if (!cancelled && loaded.length) {
          setMessages(loaded);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(errorMessage(loadError, TEXT.threadLoadError));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    const initialize = async () => {
      try {
        const idToken = await user.getIdToken();
        const list = await loadConversations(idToken);
        await fetchCustomCharacters([characterId], idToken);
        if (cancelled) {
          return;
        }

        const preferredThreadId = typeof router.query.threadId === 'string' ? router.query.threadId : null;
        if (preferredThreadId) {
          if (lastLoadedThreadRef.current !== preferredThreadId) {
            await loadThread(idToken, preferredThreadId);
          }
          return;
        }

        let latestForCharacter: ConversationSummary | null = null;
        if (!list.some(item => item.characterId === characterId)) {
          try {
            latestForCharacter = (await fetchConversationList({ characterId, limit: 1 }))[0] ?? null;
          } catch (lookupError) {
            console.warn('Failed to load recent conversation for character', { error: lookupError });
          }
        }

        const choice = chooseInitialThread(list, characterId, Boolean(requestedCharacterId), latestForCharacter);
        if (choice && !cancelled) {
          await loadThread(idToken, choice.threadId);
          replaceChatUrl(router, choice);
        }
      } catch (initError) {
        console.error('Failed to initialise chat', initError);
      } finally {
        if (!cancelled) {
          setHasAttemptedInitialLoad(true);
        }
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [characterId, fetchCustomCharacters, requestedCharacterId, router, router.query.threadId, user]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) {
      return;
    }

    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content: trimmed }]);
    setIsLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error(TEXT.sessionExpired);
      }
      const idToken = await user.getIdToken();

      let data: ChatApiResult;
      try {
        data = await sendChatMessage({ idToken, message: trimmed, threadId, characterId, onDelta: setStreamingText });
      } catch (requestError) {
        if (requestError instanceof ChatRequestError) {
          throw new Error(requestError.message || requestErrorFallback(requestError.status));
        }
        throw requestError;
      } finally {
        setStreamingText(null);
      }

      trackEvent('chat_message_sent', { character_type: characterId === DEFAULT_CHARACTER_ID ? 'builtin' : 'custom' });
      if (data.usage) {
        setQuota(data.usage);
      }
      setThreadId(data.threadId);
      if (data.threadId) {
        lastLoadedThreadRef.current = data.threadId;
        if (router.query.threadId !== data.threadId) {
          replaceChatUrl(router, { characterId, threadId: data.threadId });
        }
      }

      setMessages(prev => mergeChatResult(prev, data, TEXT.emptyReply));
      const reply = latestAssistantMessage(data);
      if (data.threadId) {
        setConversations(prev =>
          upsertConversation(prev, { threadId: data.threadId, characterId, preview: reply?.content.trim() || trimmed })
        );
        if (reply) {
          onReplyRef.current?.({ message: reply, threadId: data.threadId, characterId, characterName: character.name, idToken });
        }
      }
    } catch (sendError) {
      const message = errorMessage(sendError, TEXT.unexpectedError);
      setMessages(prev => [...prev, { id: `assistant-error-${Date.now()}`, role: 'assistant', content: message }]);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    characterId,
    character,
    resolveCharacterMeta,
    threadId,
    messages,
    isLoading,
    streamingText,
    error,
    quota,
    conversations,
    conversationsLoading,
    conversationsError,
    send
  };
}
