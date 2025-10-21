import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { AppNav } from '@/components/AppNav';
import { RequireAuth } from '@/components/RequireAuth';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type CharacterProfile = {
  id: string;
  name: string;
  tag: string;
  avatar: string;
  greeting: string;
  description: string;
  availability: string;
};

const CHARACTER_PROFILES: Record<string, CharacterProfile> = {
  '1': {
    id: '1',
    name: 'Dayeon',
    tag: 'Empathy',
    avatar: '/avatars/dayeon.png',
    greeting: '대화를 시작해볼까요?',
    description: 'Empathetic storyteller for winding down after long days.',
    availability: 'Usually active at night'
  },
  '2': {
    id: '2',
    name: 'Junho',
    tag: 'Healing',
    avatar: '/avatars/junho.png',
    greeting: 'Let us take a deep breath together. How would you like to feel today?',
    description: 'Mindful coach helping you stay grounded and intentional.',
    availability: 'Morning conversations recommended'
  },
  '3': {
    id: '3',
    name: 'Jimin',
    tag: 'Romance',
    avatar: '/avatars/jimin.png',
    greeting: 'Ready for something exciting? I cannot wait to hear about your world.',
    description: 'Playful muse that keeps your romantic storylines energised.',
    availability: 'Always on for late-night chats'
  }
};

const QUICK_REPLIES = [
  'Give me a motivational boost for today.',
  'Roleplay as my supportive friend planning a weekend.',
  'Help me reflect on a difficult conversation I had.',
  'Brainstorm a poetic description of a rainy city.'
];

const RECENT_THREADS = [
  { id: '1', title: 'Evening reflection', time: '2h ago' },
  { id: '2', title: 'Morning gratitude', time: 'Today' },
  { id: '3', title: 'Poetry workshop', time: 'Yesterday' }
];

const PINNED_MOODS = [
  { label: 'Daily check-in', emoji: '🪄' },
  { label: 'Mindful reset', emoji: '🧘' },
  { label: 'Romantic RP', emoji: '💌' },
  { label: 'Creative flow', emoji: '🎨' }
];

const normaliseMessages = (items: ChatMessage[]) =>
  items
    .filter(item => (item.role === 'assistant' || item.role === 'user') && item.content)
    .map(item => ({ ...item, content: item.content.trim() }))
    .filter(item => item.content.length > 0);

export default function ChatPage() {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const characterId = useMemo(() => {
    const raw = Array.isArray(router.query.characterId)
      ? router.query.characterId[0]
      : router.query.characterId;
    return raw ?? '1';
  }, [router.query.characterId]);

  const character = CHARACTER_PROFILES[characterId] ?? CHARACTER_PROFILES['1'];

  const sidebar = useMemo(
    () => (
      <>
        <div>
          <p className="section-title">Active threads</p>
          <div className="sidebar-list" style={{ marginTop: 14 }}>
            {RECENT_THREADS.map(thread => (
              <button
                key={thread.id}
                type="button"
                className="sidebar-item"
                onClick={() =>
                  router.push({
                    pathname: '/chat',
                    query: { characterId: thread.id }
                  })
                }
              >
                <div className="sidebar-item__icon">💬</div>
                <div>
                  <p style={{ fontWeight: 600, margin: 0 }}>{thread.title}</p>
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      margin: '4px 0 0',
                      fontSize: '0.8rem'
                    }}
                  >
                    Updated {thread.time}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="section-title">Pinned moods</p>
          <div className="chip-list" style={{ marginTop: 16 }}>
            {PINNED_MOODS.map(mood => (
              <button
                key={mood.label}
                type="button"
                className="chip"
                onClick={() => setInput(mood.label)}
              >
                {mood.emoji} {mood.label}
              </button>
            ))}
          </div>
        </div>
        <div className="callout">
          Tip: messages are powered by your OpenAI Assistant. Pair the conversation with custom
          instructions, knowledge files, and function calling to unlock richer character behaviour.
        </div>
      </>
    ),
    [router]
  );

  useEffect(() => {
    setThreadId(null);
    setMessages([
      {
        id: 'intro',
        role: 'assistant',
        content: character.greeting
      }
    ]);
    setError(null);
  }, [character]);

  useEffect(() => {
    if (!scrollContainerRef.current) {
      return;
    }
    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
  }, [messages, isLoading]);

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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          threadId
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Assistant request failed.');
      }

      const data: {
        threadId: string;
        messages: ChatMessage[];
        reply: ChatMessage | null;
      } = await response.json();

      setThreadId(data.threadId);

      if (data.messages?.length) {
        setMessages(prev => {
          const intro = prev[0]?.id === 'intro' ? [prev[0]] : [];
          const cleaned = normaliseMessages(data.messages);
          return [...intro, ...cleaned];
        });
      } else if (data.reply) {
        setMessages(prev => {
          const intro = prev[0]?.id === 'intro' ? [prev[0]] : [];
          const history = prev.filter(item => item.id !== 'intro');
          const cleaned = normaliseMessages([...history, data.reply]);
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

  return (
    <RequireAuth>
      <AppShell sidebar={sidebar}>
        <AppNav
          actions={
            <>
              <Link href="/dashboard" className="btn btn--ghost">
                Discover
              </Link>
              <Link href="/character/create" className="btn btn--primary">
                Create character
              </Link>
            </>
          }
        />

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
            <div className="status-indicator">{character.availability}</div>
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
                    src={character.avatar}
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
            <div className="chip-list" style={{ marginBottom: QUICK_REPLIES.length ? 16 : 0 }}>
              {QUICK_REPLIES.map(reply => (
                <button
                  key={reply}
                  type="button"
                  className="chip"
                  onClick={() => setInput(reply)}
                >
                  {reply}
                </button>
              ))}
            </div>
            <div className="chat-input">
              <textarea
                value={input}
                onChange={event => setInput(event.target.value)}
                placeholder="Share a thought, start a roleplay, or ask for guidance..."
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
