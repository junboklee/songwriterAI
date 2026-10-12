import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';

import { useAuth } from '@/context/AuthContext';
import type { DashboardText } from '@/hooks/useDashboardText';
import { buildConversationTitle } from '@/lib/conversationUtils';
import { formatConversationUpdatedAt, type ConversationListItem } from '@/lib/dashboard/model';

type ProfileMenuProps = {
  text: DashboardText;
  displayName: string;
  email: string;
  isDeletingAccount: boolean;
  onNickname: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
};

// Profile button with a pop-up menu; closes on outside click, navigation or user change.
function ProfileMenu({
  text,
  displayName,
  email,
  isDeletingAccount,
  onNickname,
  onSignOut,
  onDeleteAccount
}: ProfileMenuProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [router.asPath, user]);

  const runAndClose = (action: () => void) => () => {
    setIsOpen(false);
    action();
  };

  return (
    <div className="dashboard-sidebar__profile" ref={menuRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={text.profileMenuLabel}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          width: '100%',
          padding: '12px 16px',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.12)',
          background: isOpen ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.08)',
          color: 'inherit',
          cursor: 'pointer',
          transition: 'background 0.2s ease'
        }}
      >
        <div style={{ textAlign: 'left' }}>
          <strong style={{ fontSize: '0.9rem' }}>{displayName}</strong>
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
            {email || text.sidebarProfileRole}
          </p>
        </div>
        <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.65)' }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            bottom: '115%',
            display: 'grid',
            gap: 8,
            minWidth: 180,
            padding: 12,
            borderRadius: 12,
            background: 'rgba(12,12,12,0.95)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
            backdropFilter: 'blur(12px)',
            zIndex: 20
          }}
        >
          <button
            type="button"
            className="btn btn--ghost"
            onClick={runAndClose(onNickname)}
            style={{ justifyContent: 'flex-start' }}
          >
            {text.profileMenuNickname}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={runAndClose(onSignOut)}
            style={{ justifyContent: 'center' }}
          >
            {text.profileMenuSignOut}
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={runAndClose(onDeleteAccount)}
            disabled={isDeletingAccount}
            style={{ justifyContent: 'center' }}
          >
            {text.profileMenuDeleteAccount}
          </button>
        </div>
      ) : null}
    </div>
  );
}

type DashboardSidebarProps = {
  text: DashboardText;
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  recentChats: {
    loading: boolean;
    error: string | null;
    hasAny: boolean;
    noSearchResults: boolean;
    items: ConversationListItem[];
    deletingIds: Record<string, boolean>;
  };
  characterNames: Record<string, string>;
  onContinueChat: (threadId: string, characterId: string | null) => void;
  profile: Omit<ProfileMenuProps, 'text'>;
};

export function DashboardSidebar({
  text,
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  recentChats,
  characterNames,
  onContinueChat,
  profile
}: DashboardSidebarProps) {
  return (
    <>
      <aside id="dashboard-sidebar" className={`dashboard-sidebar${isOpen ? ' dashboard-sidebar--open' : ''}`}>
        <div className="dashboard-sidebar__brand">Nova Singer AI</div>

        <div className="dashboard-sidebar__create">
          <Link href="/character/create" onClick={onClose}>
            {text.visitCreate}
            <span>＋</span>
          </Link>
        </div>

        <nav className="dashboard-sidebar__nav">
          <Link
            href="/dashboard"
            className="dashboard-sidebar__nav-item dashboard-sidebar__nav-item--active"
            onClick={onClose}
          >
            <span>{text.navDashboard}</span>
          </Link>
          <Link href="/history" className="dashboard-sidebar__nav-item" onClick={onClose}>
            <span>{text.navHistory}</span>
          </Link>
          <Link href="/suno" className="dashboard-sidebar__nav-item" onClick={onClose}>
            <span>{text.navSuno}</span>
          </Link>
        </nav>

        <div className="dashboard-sidebar__search">
          <input
            type="search"
            placeholder={text.searchPlaceholder}
            aria-label={text.searchPlaceholder}
            value={searchQuery}
            onChange={onSearchChange}
          />
        </div>

        <div className="dashboard-sidebar__recent">
          <h3>{text.sidebarRecentTitle}</h3>
          <div className="dashboard-sidebar__recent-list">
            {recentChats.loading ? (
              <div className="dashboard-sidebar__recent-item">{text.loadingIndicator}</div>
            ) : recentChats.error ? (
              <div className="dashboard-sidebar__recent-item">{recentChats.error}</div>
            ) : !recentChats.hasAny ? (
              <div className="dashboard-sidebar__recent-item">{text.sidebarEmptyRecent}</div>
            ) : recentChats.noSearchResults ? (
              <div className="dashboard-sidebar__recent-item">{text.searchNoResults}</div>
            ) : (
              recentChats.items.map(chat => {
                const updated = formatConversationUpdatedAt(chat.updatedAt);
                return (
                  <button
                    key={chat.id}
                    type="button"
                    className="dashboard-sidebar__recent-item"
                    onClick={() => {
                      onClose();
                      onContinueChat(chat.threadId, chat.characterId);
                    }}
                    disabled={Boolean(recentChats.deletingIds[chat.threadId])}
                  >
                    <span>{buildConversationTitle(chat, characterNames)}</span>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}>
                      {updated || text.noMessagesYet}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <ProfileMenu text={text} {...profile} />
      </aside>
      <button
        type="button"
        className={`dashboard-sidebar__backdrop${isOpen ? ' dashboard-sidebar__backdrop--visible' : ''}`}
        aria-label="사이드바 닫기"
        onClick={onClose}
      />
    </>
  );
}
