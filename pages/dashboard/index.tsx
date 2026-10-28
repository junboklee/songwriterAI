import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { signOut, updateProfile } from 'firebase/auth';
import { RequireAuth } from '@/components/RequireAuth';
import CharacterEditorPanel from '@/components/CharacterEditorPanel';
import { DeleteAccountDialog, NicknameModal } from '@/components/dashboard/AccountDialogs';
import {
  MyCharactersSection,
  RecentChatsSection,
  ShowcaseSection,
  SpotlightSection
} from '@/components/dashboard/DashboardSections';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { useAuth } from '@/context/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardText } from '@/hooks/useDashboardText';
import { authedJson, errorMessage } from '@/lib/authedFetch';
import { buildConversationTitle } from '@/lib/conversationUtils';
import {
  buildSearchTarget,
  featuredCharacters,
  getTimestampValue,
  sortByMode,
  type CharacterCard,
  type CharacterSortMode,
  type ConversationListItem,
  type UserCharacter
} from '@/lib/dashboard/model';
import { auth } from '@/lib/firebase';

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const dashboardText = useDashboardText();
  const data = useDashboardData(user, dashboardText);
  const { myCharacters, publicCharacters, profile, recentChats, characterNames } = data;

  const [selectedCharacter, setSelectedCharacter] = useState<UserCharacter | null>(null);
  const [panelSubmitting, setPanelSubmitting] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [characterSort, setCharacterSort] = useState<CharacterSortMode>('popularity');

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [nicknameValue, setNicknameValue] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const customCharacters = myCharacters.data;

  const conversationUsage = useMemo(() => {
    const usage: Record<string, number> = {};
    recentChats.data.forEach(chat => {
      if (chat.characterId) {
        usage[chat.characterId] = (usage[chat.characterId] || 0) + chat.messageCount;
      }
    });
    return usage;
  }, [recentChats.data]);

  const sortedPublicCharacters = useMemo(
    () => sortByMode(publicCharacters.data, characterSort),
    [characterSort, publicCharacters.data]
  );

  const filteredCharacters = useMemo(() => {
    if (!normalizedSearch) {
      return customCharacters;
    }
    return customCharacters.filter(character =>
      buildSearchTarget(
        character.name,
        character.summary,
        character.instructions,
        character.greeting,
        character.longDescription,
        character.categories,
        character.gender
      ).includes(normalizedSearch)
    );
  }, [customCharacters, normalizedSearch]);

  const sortedCustomCharacters = useMemo(
    () =>
      sortByMode(
        filteredCharacters,
        characterSort,
        (a, b) =>
          (conversationUsage[b.id] ?? 0) - (conversationUsage[a.id] ?? 0) ||
          getTimestampValue(b.updatedAt) - getTimestampValue(a.updatedAt)
      ),
    [characterSort, conversationUsage, filteredCharacters]
  );

  const spotlightCharacters = useMemo<CharacterCard[]>(() => {
    const recentIds = profile.data?.profile.recentCharacterIds ?? [];
    const seen = new Set<string>();
    const derived: CharacterCard[] = [];

    recentIds.forEach((id, index) => {
      if (!id || seen.has(id)) {
        return;
      }
      seen.add(id);
      const style = `scene-card--${((index % 3) + 1).toString()}`;

      const custom = customCharacters.find(character => character.id === id);
      if (custom) {
        derived.push({
          id: custom.id,
          title: custom.name,
          creator: custom.categories[0] ?? dashboardText.sidebarProfileRole,
          description: custom.summary || dashboardText.summaryFallback,
          tag: custom.categories[0] ?? dashboardText.defaultTag,
          sample: custom.instructions || '',
          style,
          chatId: custom.id
        });
        return;
      }

      derived.push({
        id,
        title: characterNames[id] || `Character ${id.slice(0, 6)}`,
        creator: dashboardText.sidebarProfileRole,
        description: dashboardText.summaryFallback,
        tag: dashboardText.defaultTag,
        sample: '',
        style,
        chatId: id
      });
    });

    return derived.length ? derived.slice(0, featuredCharacters.length) : featuredCharacters;
  }, [customCharacters, profile.data, characterNames, dashboardText]);

  const filteredSpotlight = useMemo(() => {
    if (!normalizedSearch) {
      return spotlightCharacters;
    }
    return spotlightCharacters.filter(scene =>
      buildSearchTarget(scene.title, scene.creator, scene.description, scene.tag, scene.sample).includes(
        normalizedSearch
      )
    );
  }, [spotlightCharacters, normalizedSearch]);

  const filteredRecentChats = useMemo(() => {
    if (!normalizedSearch) {
      return recentChats.data;
    }
    return recentChats.data.filter(chat =>
      buildSearchTarget(
        buildConversationTitle(chat, characterNames),
        chat.lastMessagePreview,
        chat.characterId ? characterNames[chat.characterId] : ''
      ).includes(normalizedSearch)
    );
  }, [recentChats.data, normalizedSearch, characterNames]);

  const hasCustomCharacters = customCharacters.length > 0;
  const hasRecentChats = recentChats.data.length > 0;
  const noRecentSearchResults =
    normalizedSearch.length > 0 && hasRecentChats && filteredRecentChats.length === 0;
  const noCustomSearchResults =
    normalizedSearch.length > 0 && hasCustomCharacters && filteredCharacters.length === 0;

  const handleSearchInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setCharacterSort(event.target.value as CharacterSortMode);
  };

  // The profile menu closes itself on navigation (DashboardSidebar); the nickname dialog does here.
  useEffect(() => {
    setIsNicknameModalOpen(false);
    setNicknameError(null);
  }, [router.asPath, user]);

  const displayName =
    profile.data?.profile.displayName?.trim() ||
    user?.displayName ||
    // Without a nickname, greet by the part before @ rather than the whole address.
    user?.email?.split('@')[0] ||
    dashboardText.sidebarProfileRole;

  const profileEmail = profile.data?.profile.email || user?.email || '';

  const stats = profile.data?.stats ?? { conversationCount: 0, songCount: 0 };

  const welcomeTitle = dashboardText.welcome(displayName);
  const statusSummary = profile.data
    ? `${dashboardText.conversationsLabel}: ${stats.conversationCount.toLocaleString('ko-KR')} · ${
        dashboardText.songsLabel
      }: ${stats.songCount.toLocaleString('ko-KR')}`
    : profile.loading
    ? dashboardText.profileLoading
    : profile.error ?? '';

  const handleStartChat = (characterId: string) => {
    void router.push({
      pathname: '/chat',
      query: { characterId }
    });
  };

  const handleContinueChat = (threadId: string, characterId: string | null) => {
    void router.push({
      pathname: '/chat',
      query: {
        threadId,
        characterId: characterId ?? undefined
      }
    });
  };

  const handleDeleteRecentChat = (chat: ConversationListItem) => {
    if (window.confirm(dashboardText.deleteRecentChatConfirm)) {
      void data.deleteRecentChat(chat.threadId);
    }
  };

  const handleClearRecentChats = () => {
    if (window.confirm(dashboardText.clearRecentChatsConfirm)) {
      void data.clearRecentChats();
    }
  };

  const handleNicknameModalClose = useCallback(() => {
    if (nicknameSaving) {
      return;
    }
    setIsNicknameModalOpen(false);
    setNicknameError(null);
  }, [nicknameSaving]);

  const handleNicknameSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user || !auth.currentUser) {
      setNicknameError(dashboardText.nicknameError);
      return;
    }

    const trimmed = nicknameValue.trim();
    if (!trimmed) {
      setNicknameError(dashboardText.nicknameRequired);
      return;
    }

    setNicknameSaving(true);
    setNicknameError(null);

    try {
      if (auth.currentUser.displayName !== trimmed) {
        await updateProfile(auth.currentUser, { displayName: trimmed });
      }
      await data.saveDisplayName(trimmed);
      setNicknameValue(trimmed);
      setIsNicknameModalOpen(false);
    } catch (error) {
      setNicknameError(errorMessage(error, dashboardText.nicknameError));
    } finally {
      setNicknameSaving(false);
    }
  };

  const closeMobileNav = useCallback(() => setIsMobileNavOpen(false), [setIsMobileNavOpen]);
  const openMobileNav = useCallback(() => setIsMobileNavOpen(true), []);

  useEffect(() => {
    closeMobileNav();
  }, [router.asPath, closeMobileNav]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleResize = () => {
      if (window.innerWidth > 900) {
        closeMobileNav();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [closeMobileNav]);

  const handleDeleteAccount = async () => {
    if (!user) {
      myCharacters.setError(dashboardText.deleteAccountError);
      return;
    }

    setIsNicknameModalOpen(false);
    setIsDeleteConfirmOpen(false);
    setIsDeletingAccount(true);
    myCharacters.setError(null);

    try {
      await authedJson(user, '/api/profile/delete-account', dashboardText.deleteAccountError, {
        method: 'DELETE'
      });
      await signOut(auth);
      alert(dashboardText.deleteAccountSuccess ?? '계정이 삭제되었습니다.');
    } catch (error) {
      console.error('Account deletion failed', error);
      myCharacters.setError(errorMessage(error, dashboardText.deleteAccountError));
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleOpenDeleteConfirm = () => {
    setIsNicknameModalOpen(false);
    setIsDeleteConfirmOpen(true);
  };

  const handleCancelDeleteConfirm = () => {
    if (isDeletingAccount) {
      return;
    }
    setIsDeleteConfirmOpen(false);
  };

  const handleProfileNickname = () => {
    setNicknameError(null);
    setNicknameValue(displayName);
    setIsNicknameModalOpen(true);
  };

  const handleSignOutClick = async () => {
    setIsNicknameModalOpen(false);
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out failed', error);
    }
  };

  const handleEditCharacter = (characterId: string) => {
    const target = customCharacters.find(item => item.id === characterId);

    if (!target) {
      console.warn('character not found for edit', { characterId });
      return;
    }

    setPanelError(null);
    setSelectedCharacter(target);
  };

  const handleDeleteCharacter = async (characterId: string) => {
    setPanelError(null);
    if (await data.deleteCharacter(characterId)) {
      setSelectedCharacter(prev => (prev && prev.id === characterId ? null : prev));
    }
  };

  const handleCloseEditor = () => {
    setSelectedCharacter(null);
    setPanelError(null);
  };

  const handleSubmitEditor = async (payload: FormData) => {
    const characterId = payload.get('id');
    if (!user || typeof characterId !== 'string' || !characterId) {
      setPanelError(dashboardText.updateError);
      return;
    }

    setPanelSubmitting(true);
    setPanelError(null);

    try {
      await data.updateCharacter(characterId, payload);
      setSelectedCharacter(null);
    } catch (error) {
      setPanelError(errorMessage(error, dashboardText.updateError));
    } finally {
      setPanelSubmitting(false);
    }
  };

  return (
    <RequireAuth>
      {/* Hidden while the drawer is open: it sits above the drawer and would cover its top. */}
      {isMobileNavOpen ? null : (
        <button
          type="button"
          className="dashboard-mobile-toggle"
          aria-label="사이드바 열기"
          aria-controls="dashboard-sidebar"
          aria-expanded={isMobileNavOpen}
          onClick={openMobileNav}
        >
          <span />
          <span />
          <span />
        </button>
      )}
      <div className="dashboard-page">
        <DashboardSidebar
          text={dashboardText}
          isOpen={isMobileNavOpen}
          onClose={closeMobileNav}
          searchQuery={searchQuery}
          onSearchChange={handleSearchInputChange}
          recentChats={{
            loading: recentChats.loading,
            error: recentChats.error,
            hasAny: hasRecentChats,
            noSearchResults: noRecentSearchResults,
            items: filteredRecentChats,
            deletingIds: data.deletingRecentIds
          }}
          characterNames={characterNames}
          onContinueChat={handleContinueChat}
          profile={{
            displayName,
            email: profileEmail,
            isDeletingAccount,
            onNickname: handleProfileNickname,
            onSignOut: () => {
              void handleSignOutClick();
            },
            onDeleteAccount: handleOpenDeleteConfirm
          }}
        />
        <main className="dashboard-main">
          <header className="dashboard-main__header">
            <div className="dashboard-main__title">
              <h1>{welcomeTitle}</h1>
              <span className="dashboard-status">{statusSummary}</span>
            </div>
            <form className="dashboard-searchbar" onSubmit={handleSearchSubmit}>
              <input
                type="search"
                placeholder={dashboardText.searchPlaceholder}
                aria-label={dashboardText.searchPlaceholder}
                value={searchQuery}
                onChange={handleSearchInputChange}
              />
            </form>
          </header>

          <SpotlightSection text={dashboardText} scenes={filteredSpotlight} isSearching={Boolean(normalizedSearch)} />

          <ShowcaseSection
            text={dashboardText}
            characters={sortedPublicCharacters}
            loading={publicCharacters.loading}
            error={publicCharacters.error}
            sort={characterSort}
            onSortChange={handleSortChange}
            onStartChat={handleStartChat}
          />

          <RecentChatsSection
            text={dashboardText}
            chats={filteredRecentChats}
            characterNames={characterNames}
            loading={recentChats.loading}
            error={recentChats.error}
            hasAny={hasRecentChats}
            noSearchResults={noRecentSearchResults}
            deletingIds={data.deletingRecentIds}
            isClearing={data.isClearingRecentChats}
            onClearAll={handleClearRecentChats}
            onContinue={handleContinueChat}
            onDelete={handleDeleteRecentChat}
          />

          <MyCharactersSection
            text={dashboardText}
            characters={sortedCustomCharacters}
            loading={myCharacters.loading}
            error={myCharacters.error}
            hasAny={hasCustomCharacters}
            noSearchResults={noCustomSearchResults}
            pendingDeleteId={data.pendingDeleteId}
            panelSubmitting={panelSubmitting}
            onStartChat={handleStartChat}
            onEdit={handleEditCharacter}
            onDelete={characterId => {
              void handleDeleteCharacter(characterId);
            }}
          />
        </main>
      </div>
      {selectedCharacter ? (
        <CharacterEditorPanel
          key={selectedCharacter.id}
          character={{
            id: selectedCharacter.id,
            name: selectedCharacter.name,
            summary: selectedCharacter.summary,
            greeting: selectedCharacter.greeting,
            longDescription: selectedCharacter.longDescription,
            visibility: selectedCharacter.visibility,
            avatarUrl: selectedCharacter.avatarUrl,
            categories: selectedCharacter.categories,
            gender: selectedCharacter.gender
          }}
          onClose={handleCloseEditor}
          onSubmit={handleSubmitEditor}
          isSubmitting={panelSubmitting}
          errorMessage={panelError}
        />
      ) : null}
      {isNicknameModalOpen ? (
        <NicknameModal
          text={dashboardText}
          value={nicknameValue}
          error={nicknameError}
          saving={nicknameSaving}
          onChange={setNicknameValue}
          onClose={handleNicknameModalClose}
          onSubmit={handleNicknameSubmit}
        />
      ) : null}
      {isDeleteConfirmOpen ? (
        <DeleteAccountDialog
          text={dashboardText}
          deleting={isDeletingAccount}
          onCancel={handleCancelDeleteConfirm}
          onConfirm={() => {
            void handleDeleteAccount();
          }}
        />
      ) : null}
    </RequireAuth>
  );
}
