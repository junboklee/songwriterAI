import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent
} from 'react';

import { AppNav } from '@/components/AppNav';
import { AppShell } from '@/components/AppShell';
import { RequireAuth } from '@/components/RequireAuth';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatVideoPanel } from '@/components/chat/ChatVideoPanel';
import { SongBriefWizard } from '@/components/chat/SongBriefWizard';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/I18nContext';
import { useChatCharacters } from '@/hooks/useChatCharacters';
import { buildAutoSaveLyricsPayload } from '@/lib/autoSaveLyrics';
import { ChatRequestError, sendChatMessage, type ChatApiResult } from '@/lib/chatClient';
import { extractLyrics } from '@/lib/lyricsFormat';
import { getAssistantBubbleColor, isDayeonAssistant } from '@/lib/assistantBubbleColors';
import {
  QUICK_REPLIES,
  TEXT,
  getTimestampValue,
  isLikelyLyrics,
  normaliseMessages,
  type ChatMessage,
  type ConversationSummary
} from '@/lib/chat/model';

const AUTO_SAVE_STORAGE_KEY = 'songwriter:autoSaveLyrics';

type PersistLyricsOptions = {
  lyrics: string;
  title?: string | null;
  style?: string | null;
  threadId: string;
  characterId: string | null;
  characterName?: string | null;
  idToken: string;
};

export default function ChatPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t: tChat } = useTranslation('chat');
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [showBrief, setShowBrief] = useState(false);
  const [hasAttemptedInitialLoad, setHasAttemptedInitialLoad] = useState(false);
  const [autoSaveLyrics, setAutoSaveLyrics] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarConversations, setSidebarConversations] = useState<ConversationSummary[]>([]);
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const [sidebarError, setSidebarError] = useState<string | null>(null);
  const lastStoredMessageIdRef = useRef<string | null>(null);
  const lastLoadedThreadRef = useRef<string | null>(null);

  const requestedCharacterId = useMemo(() => {
    if (Array.isArray(router.query.characterId)) {
      return router.query.characterId[0] ?? null;
    }

    return typeof router.query.characterId === 'string' ? router.query.characterId : null;
  }, [router.query.characterId]);

  const characterId = requestedCharacterId ?? '1';

  const { character, getCharacterName, fetchCustomCharacters, resolveCharacterMeta, setCharacterNames } =
    useChatCharacters(user, characterId);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const stored = window.localStorage.getItem(AUTO_SAVE_STORAGE_KEY);
    if (stored === 'off') {
      setAutoSaveLyrics(false);
    }
  }, []);

  const handleToggleAutoSave = useCallback(() => {
    setAutoSaveLyrics(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(AUTO_SAVE_STORAGE_KEY, next ? 'on' : 'off');
      }
      return next;
    });
  }, []);

  const persistLyrics = useCallback(async (options: PersistLyricsOptions) => {
    const { idToken, ...rest } = options;
    const payload = buildAutoSaveLyricsPayload({
      ...rest,
      timestamp: new Date()
    });

    if (!payload) {
      return;
    }

    try {
      await fetch('/api/profile/songs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify(payload)
      });
    } catch (storeError) {
      console.error('Failed to store lyrics automatically', storeError);
    }
  }, []);

  const assistantBubbleStyle = useMemo(() => {
    if (isDayeonAssistant(character.id, character.name)) {
      return undefined;
    }
    return {
      background: getAssistantBubbleColor(character.id),
      boxShadow: '0 38px 72px -34px rgba(5, 6, 11, 0.45)'
    };
  }, [character.id, character.name]);

  useEffect(() => {
    setThreadId(null);
    lastLoadedThreadRef.current = null;
  }, [characterId]);

  useEffect(() => {
    lastStoredMessageIdRef.current = null;
  }, [threadId, characterId]);

  const isUserTyping = input.trim().length > 0;
  const statusVariant = isLoading ? 'assistant' : isUserTyping ? 'user' : 'idle';
  const statusMessage = isLoading
    ? tChat('status.assistantTyping', { replacements: { name: character.name } })
    : isUserTyping
      ? tChat('status.userTyping')
      : tChat('status.ready', { replacements: { name: character.name } });

  const handleRolePromptSelect = useCallback((promptText: string) => {
    setInput(promptText);
    chatInputRef.current?.focus();
  }, []);

  const sidebar = useMemo(
    () => (
      <ChatSidebar
        conversations={sidebarConversations}
        loading={sidebarLoading}
        error={sidebarError}
        resolveCharacterMeta={resolveCharacterMeta}
        onSelectConversation={conversation =>
          router.push({
            pathname: '/chat',
            query: {
              threadId: conversation.threadId,
              characterId: conversation.characterId ?? characterId
            }
          })
        }
        onSelectPrompt={handleRolePromptSelect}
      />
    ),
    [
      characterId,
      resolveCharacterMeta,
      router,
      sidebarConversations,
      sidebarError,
      sidebarLoading,
      handleRolePromptSelect
    ]
  );

  useEffect(() => {
    if (threadId || isLoading || !hasAttemptedInitialLoad) {
      return;
    }

    if (character.greeting) {
      setMessages([
        {
          id: 'intro',
          role: 'assistant',
          content: character.greeting
        }
      ]);
    } else {
      setMessages([]);
    }
    setError(null);
  }, [character, threadId, isLoading, hasAttemptedInitialLoad]);

  const scrollToLatest = useCallback(() => {
    if (!scrollContainerRef.current) {
      return;
    }
    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToLatest();
  }, [messages, isLoading, scrollToLatest]);

  useEffect(() => {
    if (!user) {
      setSidebarConversations([]);
      setHasAttemptedInitialLoad(true);
      return;
    }

    let cancelled = false;
    const markInitialLoadComplete = () => {
      if (!cancelled) {
        setHasAttemptedInitialLoad(true);
      }
    };

    const fetchConversationList = async (
      idToken: string,
      options?: { characterId?: string | null; limit?: number }
    ): Promise<ConversationSummary[]> => {
      if (cancelled) {
        return [];
      }

      const searchParams = new URLSearchParams();
      const requestedLimit =
        typeof options?.limit === 'number' && Number.isFinite(options.limit)
          ? Math.floor(options.limit)
          : 20;
      const safeLimit = Math.min(Math.max(requestedLimit, 1), 50);
      searchParams.set('limit', String(safeLimit));

      if (options?.characterId) {
        searchParams.set('characterId', options.characterId);
      }

      const response = await fetch(`/api/profile/conversations?${searchParams.toString()}`, {
        headers: { Authorization: `Bearer ${idToken}` }
      });

      if (!response.ok) {
        throw new Error((await response.text()) || TEXT.errorDescription);
      }

      if (cancelled) {
        return [];
      }

      const payload = (await response.json()) as { conversations?: any[] };

      return (payload.conversations ?? []).map(item => ({
        id: item.id,
        threadId: item.threadId ?? item.id,
        title: item.title ?? null,
        lastMessagePreview: item.lastMessagePreview ?? '',
        updatedAt: item.updatedAt ?? null,
        characterId: item.characterId ?? null
      }));
    };

    const loadConversations = async (idToken: string) => {
      if (cancelled) return [];
      setSidebarLoading(true);
      setSidebarError(null);
      try {
        const items = await fetchConversationList(idToken);
        if (cancelled) return [];
        const sortedItems = [...items].sort(
          (a, b) => getTimestampValue(b.updatedAt) - getTimestampValue(a.updatedAt)
        );
        setSidebarConversations(sortedItems);
        if (sortedItems.length) {
          setCharacterNames(prev => {
            const next = { ...prev };
            sortedItems.forEach(item => {
              if (item.characterId && item.title && item.title.trim()) {
                next[item.characterId] = item.title.trim();
              }
            });
            return next;
          });
        }

        const idsToPreload = sortedItems
          .map(item => item.characterId)
          .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

        if (idsToPreload.length) {
          await fetchCustomCharacters(idsToPreload, idToken);
        }

        return sortedItems;
      } catch (err) {
        if (cancelled) return [];
        setSidebarError(err instanceof Error ? err.message : TEXT.errorDescription);
        return [];
      } finally {
        if (!cancelled) setSidebarLoading(false);
      }
    };

    const loadThreadDetails = async (idToken: string, threadIdToLoad: string) => {
      if (cancelled) return;
      setIsLoading(true);
      try {
        const response = await fetch(`/api/profile/conversations/${threadIdToLoad}?limit=100`, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        if (!response.ok) return;

        const payload = (await response.json()) as {
          conversation?: { threadId?: string | null; characterId?: string | null };
          messages?: Array<{ id: string; role: string; content?: string }>;
        };
        if (cancelled) return;

        const fetchedMessages =
          (payload.messages ?? []).map<ChatMessage>(m => ({
            id: m.id,
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content ?? ''
          }));

        const resolvedThreadId = payload.conversation?.threadId ?? threadIdToLoad;
        setThreadId(resolvedThreadId);
        lastLoadedThreadRef.current = resolvedThreadId;

        const relatedCharacterId =
          typeof payload.conversation?.characterId === 'string'
            ? payload.conversation.characterId
            : null;
        if (relatedCharacterId) {
          await fetchCustomCharacters([relatedCharacterId], idToken);
        }
        const cleaned = normaliseMessages(fetchedMessages);
        if (cleaned.length) {
          setMessages(cleaned);
          setError(null);
          if (typeof window !== 'undefined') {
            window.requestAnimationFrame(scrollToLatest);
          } else {
            scrollToLatest();
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(TEXT.errorDescription);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    const initialize = async () => {
      try {
        const idToken = await user.getIdToken();
        const conversations = await loadConversations(idToken);
        if (characterId) {
          await fetchCustomCharacters([characterId], idToken);
        }

        const preferredThreadId =
          typeof router.query.threadId === 'string' ? router.query.threadId : null;

        if (preferredThreadId) {
          if (lastLoadedThreadRef.current !== preferredThreadId) {
            await loadThreadDetails(idToken, preferredThreadId);
          }
          return;
        }

        let latestForChar = conversations?.find(c => c.characterId === characterId);
        const hasExplicitCharacterSelection = Boolean(requestedCharacterId);

        if (!latestForChar && characterId) {
          try {
            const filtered = await fetchConversationList(idToken, {
              characterId,
              limit: 1
            });
            if (filtered.length) {
              latestForChar = filtered[0];
            }
          } catch (characterLoadError) {
            console.warn('Failed to load recent conversation for character', {
              error: characterLoadError
            });
          }
        }

        if (hasExplicitCharacterSelection) {
          if (latestForChar) {
            await loadThreadDetails(idToken, latestForChar.threadId);
            router.replace(
              {
                pathname: '/chat',
                query: { characterId, threadId: latestForChar.threadId }
              },
              undefined,
              { shallow: true }
            );
          }
          return;
        }

        if (latestForChar) {
          await loadThreadDetails(idToken, latestForChar.threadId);
          router.replace(
            {
              pathname: '/chat',
              query: { characterId, threadId: latestForChar.threadId }
            },
            undefined,
            { shallow: true }
          );
          return;
        }

        const mostRecentConversation = conversations?.[0];
        if (mostRecentConversation) {
          await loadThreadDetails(idToken, mostRecentConversation.threadId);
          const fallbackCharacterId = mostRecentConversation.characterId ?? characterId ?? '1';
          router.replace(
            {
              pathname: '/chat',
              query: {
                characterId: fallbackCharacterId,
                threadId: mostRecentConversation.threadId
              }
            },
            undefined,
            { shallow: true }
          );
        }
      } finally {
        markInitialLoadComplete();
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
}, [
    characterId,
    fetchCustomCharacters,
    requestedCharacterId,
    router,
    router.query.threadId,
    scrollToLatest,
    setCharacterNames,
    user
  ]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();

    if (!trimmed || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error(TEXT.sessionExpired);
      }

      const idToken = await user.getIdToken();
      let data: ChatApiResult;
      try {
        data = await sendChatMessage({
          idToken,
          message: trimmed,
          threadId,
          characterId,
          onDelta: setStreamingText
        });
      } catch (requestError) {
        if (requestError instanceof ChatRequestError) {
          const fallback =
            requestError.status === 401
              ? TEXT.sessionExpired
              : requestError.status === 429
              ? TEXT.rateLimited
              : 'Assistant request failed.';
          throw new Error(requestError.message || fallback);
        }
        throw requestError;
      } finally {
        setStreamingText(null);
      }

      setThreadId(data.threadId);
      if (data.threadId) {
        lastLoadedThreadRef.current = data.threadId;
      }

      if (data.threadId && router.query.threadId !== data.threadId) {
        router.replace(
          {
            pathname: '/chat',
            query: { characterId, threadId: data.threadId }
          },
          undefined,
          { shallow: true }
        );
      }

      if (data.messages?.length) {
        setMessages(prev => {
          const intro = prev[0]?.id === 'intro' ? [prev[0]] : [];
          const cleaned = normaliseMessages(data.messages);
          return [...intro, ...cleaned];
        });
      } else if (data.reply) {
        const replyMessage = data.reply;
        setMessages(prev => {
          const intro = prev[0]?.id === 'intro' ? [prev[0]] : [];
          const history = prev.filter(item => item.id !== 'intro');
          const cleaned = normaliseMessages([...history, replyMessage]);
          return [...intro, ...cleaned];
        });
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: `assistant-fallback-${Date.now()}`,
            role: 'assistant',
            content: 'I could not generate a reply. Please try again in a moment.'
          }
        ]);
      }

      setSidebarConversations(prev => {
        const lastAssistantMessage =
          [...(data.messages ?? [])]
            .reverse()
            .find(entry => entry.role === 'assistant' && entry.content.trim().length > 0) ??
          data.reply ??
          null;

        const previewText =
          lastAssistantMessage?.content.trim() ||
          trimmed;

        const existing = prev.find(item => item.threadId === data.threadId);
        const updated: ConversationSummary = {
          id: existing?.id ?? data.threadId,
          threadId: data.threadId,
          title: existing?.title ?? getCharacterName(characterId, character.name),
          lastMessagePreview: previewText,
          updatedAt: new Date().toISOString(),
          characterId
        };

      const next = [updated, ...prev.filter(item => item.threadId !== data.threadId)];
      return next.slice(0, 20);
    });

      const assistantMessages: Array<{ id?: string; content: string }> = [
        ...(data.reply && data.reply.role === 'assistant' ? [data.reply] : []),
        ...((data.messages ?? [])
          .slice()
          .reverse()
          .filter(
            entry =>
              entry.role === 'assistant' &&
              typeof entry.content === 'string' &&
              entry.content.trim().length > 0
          ) as Array<{ id: string; content: string }>)
      ];

      const lastAssistantMessage =
        assistantMessages.find(message => message.content.trim().length > 0) ?? null;

      const parsedLyrics = lastAssistantMessage ? extractLyrics(lastAssistantMessage.content) : null;

      if (
        autoSaveLyrics &&
        lastAssistantMessage &&
        (parsedLyrics || isLikelyLyrics(lastAssistantMessage.content)) &&
        data.threadId &&
        lastStoredMessageIdRef.current !== lastAssistantMessage.id
      ) {
        lastStoredMessageIdRef.current =
          lastAssistantMessage.id ?? `lyrics-${Date.now()}`;
        void persistLyrics({
          lyrics: parsedLyrics?.body ?? lastAssistantMessage.content,
          title: parsedLyrics?.title ?? null,
          style: parsedLyrics?.style ?? null,
          threadId: data.threadId,
          characterId,
          characterName: character.name,
          idToken
        });
      }

      if (characterId) {
        const resolvedName = getCharacterName(characterId, character.name);
        if (resolvedName) {
          setCharacterNames(prev => {
            if (prev[characterId] === resolvedName) {
              return prev;
            }
            return { ...prev, [characterId]: resolvedName };
          });
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unexpected error. Try again later.';

      setMessages(prev => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: message
        }
      ]);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();

      const trimmed = input.trim();
      if (!trimmed || isLoading) {
        return;
      }

      const formElement = formRef.current;

      if (!formElement) {
        return;
      }

      if (typeof formElement.requestSubmit === 'function') {
        formElement.requestSubmit();
        return;
      }

      formElement.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  };

  return (
    <RequireAuth>
      <div className="chat-page">
        <AppShell sidebar={sidebar}>
          <div className="page-actions-bar">
            <AppNav
              actions={
                <>
                  <Link href="/dashboard" className="btn btn--ghost">
                    대시보드
                  </Link>
                  <Link href="/character/create" className="btn btn--primary">
                    캐릭터 생성
                  </Link>
                </>
              }
            />
          </div>

          <div className="chat-stage">
            <div className="chat-stage__conversation">
              <div className="chat-layout">
                <div className="chat-layout__header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Image
                      src={character.avatar}
                      alt={`${character.name} avatar`}
                      width={52}
                      height={52}
                      style={{ borderRadius: 18 }}
                    />
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>{character.name}</p>
                      <p
                        style={{
                          margin: '6px 0 0',
                          fontSize: '0.85rem',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {character.description}
                      </p>
                    </div>
                  </div>
                  <div className="status-indicator status-indicator--desktop">{character.availability}</div>
                </div>

                <div className="chat-status-bar">
                  <div className="chat-status-bar__indicator">
                    {statusVariant === 'assistant' || statusVariant === 'user' ? (
                      <div className="typing-indicator">
                        <span className="typing-indicator__dot" />
                        <span className="typing-indicator__dot" />
                        <span className="typing-indicator__dot" />
                      </div>
                    ) : (
                      <span className="chat-status-bar__dot" />
                    )}
                    <span>{statusMessage}</span>
                  </div>
                </div>

                <ChatMessageList
                  ref={scrollContainerRef}
                  messages={messages}
                  avatar={character.avatar}
                  characterName={character.name}
                  assistantBubbleStyle={assistantBubbleStyle}
                  isLoading={isLoading}
                  streamingText={streamingText}
                  typingLabel={tChat('typingIndicator.assistant')}
                />

                <form ref={formRef} onSubmit={handleSubmit} className="chat-footer">
                  {showBrief ? (
                    <SongBriefWizard
                      onClose={() => setShowBrief(false)}
                      onSubmit={prompt => {
                        setInput(prompt);
                        setShowBrief(false);
                        chatInputRef.current?.focus();
                      }}
                    />
                  ) : (
                    <button type="button" className="chip song-brief__open" onClick={() => setShowBrief(true)}>
                      🎼 곡 만들기 마법사
                    </button>
                  )}
                  <details className="chip-accordion">
                    <summary>{tChat('quickReplies')}</summary>
                    <div className="chip-list chip-list--scroll">
                      {QUICK_REPLIES.map(reply => (
                        <button key={reply} type="button" className="chip" onClick={() => setInput(reply)}>
                          {reply}
                        </button>
                      ))}
                    </div>
                  </details>
                  <div className="chat-input">
                    <textarea
                      ref={chatInputRef}
                      value={input}
                      onChange={event => setInput(event.target.value)}
                      onKeyDown={handleInputKeyDown}
                      placeholder={tChat('inputPlaceholder')}
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="btn btn--primary"
                      style={{ paddingInline: 24 }}
                    >
                      {tChat('send')}
                    </button>
                  </div>
                  <div className="chat-footer__options" style={{ marginTop: 12 }}>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: '0.78rem',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      <input type="checkbox" checked={autoSaveLyrics} onChange={handleToggleAutoSave} />
                      <span>가사 자동 저장</span>
                    </label>
                    <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      AI가 만든 답변은 부정확하거나 기존 곡과 비슷할 수 있어요.{' '}
                      <Link href="/terms#ai" style={{ color: 'inherit', textDecoration: 'underline' }}>
                        자세히
                      </Link>
                    </p>
                  </div>
                  {error ? (
                    <p style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--danger)' }}>{error}</p>
                  ) : null}
                </form>
              </div>
            </div>

            <ChatVideoPanel
              videoUrl={character.videoUrl}
              characterName={character.name}
              characterAvatar={character.avatar}
            />
          </div>
        </AppShell>
      </div>
    </RequireAuth>
  );
}
