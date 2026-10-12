import Image from 'next/image';

import { MainSidebar } from '@/components/MainSidebar';
import {
  ROLEPLAY_PROMPTS,
  TEXT,
  type CharacterMeta,
  type ConversationSummary
} from '@/lib/chat/model';

type ChatSidebarProps = {
  conversations: ConversationSummary[];
  loading: boolean;
  error: string | null;
  resolveCharacterMeta: (id?: string | null) => CharacterMeta | null;
  onSelectConversation: (conversation: ConversationSummary) => void;
  onSelectPrompt: (prompt: string) => void;
};

const secondaryTextStyle = {
  margin: '4px 0 0',
  color: 'var(--text-secondary)',
  fontSize: '0.8rem'
} as const;

function StatusItem({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="sidebar-item">
      <div className="sidebar-item__icon">{icon}</div>
      <div>
        <p style={{ margin: 0, fontWeight: 600 }}>{title}</p>
        <p style={secondaryTextStyle}>{description}</p>
      </div>
    </div>
  );
}

export function ChatSidebar({
  conversations,
  loading,
  error,
  resolveCharacterMeta,
  onSelectConversation,
  onSelectPrompt
}: ChatSidebarProps) {
  const recentConversations = conversations.slice(0, 2);

  return (
    <MainSidebar active="chat">
      <div>
        <p className="section-title">{TEXT.sidebarTitle}</p>
        <div className="sidebar-list" style={{ marginTop: 14 }}>
          {loading ? (
            <StatusItem icon="⏳" title={TEXT.loadingTitle} description={TEXT.loadingDescription} />
          ) : null}

          {!loading && error ? <StatusItem icon="⚠️" title={TEXT.errorTitle} description={error} /> : null}

          {!loading && !error && conversations.length === 0 ? (
            <StatusItem icon="💬" title={TEXT.emptyTitle} description={TEXT.emptyDescription} />
          ) : null}

          {!loading && !error
            ? recentConversations.map(conversation => {
                const conversationCharacter = resolveCharacterMeta(conversation.characterId);

                return (
                  <button
                    key={conversation.threadId}
                    type="button"
                    className="sidebar-item"
                    onClick={() => onSelectConversation(conversation)}
                  >
                    {conversationCharacter ? (
                      <Image
                        src={conversationCharacter.avatar}
                        alt={`${conversationCharacter.name} avatar`}
                        width={36}
                        height={36}
                        style={{ borderRadius: 12, objectFit: 'cover' }}
                      />
                    ) : (
                      <span className="sidebar-item__icon">💠</span>
                    )}
                    <div>
                      <p style={{ fontWeight: 600, margin: 0 }}>
                        {conversationCharacter?.name ||
                          conversation.title ||
                          `Thread ${conversation.threadId.slice(0, 6)}`}
                      </p>
                      <p style={secondaryTextStyle}>
                        {conversation.lastMessagePreview ||
                          conversationCharacter?.description ||
                          TEXT.emptyPreview}
                      </p>
                    </div>
                  </button>
                );
              })
            : null}
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <p className="section-title">{TEXT.pinnedTitle}</p>
        <div className="chip-list" style={{ marginTop: 16 }}>
          {ROLEPLAY_PROMPTS.map(prompt => (
            <button
              key={prompt.label}
              type="button"
              className="chip chip--button"
              onClick={() => onSelectPrompt(prompt.prompt)}
            >
              {prompt.emoji} {prompt.label}
            </button>
          ))}
        </div>
      </div>
    </MainSidebar>
  );
}
