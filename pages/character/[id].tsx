import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent
} from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';

import { AppShell } from '@/components/AppShell';
import { AppNav } from '@/components/AppNav';
import { MainSidebar } from '@/components/MainSidebar';
import { useAuth } from '@/context/AuthContext';
import { DEFAULT_CHARACTER_AVATAR } from '@/lib/constants';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type CharacterProfile = {
  id: string;
  name: string;
  avatar: string;
  summary: string;
  greeting: string;
  example: string;
  visibility: 'private' | 'unlisted' | 'public';
};

type ConversationListItem = {
  id: string;
  threadId?: string | null;
  characterId?: string | null;
};

type ConversationMessagePayload = {
  id?: string;
  role?: string | null;
  content?: string | null;
};

const TEXT = {
  sessionExpired: '세션이 만료되었습니다. 다시 로그인해 주세요.',
  rateLimited: '요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.',
  loadError: '캐릭터 정보를 불러오지 못했습니다.',
  notFound: '공개된 캐릭터를 찾을 수 없습니다.',
  loginRequired: '로그인 후 캐릭터와 대화를 시작할 수 있습니다.'
};

type CharacterApiPayload = {
  id?: string;
  name?: string | null;
  summary?: string | null;
  shortDescription?: string | null;
  greeting?: string | null;
  example?: string | null;
  longDescription?: string | null;
  avatarUrl?: string | null;
  visibility?: string | null;
};

const adaptCharacter = (raw: CharacterApiPayload, fallbackId: string): CharacterProfile => {
  const summarySource =
    (typeof raw.summary === 'string' && raw.summary.trim()) ||
    (typeof raw.shortDescription === 'string' && raw.shortDescription.trim()) ||
    '';

  const exampleSource =
    (typeof raw.example === 'string' && raw.example.trim()) ||
    (typeof raw.longDescription === 'string' && raw.longDescription.trim()) ||
    '';

  const visibility =
    raw.visibility === 'public' || raw.visibility === 'unlisted' ? raw.visibility : 'private';

  return {
    id: raw.id ?? fallbackId,
    name: raw.name?.trim() || `Character ${fallbackId.slice(0, 6)}`,
    avatar:
      raw.avatarUrl && raw.avatarUrl.trim() ? raw.avatarUrl : DEFAULT_CHARACTER_AVATAR,
    summary: summarySource,
    greeting: raw.greeting ?? '',
    example: exampleSource,
    visibility
  };
};

const normaliseMessages = (items: ChatMessage[]) =>
  items
    .filter(item => (item.role === 'assistant' || item.role === 'user') && item.content)
    .map(item => ({ ...item, content: item.content.trim() }))
    .filter(item => item.content.length > 0);

export default function CharacterChatPage() {
  const router = useRouter();
  const { user } = useAuth();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const [character, setCharacter] = useState<CharacterProfile | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const characterId = useMemo(() => {
    const raw = Array.isArray(router.query.id) ? router.query.id[0] : router.query.id;
    return raw ?? null;
  }, [router.query.id]);
  const sidebar = useMemo(() => <MainSidebar active="chat" />, []);
  const loginHref = useMemo(() => {
    const target =
      router.asPath ||
      (characterId ? `/character/${characterId}` : '/character');
    return `/auth/login?redirect=${encodeURIComponent(target)}`;
  }, [characterId, router.asPath]);

  useEffect(() => {
    if (!scrollContainerRef.current) {
      return;
    }
    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    if (!characterId) {
      setPageError(TEXT.notFound);
      setPageLoading(false);
      return;
    }

    let cancelled = false;

    const fetchPrivateCharacter = async (idToken: string) => {
      const response = await fetch(`/api/profile/characters/${characterId}`, {
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          (payload && typeof payload.error === 'string' && payload.error) || TEXT.loadError;
        throw new Error(message);
      }

      if (!payload?.character) {
        throw new Error(TEXT.notFound);
      }

      return payload.character as CharacterApiPayload;
    };

    const fetchPublicCharacter = async () => {
      const response = await fetch(`/api/characters/${characterId}`);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          (payload && typeof payload.error === 'string' && payload.error) ||
          (response.status === 404 ? TEXT.notFound : TEXT.loadError);
        throw new Error(message);
      }

      if (!payload?.character) {
        throw new Error(TEXT.notFound);
      }

      return payload.character as CharacterApiPayload;
    };

    const load = async () => {
      setPageLoading(true);
      setPageError(null);

      try {
        let rawCharacter: CharacterApiPayload | null = null;

        if (user) {
          try {
            const idToken = await user.getIdToken();
            rawCharacter = await fetchPrivateCharacter(idToken);
          } catch (privateError) {
            console.warn('Failed to load private character, falling back to public access.', privateError);
          }
        }

        if (!rawCharacter) {
          rawCharacter = await fetchPublicCharacter();
        }

        if (!rawCharacter) {
          throw new Error(TEXT.notFound);
        }

        const normalized = adaptCharacter(rawCharacter, characterId);

        if (!cancelled) {
          setCharacter(normalized);
          setThreadId(null);
          setMessages(
            normalized.greeting
              ? [
                  {
                    id: 'intro',
                    role: 'assistant',
                    content: normalized.greeting
                  }
                ]
              : []
          );
        }
      } catch (err) {
        if (!cancelled) {
          setCharacter(null);
          setPageError(err instanceof Error ? err.message : TEXT.loadError);
        }
      } finally {
        if (!cancelled) {
          setPageLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [characterId, user]);

  useEffect(() => {
    setHistoryLoaded(false);
  }, [characterId, user?.uid]);

  useEffect(() => {
    if (!user || !characterId || historyLoaded) {
      return;
    }

    let cancelled = false;

    const loadConversationHistory = async () => {
      try {
        const idToken = await user.getIdToken();
        const listResponse = await fetch(
          `/api/profile/conversations?limit=1&characterId=${encodeURIComponent(characterId)}`,
          {
            headers: {
              Authorization: `Bearer ${idToken}`
            }
          }
        );

        const listPayload = (await listResponse.json().catch(() => ({}))) as {
          conversations?: ConversationListItem[];
          error?: string;
        };

        if (!listResponse.ok) {
          throw new Error(
            (listPayload && typeof listPayload.error === 'string' && listPayload.error) ||
              TEXT.loadError
          );
        }

        const matchingConversation = listPayload.conversations?.[0] ?? null;

        if (!matchingConversation) {
          return;
        }

        const targetThreadId =
          matchingConversation.threadId && matchingConversation.threadId.trim()
            ? matchingConversation.threadId
            : matchingConversation.id;

        if (!targetThreadId) {
          return;
        }

        const detailResponse = await fetch(
          `/api/profile/conversations/${targetThreadId}?limit=100`,
          {
            headers: {
              Authorization: `Bearer ${idToken}`
            }
          }
        );

        const detailPayload = (await detailResponse.json().catch(() => ({}))) as {
          messages?: ConversationMessagePayload[];
          error?: string;
        };

        if (!detailResponse.ok) {
          throw new Error(
            (detailPayload && typeof detailPayload.error === 'string' && detailPayload.error) ||
              TEXT.loadError
          );
        }

        const normalisedHistory = normaliseMessages(
          (detailPayload.messages ?? []).map(item => ({
            id: item.id ?? `msg-${Date.now()}`,
            role: item.role === 'user' ? 'user' : 'assistant',
            content: item.content ?? ''
          }))
        );

        if (!cancelled) {
          setThreadId(targetThreadId);
          if (normalisedHistory.length) {
            setMessages(normalisedHistory);
          }
        }
      } catch (historyError) {
        console.warn('Failed to load conversation history', historyError);
      } finally {
        if (!cancelled) {
          setHistoryLoaded(true);
        }
      }
    };

    void loadConversationHistory();

    return () => {
      cancelled = true;
    };
  }, [characterId, historyLoaded, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();

    if (!trimmed || isLoading || !characterId) {
      return;
    }

    if (!user) {
      setError(TEXT.loginRequired);
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
      const idToken = await user.getIdToken();
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          message: trimmed,
          threadId,
          characterId
        })
      });

      const raw = await response.text();

      if (!response.ok) {
        let errorMessage = 'Assistant request failed.';
        try {
          const errorPayload = JSON.parse(raw) as { error?: string };
          if (response.status === 401) {
            errorMessage = errorPayload?.error ?? TEXT.sessionExpired;
          } else if (response.status === 429) {
            errorMessage = errorPayload?.error ?? TEXT.rateLimited;
          } else if (errorPayload?.error) {
            errorMessage = errorPayload.error;
          }
        } catch {
          // Fallback for non-JSON errors
        }
        throw new Error(errorMessage);
      }

      const data: {
        threadId: string;
        messages: ChatMessage[];
        reply: ChatMessage | null;
      } = raw ? JSON.parse(raw) : { threadId: '', messages: [], reply: null };

      setThreadId(data.threadId);

      if (data.messages?.length) {
        const cleaned = normaliseMessages(data.messages);
        setMessages(cleaned);
      } else if (data.reply) {
        setMessages(prev => normaliseMessages([...prev, data.reply]));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error.';
      setError(message);
      setMessages(prev => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'assistant', content: message }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStatusPanel = (label: string) => (
    <div className="chat-layout">
      <div className="chat-layout__header">{label}</div>
    </div>
  );

  if (pageLoading) {
    return (
      <AppShell sidebar={sidebar}>{renderStatusPanel('Loading character...')}</AppShell>
    );
  }

  if (pageError) {
    return (
      <AppShell sidebar={sidebar}>
        {renderStatusPanel(`Error: ${pageError}`)}
      </AppShell>
    );
  }

  if (!character) {
    return (
      <AppShell sidebar={sidebar}>
        {renderStatusPanel(TEXT.notFound)}
      </AppShell>
    );
  }

  const navActions = user ? (
    <>
      <Link href="/dashboard" className="btn btn--ghost">
        Dashboard
      </Link>
      <Link href="/character/create" className="btn btn--primary">
        Create new character
      </Link>
    </>
  ) : (
    <Link href={loginHref} className="btn btn--primary">
      로그인
    </Link>
  );

  return (
    <AppShell sidebar={sidebar}>
      <AppNav actions={navActions} />

      <div className="chat-layout">
        <div className="chat-layout__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Image
              src={character.avatar || DEFAULT_CHARACTER_AVATAR}
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
                {character.summary || '소개가 아직 작성되지 않았어요.'}
              </p>
            </div>
          </div>
        </div>

        {!user ? (
          <div
            style={{
              margin: '16px 0',
              padding: '16px 20px',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap'
            }}
          >
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {TEXT.loginRequired}
            </span>
            <Link href={loginHref} className="btn btn--primary">
              로그인하기
            </Link>
          </div>
        ) : null}

        <div className="chat-layout__messages" ref={scrollContainerRef}>
          {messages.map(message => (
            <div
              key={message.id}
              className="chat-message"
              style={{
                flexDirection: message.role === 'user' ? 'row-reverse' : 'row'
              }}
            >
              {message.role === 'assistant' ? (
                <Image
                  src={character.avatar || DEFAULT_CHARACTER_AVATAR}
                  alt={`${character.name} avatar`}
                  width={32}
                  height={32}
                  style={{ borderRadius: 12, marginTop: 4 }}
                />
              ) : (
                <div style={{ width: 32, height: 32 }} />
              )}
              <div
                className={`chat-message__bubble ${
                  message.role === 'user'
                    ? 'chat-message__bubble--user'
                    : 'chat-message__bubble--assistant'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {isLoading ? (
            <div className="chat-message">
              <div style={{ width: 32, height: 32 }} />
              <div className="chat-message__bubble chat-message__bubble--assistant">
                The assistant is thinking...
              </div>
            </div>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="chat-footer">
          <div className="chat-input">
            <textarea
              value={input}
              onChange={event => setInput(event.target.value)}
              placeholder={`Message ${character.name}...`}
              disabled={!user}
            />
            <button
              type="submit"
              disabled={!user || !input.trim() || isLoading}
              className="btn btn--primary"
              style={{ paddingInline: 24 }}
            >
              Send
            </button>
          </div>
          {error ? (
            <p style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--danger)' }}>{error}</p>
          ) : null}
        </form>
      </div>
    </AppShell>
  );
}
