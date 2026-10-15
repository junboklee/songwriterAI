import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';

import { AppShell } from '@/components/AppShell';
import { AppNav } from '@/components/AppNav';
import { MainSidebar } from '@/components/MainSidebar';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { useAuth } from '@/context/AuthContext';
import {
  CHARACTER_PAGE_TEXT as TEXT,
  useCharacterConversation,
  useCharacterProfile,
  type CharacterPageProfile
} from '@/hooks/useCharacterPage';
import { getAssistantBubbleColor, isDayeonAssistant } from '@/lib/assistantBubbleColors';
import { normaliseMessages, type ChatMessage } from '@/lib/chat/model';
import { ChatRequestError, sendChatMessage, type ChatApiResult } from '@/lib/chatClient';
import { DEFAULT_CHARACTER_AVATAR } from '@/lib/constants';

export default function CharacterChatPage() {
  const router = useRouter();
  const { user } = useAuth();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const characterId = useMemo(() => {
    const raw = Array.isArray(router.query.id) ? router.query.id[0] : router.query.id;
    return raw ?? null;
  }, [router.query.id]);

  const handleCharacterLoaded = useCallback((loaded: CharacterPageProfile) => {
    setThreadId(null);
    setMessages(loaded.greeting ? [{ id: 'intro', role: 'assistant', content: loaded.greeting }] : []);
  }, []);
  const { character, loading: pageLoading, error: pageError } = useCharacterProfile(
    characterId,
    user,
    handleCharacterLoaded
  );

  useCharacterConversation(characterId, user, (restoredThreadId, history) => {
    setThreadId(restoredThreadId);
    if (history.length) {
      setMessages(history);
    }
  });

  const assistantBubbleStyle = useMemo(() => {
    if (!character || isDayeonAssistant(character.id, character.name)) {
      return undefined;
    }
    return {
      background: getAssistantBubbleColor(character.id),
      boxShadow: '0 38px 72px -34px rgba(5, 6, 11, 0.45)'
    };
  }, [character]);

  const sidebar = useMemo(() => <MainSidebar active="chat" />, []);
  const loginHref = useMemo(() => {
    const target = router.asPath || (characterId ? `/character/${characterId}` : '/character');
    return `/auth/login?redirect=${encodeURIComponent(target)}`;
  }, [characterId, router.asPath]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

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

    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content: trimmed }]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const idToken = await user.getIdToken();
      let data: ChatApiResult;
      try {
        data = await sendChatMessage({ idToken, message: trimmed, threadId, characterId, onDelta: setStreamingText });
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

      if (data.messages?.length) {
        setMessages(normaliseMessages(data.messages));
      } else if (data.reply) {
        const replyMessage = data.reply;
        setMessages(prev => normaliseMessages([...prev, replyMessage]));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error.';
      setError(message);
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: message }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStatusPanel = (label: string) => (
    <AppShell sidebar={sidebar}>
      <div className="chat-layout">
        <div className="chat-layout__header">{label}</div>
      </div>
    </AppShell>
  );

  if (pageLoading) {
    return renderStatusPanel('캐릭터를 불러오는 중...');
  }
  if (pageError) {
    return renderStatusPanel(pageError);
  }
  if (!character) {
    return renderStatusPanel(TEXT.notFound);
  }

  const navActions = user ? (
    <>
      <Link href="/dashboard" className="btn btn--ghost">
        대시보드
      </Link>
      <Link href="/character/create" className="btn btn--primary">
        캐릭터 생성
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
              <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
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
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{TEXT.loginRequired}</span>
            <Link href={loginHref} className="btn btn--primary">
              로그인하기
            </Link>
          </div>
        ) : null}

        <ChatMessageList
          ref={scrollContainerRef}
          messages={messages}
          avatar={character.avatar || DEFAULT_CHARACTER_AVATAR}
          characterName={character.name}
          assistantBubbleStyle={assistantBubbleStyle}
          isLoading={isLoading}
          streamingText={streamingText}
          typingLabel="응답 작성 중"
        />

        <form onSubmit={handleSubmit} className="chat-footer">
          <div className="chat-input">
            <textarea
              value={input}
              onChange={event => setInput(event.target.value)}
              placeholder={`${character.name}에게 메시지 보내기...`}
              disabled={!user}
            />
            <button
              type="submit"
              disabled={!user || !input.trim() || isLoading}
              className="btn btn--primary"
              style={{ paddingInline: 24 }}
            >
              보내기
            </button>
          </div>
          {error ? <p style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--danger)' }}>{error}</p> : null}
        </form>
      </div>
    </AppShell>
  );
}
