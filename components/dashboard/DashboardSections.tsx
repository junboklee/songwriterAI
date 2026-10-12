import Image from 'next/image';
import Link from 'next/link';
import { useState, type ChangeEvent, type ReactNode } from 'react';

import type { DashboardText } from '@/hooks/useDashboardText';
import { buildConversationTitle } from '@/lib/conversationUtils';
import {
  formatConversationUpdatedAt,
  formatUpdatedAt,
  truncateText,
  visibilityLabels,
  type CharacterCard,
  type CharacterSortMode,
  type ConversationListItem,
  type UserCharacter
} from '@/lib/dashboard/model';

const MessageCard = ({ children }: { children: ReactNode }) => (
  <div className="dashboard-card">
    <p className="dashboard-card__meta">{children}</p>
  </div>
);

// Status precedence shared by every list section: loading > error > empty > no search hits.
function renderListState(state: {
  loading: boolean;
  loadingText: string;
  error: string | null;
  isEmpty: boolean;
  emptyText: string;
  noSearchResults?: boolean;
  noSearchResultsText?: string;
}) {
  if (state.loading) return <MessageCard>{state.loadingText}</MessageCard>;
  if (state.error) return <MessageCard>{state.error}</MessageCard>;
  if (state.isEmpty) return <MessageCard>{state.emptyText}</MessageCard>;
  if (state.noSearchResults) return <MessageCard>{state.noSearchResultsText}</MessageCard>;
  return null;
}

const DAYEON_SOCIAL_LINKS = [
  { href: 'https://www.youtube.com/@yeonverse-m1k', icon: '/bottons/youtube-play.png', label: 'YouTube' },
  { href: 'https://instagram.com/yeonversestudio', icon: '/bottons/insta_01.png', label: 'Instagram' },
  { href: 'https://tiktok.com/@yeonverse_studio', icon: '/bottons/tt_04.png', label: 'TikTok' }
];

export function SpotlightSection({
  text,
  scenes,
  isSearching
}: {
  text: DashboardText;
  scenes: CharacterCard[];
  isSearching: boolean;
}) {
  return (
    <section className="dashboard-section">
      <div className="dashboard-section__header">
        <h2>{text.todaysSpotlight}</h2>
      </div>
      <div className="dashboard-grid">
        {scenes.length === 0 ? (
          <MessageCard>{isSearching ? text.searchNoResults : text.charactersEmpty}</MessageCard>
        ) : (
          scenes.map(scene => (
            <div key={scene.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link
                href={{ pathname: '/chat', query: { characterId: scene.chatId } }}
                className={`scene-card ${scene.style}`}
              >
                <div className="scene-card__content">
                  <div className="scene-card__tag">{scene.tag}</div>
                  <h3 className="scene-card__title">{scene.title}</h3>
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)' }}>{scene.creator}</span>
                  <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)' }}>
                    {scene.description}
                  </p>
                </div>
              </Link>
              {scene.title === 'Dayeon' && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-around',
                    alignItems: 'center',
                    padding: '10px 0',
                    gap: '12px',
                    width: '100%',
                    maxWidth: '280px',
                    margin: '0 auto'
                  }}
                >
                  {DAYEON_SOCIAL_LINKS.map(link => (
                    <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer">
                      <Image src={link.icon} alt={link.label} width={32} height={32} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export function ShowcaseSection({
  text,
  characters,
  loading,
  error,
  sort,
  onSortChange,
  onStartChat
}: {
  text: DashboardText;
  characters: UserCharacter[];
  loading: boolean;
  error: string | null;
  sort: CharacterSortMode;
  onSortChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onStartChat: (characterId: string) => void;
}) {
  const listState = renderListState({
    loading,
    loadingText: text.charactersLoading,
    error,
    isEmpty: characters.length === 0,
    emptyText: text.showcaseEmpty
  });

  return (
    <section className="dashboard-section">
      <div className="dashboard-section__header">
        <div>
          <h2>{text.showcaseTitle}</h2>
          <p className="dashboard-section__subtitle">{text.showcaseSubtitle}</p>
        </div>
        <div className="dashboard-section__controls">
          <label htmlFor="character-sort" className="sr-only">
            {text.sortLabel}
          </label>
          <select id="character-sort" className="dashboard-section__select" value={sort} onChange={onSortChange}>
            <option value="popularity">{text.sortPopularity}</option>
            <option value="recent">{text.sortRecent}</option>
            <option value="gender">{text.sortGender}</option>
          </select>
          <Link href="/explore" className="btn btn--ghost">
            {text.showcaseViewAll}
          </Link>
        </div>
      </div>
      <div className="dashboard-grid">
        {listState ??
          characters.map(character => {
            const summaryText = character.summary ? truncateText(character.summary, 110) : text.summaryFallback;
            const detailSource = character.longDescription || character.greeting || character.instructions || null;
            const detailText = detailSource ? truncateText(detailSource, 140) : text.instructionsFallback;

            return (
              <div key={character.id} className="dashboard-card">
                {character.avatarUrl ? (
                  <Image
                    src={character.avatarUrl}
                    alt={`${character.name} avatar`}
                    width={60}
                    height={60}
                    style={{ borderRadius: '50%', objectFit: 'cover', marginBottom: '12px' }}
                  />
                ) : null}
                <h3 className="dashboard-card__title">{character.name}</h3>
                <p className="dashboard-card__meta">{summaryText}</p>
                <p className="dashboard-card__meta">{detailText}</p>
                <div className="dashboard-card__actions">
                  <button
                    type="button"
                    className="dashboard-card__button dashboard-card__button--primary"
                    onClick={() => onStartChat(character.id)}
                  >
                    {text.startChat}
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </section>
  );
}

export function RecentChatsSection({
  text,
  chats,
  characterNames,
  loading,
  error,
  hasAny,
  noSearchResults,
  deletingIds,
  isClearing,
  onClearAll,
  onContinue,
  onDelete
}: {
  text: DashboardText;
  chats: ConversationListItem[];
  characterNames: Record<string, string>;
  loading: boolean;
  error: string | null;
  hasAny: boolean;
  noSearchResults: boolean;
  deletingIds: Record<string, boolean>;
  isClearing: boolean;
  onClearAll: () => void;
  onContinue: (threadId: string, characterId: string | null) => void;
  onDelete: (chat: ConversationListItem) => void;
}) {
  const listState = renderListState({
    loading,
    loadingText: text.loadingIndicator,
    error,
    isEmpty: !hasAny,
    emptyText: text.recentChatsEmpty,
    noSearchResults,
    noSearchResultsText: text.searchNoResults
  });

  return (
    <section className="dashboard-section">
      <div className="dashboard-section__header">
        <h2>{text.recentChatsTitle}</h2>
        {hasAny ? (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onClearAll}
            disabled={isClearing || loading || Object.keys(deletingIds).length > 0}
          >
            {isClearing ? text.clearingRecentChats : text.clearRecentChats}
          </button>
        ) : null}
      </div>
      <div className="dashboard-grid">
        {listState ??
          chats.map(chat => {
            const updated = formatConversationUpdatedAt(chat.updatedAt);
            const isDeleting = Boolean(deletingIds[chat.threadId]);
            return (
              <div key={chat.id} className="dashboard-card">
                <h3 className="dashboard-card__title">{buildConversationTitle(chat, characterNames)}</h3>
                <p className="dashboard-card__meta">{chat.lastMessagePreview}</p>
                <div className="dashboard-card__stats">
                  <span>{text.recentChatsCount(chat.messageCount)}</span>
                  <span>{updated || text.updatedUnknown}</span>
                </div>
                <div className="dashboard-card__actions">
                  <button
                    type="button"
                    className="dashboard-card__button dashboard-card__button--primary"
                    onClick={() => onContinue(chat.threadId, chat.characterId)}
                    disabled={isDeleting}
                  >
                    {text.continueChat}
                  </button>
                  <button
                    type="button"
                    className="dashboard-card__button dashboard-card__button--danger"
                    onClick={() => onDelete(chat)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? text.deletingRecentChat : text.deleteRecentChat}
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </section>
  );
}

export function MyCharactersSection({
  text,
  characters,
  loading,
  error,
  hasAny,
  noSearchResults,
  pendingDeleteId,
  panelSubmitting,
  onStartChat,
  onEdit,
  onDelete
}: {
  text: DashboardText;
  characters: UserCharacter[];
  loading: boolean;
  error: string | null;
  hasAny: boolean;
  noSearchResults: boolean;
  pendingDeleteId: string | null;
  panelSubmitting: boolean;
  onStartChat: (characterId: string) => void;
  onEdit: (characterId: string) => void;
  onDelete: (characterId: string) => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const listState = renderListState({
    loading,
    loadingText: text.charactersLoading,
    error,
    isEmpty: !hasAny,
    emptyText: text.charactersEmpty,
    noSearchResults,
    noSearchResultsText: text.searchNoResults
  });

  return (
    <section className="dashboard-section">
      <div className="dashboard-section__header">
        <h2>{text.customCharactersTitle}</h2>
        <span className="section-link" />
      </div>
      <div className="dashboard-grid">
        {listState ??
          characters.map(character => {
            const summaryText = character.summary ? truncateText(character.summary, 110) : text.summaryFallback;
            const isDeleting = pendingDeleteId === character.id;

            return (
              <div key={character.id} className="dashboard-card">
                {character.avatarUrl && (
                  <Image
                    src={character.avatarUrl}
                    alt={`${character.name} avatar`}
                    width={60}
                    height={60}
                    style={{ borderRadius: '50%', objectFit: 'cover', marginBottom: '12px' }}
                  />
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <h3 className="dashboard-card__title">{character.name}</h3>
                  {character.visibility === 'unlisted' && (
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/chat?characterId=${character.id}`;
                        navigator.clipboard.writeText(url);
                        setCopiedId(character.id);
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                      className="btn btn--ghost"
                      style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '8px', minWidth: '60px' }}
                    >
                      {copiedId === character.id ? text.copyLinkSuccess : `🔗 ${text.copyLink}`}
                    </button>
                  )}
                </div>
                <p className="dashboard-card__meta">{summaryText}</p>
                <div className="dashboard-card__stats">
                  <span>
                    {text.visibilityLabel}: {visibilityLabels[character.visibility]}
                  </span>
                  <span>
                    {text.lastUpdatedLabel}: {formatUpdatedAt(character.updatedAt, text.updatedUnknown)}
                  </span>
                </div>
                <div className="dashboard-card__actions">
                  <button
                    type="button"
                    className="dashboard-card__button dashboard-card__button--primary"
                    onClick={() => onStartChat(character.id)}
                    disabled={panelSubmitting || isDeleting}
                  >
                    {text.startChat}
                  </button>
                  <button
                    type="button"
                    className="dashboard-card__button"
                    onClick={() => onEdit(character.id)}
                    disabled={panelSubmitting || isDeleting}
                  >
                    {text.edit}
                  </button>
                  <button
                    type="button"
                    className="dashboard-card__button dashboard-card__button--danger"
                    onClick={() => onDelete(character.id)}
                    disabled={isDeleting || panelSubmitting}
                  >
                    {isDeleting ? text.deleting : text.delete}
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </section>
  );
}
