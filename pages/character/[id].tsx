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
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/context/AuthContext';

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

const TEXT = {
  sessionExpired: '세션이 만료되었습니다. 다시 로그인해 주세요.',
  rateLimited:
    '요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.'
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

  const characterId = useMemo(() => {
    const raw = Array.isArray(router.query.id) ? router.query.id[0] : router.query.id;
    return raw ?? null;
  }, [router.query.id]);

  useEffect(() => {
    if (!scrollContainerRef.current) {
      return;
    }
    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    if (!user || !characterId) {
      setPageLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setPageLoading(true);
      setPageError(null);

      try {
        const idToken = await user.getIdToken();
        const response = await fetch(`/api/profile/characters/${characterId}`, {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        });

        const payload = await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to fetch character data.');
        }

        const fetchedCharacter = payload.character as CharacterProfile;
        setCharacter(fetchedCharacter);
        setMessages([
          {
            id: 'intro',
            role: 'assistant',
            content: fetchedCharacter.greeting
          }
        ]);
      } catch (err) {
        if (!cancelled) {
          setPageError(err instanceof Error ? err.message : 'An unknown error occurred.');
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();

    if (!trimmed || isLoading || !characterId) {
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

  if (pageLoading) {
    return (
      <RequireAuth>
        <AppShell sidebar={<MainSidebar active="chat" />}>
          <div className="chat-layout">
            <div className="chat-layout__header">Loading character...</div>
          </div>
        </AppShell>
      </RequireAuth>
    );
  }

  if (pageError) {
    return (
      <RequireAuth>
        <AppShell sidebar={<MainSidebar active="chat" />}>
          <div className="chat-layout">
            <div className="chat-layout__header">Error: {pageError}</div>
          </div>
        </AppShell>
      </RequireAuth>
    );
  }

  if (!character) {
    return (
      <RequireAuth>
        <AppShell sidebar={<MainSidebar active="chat" />}>
          <div className="chat-layout">
            <div className="chat-layout__header">Character not found.</div>
          </div>
        </AppShell>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <AppShell sidebar={<MainSidebar active="chat" />}>
        <AppNav
          actions={
            <>
              <Link href="/dashboard" className="btn btn--ghost">
                Dashboard
              </Link>
              <Link href="/character/create" className="btn btn--primary">
                Create new character
              </Link>
            </>
          }
        />

        <div className="chat-layout">
          <div className="chat-layout__header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Image
                src={character.avatar || '/avatars/jimin.png'}
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
                  {character.summary}
                </p>
              </div>
            </div>
          </div>

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
                    src={character.avatar || '/avatars/jimin.png'}
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
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
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
    </RequireAuth>
  );
}
