import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AppNav } from '@/components/AppNav';
import { AppShell } from '@/components/AppShell';
import { RequireAuth } from '@/components/RequireAuth';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatVideoPanel } from '@/components/chat/ChatVideoPanel';
import { CrisisHelpBanner } from '@/components/chat/CrisisHelpBanner';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/I18nContext';
import { useChatSession, type ChatReply } from '@/hooks/useChatSession';
import { useLyricsAutoSave } from '@/hooks/useLyricsAutoSave';
import { AI_BADGE, AI_SERVICE_NOTICE } from '@/lib/aiDisclosure';
import { getAssistantBubbleColor, isDayeonAssistant } from '@/lib/assistantBubbleColors';
import { looksLikeCrisis } from '@/lib/safety';

export default function ChatPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t: tChat } = useTranslation('chat');
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [input, setInput] = useState('');
  const [showCrisisHelp, setShowCrisisHelp] = useState(false);

  const requestedCharacterId = Array.isArray(router.query.characterId)
    ? router.query.characterId[0] ?? null
    : typeof router.query.characterId === 'string'
      ? router.query.characterId
      : null;

  // Auto-save needs the session's threadId, so the session reaches it through a ref.
  const replyHandlerRef = useRef<(reply: ChatReply) => void>();
  const session = useChatSession(user, requestedCharacterId, {
    onReply: reply => replyHandlerRef.current?.(reply)
  });
  const { character, characterId, isLoading, messages } = session;
  const autoSave = useLyricsAutoSave(session.threadId, characterId);
  replyHandlerRef.current = autoSave.handleReply;

  const assistantBubbleStyle = useMemo(() => {
    if (isDayeonAssistant(character.id, character.name)) {
      return undefined;
    }
    return {
      background: getAssistantBubbleColor(character.id),
      boxShadow: '0 38px 72px -34px rgba(5, 6, 11, 0.45)'
    };
  }, [character.id, character.name]);

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
        conversations={session.conversations}
        loading={session.conversationsLoading}
        error={session.conversationsError}
        resolveCharacterMeta={session.resolveCharacterMeta}
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
      router,
      session.conversations,
      session.conversationsError,
      session.conversationsLoading,
      session.resolveCharacterMeta,
      handleRolePromptSelect
    ]
  );

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = (text: string) => {
    if (looksLikeCrisis(text)) {
      setShowCrisisHelp(true);
    }
    setInput('');
    void session.send(text);
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
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>
                        {character.name}{' '}
                        <span className="ai-badge" title={AI_SERVICE_NOTICE}>
                          {AI_BADGE}
                        </span>
                      </p>
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
                  streamingText={session.streamingText}
                  typingLabel={tChat('typingIndicator.assistant')}
                />

                {showCrisisHelp ? <CrisisHelpBanner onClose={() => setShowCrisisHelp(false)} /> : null}
                <ChatComposer
                  ref={chatInputRef}
                  value={input}
                  onChange={setInput}
                  onSend={handleSend}
                  busy={isLoading}
                  autoSave={{ enabled: autoSave.enabled, onToggle: autoSave.toggle }}
                  quota={session.quota}
                  error={session.error}
                />
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
