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
import { useDashboardText } from '@/hooks/useDashboardText';
import { buildConversationTitle } from '@/lib/conversationUtils';
import {
  GENDER_ORDER,
  adaptCharacter,
  adaptConversation,
  buildSearchTarget,
  featuredCharacters,
  getTimestampValue,
  sortCharacters,
  type CharacterApiItem,
  type CharacterCard,
  type CharacterSortMode,
  type ConversationApiItem,
  type ConversationListItem,
  type ProfileResponse,
  type UserCharacter
} from '@/lib/dashboard/model';
import { DEFAULT_CHARACTER_NAMES } from '@/lib/defaultCharacterNames';
import { auth } from '@/lib/firebase';

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const dashboardText = useDashboardText();

  const [customCharacters, setCustomCharacters] = useState<UserCharacter[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<UserCharacter | null>(null);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [publicCharacters, setPublicCharacters] = useState<UserCharacter[]>([]);
  const [isLoadingPublicCharacters, setIsLoadingPublicCharacters] = useState(true);
  const [publicCharactersError, setPublicCharactersError] = useState<string | null>(null);
  const [panelSubmitting, setPanelSubmitting] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [characterSort, setCharacterSort] = useState<CharacterSortMode>('popularity');

  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [recentChats, setRecentChats] = useState<ConversationListItem[]>([]);
  const [isLoadingRecentChats, setIsLoadingRecentChats] = useState(true);
  const [recentChatsError, setRecentChatsError] = useState<string | null>(null);
  const [characterNames, setCharacterNames] = useState<Record<string, string>>({
    ...DEFAULT_CHARACTER_NAMES
  });
  const [deletingRecentIds, setDeletingRecentIds] = useState<Record<string, boolean>>({});
  const [isClearingRecentChats, setIsClearingRecentChats] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [nicknameValue, setNicknameValue] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const conversationUsage = useMemo(() => {
    const usage: Record<string, number> = {};
    recentChats.forEach(chat => {
      if (!chat.characterId) {
        return;
      }
      const count = typeof chat.messageCount === 'number' ? chat.messageCount : 0;
      usage[chat.characterId] = (usage[chat.characterId] || 0) + count;
    });
    return usage;
  }, [recentChats]);

  const hasCustomCharacters = customCharacters.length > 0;
  const hasPublicCharacters = publicCharacters.length > 0;
  const sortedPublicCharacters = useMemo(() => {
    if (!publicCharacters.length) {
      return [];
    }

    const base = [...publicCharacters];
    switch (characterSort) {
      case 'gender':
        return base.sort((a, b) => {
          const orderDiff = GENDER_ORDER[a.gender] - GENDER_ORDER[b.gender];
          if (orderDiff !== 0) {
            return orderDiff;
          }
          return a.name.localeCompare(b.name);
        });
      case 'recent':
        return base.sort(
          (a, b) => getTimestampValue(b.updatedAt) - getTimestampValue(a.updatedAt)
        );
      case 'popularity':
      default:
        // The explore API already returns characters ordered by likes and chats.
        return base;
    }
  }, [characterSort, publicCharacters]);
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

  const sortedCustomCharacters = useMemo(() => {
    const base = [...filteredCharacters];
    switch (characterSort) {
      case 'gender':
        return base.sort((a, b) => {
          const orderDiff = GENDER_ORDER[a.gender] - GENDER_ORDER[b.gender];
          if (orderDiff !== 0) {
            return orderDiff;
          }
          return a.name.localeCompare(b.name);
        });
      case 'recent':
        return base.sort(
          (a, b) => getTimestampValue(b.updatedAt) - getTimestampValue(a.updatedAt)
        );
      case 'popularity':
      default:
        return base.sort((a, b) => {
          const usageDiff =
            (conversationUsage[b.id] ?? 0) - (conversationUsage[a.id] ?? 0);
          if (usageDiff !== 0) {
            return usageDiff;
          }
          return getTimestampValue(b.updatedAt) - getTimestampValue(a.updatedAt);
        });
    }
  }, [characterSort, conversationUsage, filteredCharacters]);

  useEffect(() => {
    let cancelled = false;

    const fetchCharacters = async () => {
      if (!user) {
        if (!cancelled) {
          setCustomCharacters([]);
          setIsLoadingCharacters(false);
          setCharacterNames({ ...DEFAULT_CHARACTER_NAMES });
        }
        return;
      }

      if (!cancelled) {
        setIsLoadingCharacters(true);
        setLoadError(null);
      }

      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/profile/characters?limit=20', {
          headers: { Authorization: `Bearer ${idToken}` }
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload) {
          throw new Error(
            payload && typeof payload.error === 'string'
              ? payload.error
              : dashboardText.charactersLoadError
          );
        }

        const items: CharacterApiItem[] = Array.isArray(payload.characters)
          ? (payload.characters as CharacterApiItem[])
          : [];
        if (!cancelled) {
          const adapted = items.map(adaptCharacter);
          setCustomCharacters(sortCharacters(adapted));
          setCharacterNames(prev => {
            const next = { ...prev };
            adapted.forEach(character => {
              if (character.id && character.name) {
                next[character.id] = character.name;
              }
            });
            return next;
          });
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : dashboardText.charactersLoadError);
          setCustomCharacters([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCharacters(false);
        }
      }
    };

    void fetchCharacters();

    return () => {
      cancelled = true;
    };
  }, [user, dashboardText]);

  useEffect(() => {
    let cancelled = false;

    const fetchPublicCharacters = async () => {
      if (!cancelled) {
        setIsLoadingPublicCharacters(true);
        setPublicCharactersError(null);
      }

      try {
        const headers: Record<string, string> = {};
        if (user) {
          try {
            const idToken = await user.getIdToken();
            headers.Authorization = `Bearer ${idToken}`;
          } catch {
            // Ignore token fetch errors; continue unauthenticated.
          }
        }

        const response = await fetch('/api/characters/explore?limit=12&sort=popular', {
          headers
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            payload && typeof payload.error === 'string'
              ? payload.error
              : dashboardText.showcaseLoadError
          );
        }

        const items: CharacterApiItem[] = Array.isArray(payload?.characters)
          ? (payload?.characters as CharacterApiItem[])
          : [];

        if (!cancelled) {
          // Keep the server's popularity order; the 'recent' option re-sorts on the client.
          setPublicCharacters(items.map(adaptCharacter));
        }
      } catch (error) {
        if (!cancelled) {
          setPublicCharactersError(
            error instanceof Error ? error.message : dashboardText.showcaseLoadError
          );
          setPublicCharacters([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPublicCharacters(false);
        }
      }
    };

    void fetchPublicCharacters();

    return () => {
      cancelled = true;
    };
  }, [dashboardText.showcaseLoadError, user]);

  useEffect(() => {
    if (!user || !recentChats.length) {
      return;
    }

    const missingIds = Array.from(
      new Set(
        recentChats
          .map(conversation => conversation.characterId)
          .filter((id): id is string => {
            if (typeof id !== 'string' || !id.trim()) {
              return false;
            }
            return !characterNames[id];
          })
      )
    );

    if (!missingIds.length) {
      return;
    }

    let cancelled = false;

    const loadCharacterNames = async () => {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/profile/characters/batch', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ids: missingIds })
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(
            (payload && typeof payload.error === 'string' && payload.error) ||
              'Failed to load character details.'
          );
        }

        const payload = (await response.json()) as {
          characters?: Array<{ id: string; name?: string | null }>;
        };

        const nextMap = (payload.characters ?? []).reduce<Record<string, string>>(
          (acc, item) => {
            const label =
              typeof item.name === 'string' && item.name.trim()
                ? item.name.trim()
                : `Character ${item.id.slice(0, 6)}`;
            acc[item.id] = label;
            return acc;
          },
          {}
        );

        missingIds.forEach(id => {
          if (!nextMap[id]) {
            nextMap[id] = `Character ${id.slice(0, 6)}`;
          }
        });

        if (!cancelled && Object.keys(nextMap).length) {
          setCharacterNames(prev => ({ ...prev, ...nextMap }));
        }
      } catch (characterError) {
        if (!cancelled) {
          console.error(characterError);
        }
      }
    };

    void loadCharacterNames();

    return () => {
      cancelled = true;
    };
  }, [user, recentChats, characterNames]);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!user) {
        if (!cancelled) {
          setProfileData(null);
          setIsLoadingProfile(false);
          setProfileError(null);
        }
        return;
      }

      if (!cancelled) {
        setIsLoadingProfile(true);
        setProfileError(null);
      }

      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/profile', {
          headers: { Authorization: `Bearer ${idToken}` }
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload) {
          throw new Error(
            payload && typeof payload.error === 'string'
              ? payload.error
              : dashboardText.profileLoadError
          );
        }

        if (!cancelled) {
          setProfileData(payload as ProfileResponse);
        }
      } catch (error) {
        if (!cancelled) {
          setProfileError(error instanceof Error ? error.message : dashboardText.profileLoadError);
          setProfileData(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProfile(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user, dashboardText]);

  useEffect(() => {
    let cancelled = false;

    const loadRecentChats = async () => {
      if (!user) {
        if (!cancelled) {
          setRecentChats([]);
          setIsLoadingRecentChats(false);
          setRecentChatsError(null);
        }
        return;
      }

      if (!cancelled) {
        setIsLoadingRecentChats(true);
        setRecentChatsError(null);
      }

      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/profile/conversations?limit=5', {
          headers: { Authorization: `Bearer ${idToken}` }
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload) {
          throw new Error(
            payload && typeof payload.error === 'string'
              ? payload.error
              : dashboardText.recentChatsLoadError
          );
        }

        const items: ConversationApiItem[] = Array.isArray(payload.conversations)
          ? (payload.conversations as ConversationApiItem[])
          : [];
        if (!cancelled) {
          const normalized: ConversationListItem[] = items.map(item =>
            adaptConversation(item, dashboardText.noMessagesYet)
          );
          setRecentChats(normalized);
          setCharacterNames(prevNames => {
            const nextNames: Record<string, string> = {
              ...DEFAULT_CHARACTER_NAMES,
              ...prevNames
            };
            normalized.forEach(item => {
              if (!item.characterId) {
                return;
              }

              const derivedTitle = buildConversationTitle(
                {
                  threadId: item.threadId,
                  title: item.title,
                  characterId: item.characterId
                },
                nextNames
              );

              if (derivedTitle && derivedTitle.trim()) {
                nextNames[item.characterId] = derivedTitle.trim();
              }
            });
            return nextNames;
          });
        }
      } catch (error) {
        if (!cancelled) {
          setRecentChatsError(error instanceof Error ? error.message : dashboardText.recentChatsLoadError);
          setRecentChats([]);
          setCharacterNames({ ...DEFAULT_CHARACTER_NAMES });
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRecentChats(false);
        }
      }
    };

    void loadRecentChats();

    return () => {
      cancelled = true;
    };
  }, [user, dashboardText]);

  const spotlightCharacters = useMemo<CharacterCard[]>(() => {
    const recentIds = profileData?.profile.recentCharacterIds ?? [];
    if (!recentIds.length) {
      return featuredCharacters;
    }

    const seen = new Set<string>();
    const derived: CharacterCard[] = [];

    recentIds.forEach((id, index) => {
      if (!id || seen.has(id)) {
        return;
      }
      seen.add(id);

      const custom = customCharacters.find(character => character.id === id);
      if (custom) {
        derived.push({
          id: custom.id,
          title: custom.name,
          creator: custom.categories[0] ?? dashboardText.sidebarProfileRole,
          description: custom.summary || dashboardText.summaryFallback,
          tag: custom.categories[0] ?? dashboardText.defaultTag,
          sample: custom.instructions || '',
          style: `scene-card--${((index % 3) + 1).toString()}`,
          chatId: custom.id
        });
        return;
      }

      const conversation = recentChats.find(chat => chat.characterId === id);
      const fallbackTitle = conversation
        ? buildConversationTitle(conversation, characterNames)
        : characterNames[id] || `Character ${id.slice(0, 6)}`;

      derived.push({
        id,
        title: fallbackTitle,
        creator: dashboardText.sidebarProfileRole,
        description: dashboardText.summaryFallback,
        tag: dashboardText.defaultTag,
        sample: '',
        style: `scene-card--${((index % 3) + 1).toString()}`,
        chatId: id
      });
    });

    if (!derived.length) {
      return featuredCharacters;
    }

    return derived.slice(0, featuredCharacters.length);
  }, [customCharacters, profileData, characterNames, recentChats, dashboardText]);

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
      return recentChats;
    }

    return recentChats.filter(chat =>
      buildSearchTarget(
        buildConversationTitle(chat, characterNames),
        chat.lastMessagePreview,
        chat.characterId ? characterNames[chat.characterId] : ''
      ).includes(normalizedSearch)
    );
  }, [recentChats, normalizedSearch, characterNames]);

  const hasRecentChats = recentChats.length > 0;
  const noRecentSearchResults =
    normalizedSearch.length > 0 && hasRecentChats && filteredRecentChats.length === 0;
  const noCustomSearchResults =
    normalizedSearch.length > 0 && hasCustomCharacters && filteredCharacters.length === 0;
  const displayedCharacters = sortedCustomCharacters;

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
  profileData?.profile.displayName?.trim() ||
  user?.displayName ||
  user?.email ||
    dashboardText.sidebarProfileRole;

  const profileEmail = profileData?.profile.email || user?.email || '';

  const stats = profileData?.stats ?? { conversationCount: 0, songCount: 0 };

  const welcomeTitle = dashboardText.welcome(displayName);
  const statusSummary = profileData
    ? `${dashboardText.conversationsLabel}: ${stats.conversationCount.toLocaleString('ko-KR')} · ${
        dashboardText.songsLabel
      }: ${stats.songCount.toLocaleString('ko-KR')}`
    : isLoadingProfile
    ? dashboardText.profileLoading
    : profileError ?? '';

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

  const handleDeleteRecentChat = async (chat: ConversationListItem) => {
    if (!user || deletingRecentIds[chat.threadId]) {
      return;
    }

    if (!window.confirm(dashboardText.deleteRecentChatConfirm)) {
      return;
    }

    setDeletingRecentIds(prev => ({ ...prev, [chat.threadId]: true }));
    setRecentChatsError(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/profile/conversations/${chat.threadId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });

      if (!response.ok && response.status !== 204 && response.status !== 404) {
        const payload = await response.json().catch(() => ({}));
        const message =
          (payload && typeof payload.error === 'string' && payload.error) ||
          dashboardText.deleteRecentChatError;
        throw new Error(message);
      }

      setRecentChats(prev => {
        const next = prev.filter(item => item.threadId !== chat.threadId);
        setCharacterNames(prevNames => {
          const nextNames: Record<string, string> = {
            ...DEFAULT_CHARACTER_NAMES,
            ...prevNames
          };
          next.forEach(item => {
            if (!item.characterId) {
              return;
            }
            const derivedTitle = buildConversationTitle(
              {
                threadId: item.threadId,
                title: item.title,
                characterId: item.characterId
              },
              nextNames
            );
            if (derivedTitle && derivedTitle.trim()) {
              nextNames[item.characterId] = derivedTitle.trim();
            }
          });
          return nextNames;
        });
        return next;
      });
    } catch (error) {
      setRecentChatsError(error instanceof Error ? error.message : dashboardText.deleteRecentChatError);
    } finally {
      setDeletingRecentIds(prev => {
        const next = { ...prev };
        delete next[chat.threadId];
        return next;
      });
    }
  };

  const handleClearRecentChats = async () => {
    if (
      !user ||
      isClearingRecentChats ||
      !recentChats.length ||
      Object.keys(deletingRecentIds).length > 0
    ) {
      return;
    }

    if (!window.confirm(dashboardText.clearRecentChatsConfirm)) {
      return;
    }

    setIsClearingRecentChats(true);
    setRecentChatsError(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/profile/conversations', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ scope: 'all' })
      });

      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        const message =
          (payload && typeof payload.error === 'string' && payload.error) ||
          dashboardText.clearRecentChatsError;
        throw new Error(message);
      }

      setRecentChats([]);
      setCharacterNames({ ...DEFAULT_CHARACTER_NAMES });
      setDeletingRecentIds({});
  } catch (error) {
    setRecentChatsError(error instanceof Error ? error.message : dashboardText.clearRecentChatsError);
  } finally {
    setIsClearingRecentChats(false);
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

      const idToken = await user.getIdToken();
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ displayName: trimmed })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          (payload && typeof payload.error === 'string' && payload.error) || dashboardText.nicknameError;
        throw new Error(message);
      }

      setProfileData(prev =>
        prev
          ? {
              ...prev,
              profile: {
                ...prev.profile,
                displayName: trimmed
              }
            }
          : prev
      );

      setNicknameValue(trimmed);
      setIsNicknameModalOpen(false);
    } catch (error) {
      setNicknameError(error instanceof Error ? error.message : dashboardText.nicknameError);
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
      setLoadError(dashboardText.deleteAccountError);
      return;
    }

    setIsNicknameModalOpen(false);
    setIsDeleteConfirmOpen(false);
    setIsDeletingAccount(true);
    setLoadError(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/profile/delete-account', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload && typeof payload.error === 'string'
            ? payload.error
            : dashboardText.deleteAccountError
        );
      }

      await signOut(auth);
      alert(dashboardText.deleteAccountSuccess ?? '계정이 삭제되었습니다.');
    } catch (error) {
      console.error('Account deletion failed', error);
      setLoadError(error instanceof Error ? error.message : dashboardText.deleteAccountError);
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
    if (!user) {
      setLoadError(dashboardText.deleteError);
      return;
    }

    setPendingDeleteId(characterId);
    setPanelError(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/profile/characters/${characterId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload && typeof payload.error === 'string' ? payload.error : dashboardText.deleteError
        );
      }

      setCustomCharacters(prev => sortCharacters(prev.filter(item => item.id !== characterId)));
      setSelectedCharacter(prev => (prev && prev.id === characterId ? null : prev));
      setCharacterNames(prev => {
        const next = { ...prev };
        delete next[characterId];
        return next;
      });
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : dashboardText.deleteError);
    } finally {
      setPendingDeleteId(null);
    }
  };

  const handleCloseEditor = () => {
    setSelectedCharacter(null);
    setPanelError(null);
  };

  const handleSubmitEditor = async (payload: FormData) => {
    if (!user) {
      setPanelError(dashboardText.updateError);
      return;
    }

    const characterId = payload.get('id');
    if (!characterId) {
      setPanelError(dashboardText.updateError);
      return;
    }

    setPanelSubmitting(true);
    setPanelError(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/profile/characters/${characterId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${idToken}`
        },
        body: payload
      });

      const responseBody = await response.json().catch(() => null);

      if (!response.ok || !responseBody) {
        throw new Error(
          responseBody && typeof responseBody.error === 'string'
            ? responseBody.error
            : dashboardText.updateError
        );
      }

      if (!responseBody.character || typeof responseBody.character.id !== 'string') {
        throw new Error(dashboardText.updateError);
      }

      const updatedCharacter = adaptCharacter(responseBody.character as CharacterApiItem);

      setCustomCharacters(prev => {
        const exists = prev.some(item => item.id === updatedCharacter.id);
        const next = exists
          ? prev.map(item => (item.id === updatedCharacter.id ? updatedCharacter : item))
          : [...prev, updatedCharacter];
        return sortCharacters(next);
      });
      setCharacterNames(prev => {
        if (!updatedCharacter.id || !updatedCharacter.name?.trim()) {
          return prev;
        }
        return { ...prev, [updatedCharacter.id]: updatedCharacter.name.trim() };
      });

      setSelectedCharacter(null);
      setLoadError(null);
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : dashboardText.updateError);
    } finally {
      setPanelSubmitting(false);
    }
  };

  return (
    <RequireAuth>
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
      <div className="dashboard-page">
        <DashboardSidebar
          text={dashboardText}
          isOpen={isMobileNavOpen}
          onClose={closeMobileNav}
          searchQuery={searchQuery}
          onSearchChange={handleSearchInputChange}
          recentChats={{
            loading: isLoadingRecentChats,
            error: recentChatsError,
            hasAny: hasRecentChats,
            noSearchResults: noRecentSearchResults,
            items: filteredRecentChats,
            deletingIds: deletingRecentIds
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
            loading={isLoadingPublicCharacters}
            error={publicCharactersError}
            sort={characterSort}
            onSortChange={handleSortChange}
            onStartChat={handleStartChat}
          />

          <RecentChatsSection
            text={dashboardText}
            chats={filteredRecentChats}
            characterNames={characterNames}
            loading={isLoadingRecentChats}
            error={recentChatsError}
            hasAny={hasRecentChats}
            noSearchResults={noRecentSearchResults}
            deletingIds={deletingRecentIds}
            isClearing={isClearingRecentChats}
            onClearAll={() => {
              void handleClearRecentChats();
            }}
            onContinue={handleContinueChat}
            onDelete={chat => {
              void handleDeleteRecentChat(chat);
            }}
          />

          <MyCharactersSection
            text={dashboardText}
            characters={displayedCharacters}
            loading={isLoadingCharacters}
            error={loadError}
            hasAny={hasCustomCharacters}
            noSearchResults={noCustomSearchResults}
            pendingDeleteId={pendingDeleteId}
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
