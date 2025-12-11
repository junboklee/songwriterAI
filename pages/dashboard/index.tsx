import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { signOut, updateProfile } from 'firebase/auth';
import { RequireAuth } from '@/components/RequireAuth';
import CharacterEditorPanel, { CharacterVisibility } from '@/components/CharacterEditorPanel';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/I18nContext';
import { DEFAULT_CHARACTER_AVATAR } from '@/lib/constants';
import { buildConversationTitle } from '@/lib/conversationUtils';
import { DEFAULT_CHARACTER_NAMES } from '@/lib/defaultCharacterNames';
import { auth } from '@/lib/firebase';

type CharacterCard = {
  id: string;
  title: string;
  creator: string;
  description: string;
  tag: string;
  sample: string;
  style: string;
  chatId: string;
};

type UserCharacter = {
  id: string;
  name: string;
  summary: string;
  greeting: string;
  longDescription: string;
  instructions: string;
  example: string;
  visibility: CharacterVisibility;
  avatarUrl: string | null;
  categories: string[];
  updatedAt: string | null;
};

type CharacterApiItem = {
  id: string;
  name?: string | null;
  summary?: string | null;
  greeting?: string | null;
  longDescription?: string | null;
  instructions?: string | null;
  example?: string | null;
  visibility?: string | null;
  avatarUrl?: string | null;
  categories?: string[] | null;
  updatedAt?: string | null;
};

type ProfileResponse = {
  profile: {
    displayName: string | null;
    email: string | null;
    photoURL?: string | null;
    recentCharacterIds: string[];
    lastCharacterId: string | null;
  };
  stats: {
    conversationCount: number;
    songCount: number;
  };
};

type ConversationApiItem = {
  id: string;
  threadId?: string | null;
  title?: string | null;
  lastMessagePreview?: string | null;
  characterId?: string | null;
  messageCount?: number | null;
  updatedAt?: string | null;
};

type ConversationListItem = {
  id: string;
  threadId: string;
  title: string | null;
  lastMessagePreview: string;
  characterId: string | null;
  messageCount: number;
  updatedAt: string | null;
};

const featuredCharacters: CharacterCard[] = [
  {
    id: '1',
    title: 'Dayeon',
    creator: '친절하고 정감 있는',
    description:
      '나는 김다연이야. 가수가 되는 게 꿈이라 매일 가사 쓰고 노래 연습에 푹 빠져 있어!',
    tag: 'SingerSongwriter',
    sample:
      '오늘 가장 기억에 남는 순간이 뭐였는지 같이 이야기해 볼래요? 편하게 들려줘.',
    style: 'scene-card--1',
    chatId: '1'
  }
];

const visibilityLabels: Record<CharacterVisibility, string> = {
  private: '비공개',
  unlisted: '링크 공개',
  public: '전체 공개'
};

const isCharacterVisibility = (value: unknown): value is CharacterVisibility =>
  value === 'private' || value === 'unlisted' || value === 'public';

const toTrimmedOrEmpty = (value?: string | null) =>
  typeof value === 'string' ? value.trim() : '';

const adaptCharacter = (item: CharacterApiItem): UserCharacter => ({
  id: item.id,
  name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : '이름 없는 캐릭터',
  summary: toTrimmedOrEmpty(item.summary),
  greeting: toTrimmedOrEmpty(item.greeting),
  longDescription: toTrimmedOrEmpty(item.longDescription ?? item.instructions),
  instructions: toTrimmedOrEmpty(item.instructions ?? item.longDescription),
  example: toTrimmedOrEmpty(item.example),
  visibility: isCharacterVisibility(item.visibility) ? item.visibility : 'private',
  avatarUrl:
    typeof item.avatarUrl === 'string' && item.avatarUrl.trim()
      ? item.avatarUrl.trim()
      : DEFAULT_CHARACTER_AVATAR,
  categories: Array.isArray(item.categories)
    ? item.categories.filter((category): category is string => typeof category === 'string')
    : [],
  updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : null
});

const adaptConversation = (
  item: ConversationApiItem,
  noMessagesFallback: string
): ConversationListItem => ({
  id: item.id,
  threadId: item.threadId && item.threadId.trim() ? item.threadId : item.id,
  title: item.title ?? null,
  lastMessagePreview: item.lastMessagePreview?.trim() || noMessagesFallback,
  characterId: item.characterId ?? null,
  messageCount: typeof item.messageCount === 'number' ? item.messageCount : 0,
  updatedAt: item.updatedAt ?? null
});

const getTimestampValue = (value: string | null) => {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sortCharacters = (items: UserCharacter[]) =>
  [...items].sort((a, b) => getTimestampValue(b.updatedAt) - getTimestampValue(a.updatedAt));

const truncateText = (value: string, maxLength = 140) =>
  value.length > maxLength ? `${value.slice(0, maxLength).trimEnd()}...` : value;

const formatUpdatedAt = (isoDate: string | null | undefined, fallback: string) => {
  if (!isoDate) {
    return fallback;
  }

  try {
    return new Intl.DateTimeFormat('ko', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(isoDate));
  } catch {
    return fallback;
  }
};

const formatConversationUpdatedAt = (isoDate?: string | null) => {
  if (!isoDate) {
    return '';
  }

  try {
    return new Intl.DateTimeFormat('ko', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(isoDate));
  } catch {
    return '';
  }
};

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { t: tDashboard } = useTranslation('dashboard');

  const dashboardText = useMemo(
    () => ({
      charactersLoadError: tDashboard('charactersLoadError'),
      charactersLoading: tDashboard('charactersLoading'),
      charactersEmpty: tDashboard('charactersEmpty'),
      deleteError: tDashboard('deleteError'),
      updateError: tDashboard('updateError'),
      updatedUnknown: tDashboard('updatedUnknown'),
      summaryFallback: tDashboard('summaryFallback'),
      instructionsFallback: tDashboard('instructionsFallback'),
      sidebarProfileRole: tDashboard('sidebarProfileRole'),
      defaultTag: tDashboard('defaultTag'),
      profileLoadError: tDashboard('profileLoadError'),
      profileLoading: tDashboard('profileLoading'),
      recentChatsLoadError: tDashboard('recentChatsLoadError'),
      recentChatsEmpty: tDashboard('recentChatsEmpty'),
      overviewTitle: tDashboard('overviewTitle'),
      conversationsLabel: tDashboard('conversationsLabel'),
      songsLabel: tDashboard('songsLabel'),
      lastUpdatedLabel: tDashboard('lastUpdatedLabel'),
      recentChatsTitle: tDashboard('recentChatsTitle'),
      sidebarRecentTitle: tDashboard('sidebarRecentTitle'),
      sidebarEmptyRecent: tDashboard('sidebarEmptyRecent'),
      continueChat: tDashboard('continueChat'),
      startChat: tDashboard('startChat'),
      edit: tDashboard('edit'),
      delete: tDashboard('delete'),
      deleting: tDashboard('deleting'),
      visitCreate: tDashboard('visitCreate'),
      navDashboard: tDashboard('navDashboard'),
      navHistory: tDashboard('navHistory'),
      navSuno: tDashboard('navSuno'),
      searchPlaceholder: tDashboard('searchPlaceholder'),
      searchNoResults: tDashboard('searchNoResults'),
      copyLink: tDashboard('copyLink'),
      copyLinkSuccess: tDashboard('copyLinkSuccess'),
      visibilityLabel: tDashboard('visibilityLabel'),
      welcome: (name?: string | null) =>
        tDashboard('welcome', { replacements: { name: name ?? '' } }),
      loadingIndicator: tDashboard('loadingIndicator'),
      todaysSpotlight: tDashboard('todaysSpotlight'),
      noMessagesYet: tDashboard('noMessagesYet'),
      deleteRecentChat: tDashboard('deleteRecentChat'),
      deletingRecentChat: tDashboard('deletingRecentChat'),
      deleteRecentChatConfirm: tDashboard('deleteRecentChatConfirm'),
      deleteRecentChatError: tDashboard('deleteRecentChatError'),
      clearRecentChats: tDashboard('clearRecentChats'),
      clearingRecentChats: tDashboard('clearingRecentChats'),
      clearRecentChatsConfirm: tDashboard('clearRecentChatsConfirm'),
      clearRecentChatsError: tDashboard('clearRecentChatsError'),
      profileMenuNickname: tDashboard('profileMenuNickname'),
      profileMenuDeleteAccount: tDashboard('profileMenuDeleteAccount'),
      deleteAccountConfirm: tDashboard('deleteAccountConfirm'),
      deleteAccountError: tDashboard('deleteAccountError'),
      deleteAccountSuccess: tDashboard('deleteAccountSuccess'),
      deleteAccountInProgress: tDashboard('deleteAccountInProgress'),
      profileMenuSignOut: tDashboard('profileMenuSignOut'),
      profileMenuLabel: tDashboard('profileMenuLabel'),
      nicknameModalTitle: tDashboard('nicknameModalTitle'),
      nicknameModalDescription: tDashboard('nicknameModalDescription'),
      nicknameLabel: tDashboard('nicknameLabel'),
      nicknamePlaceholder: tDashboard('nicknamePlaceholder'),
      nicknameSave: tDashboard('nicknameSave'),
      nicknameSaving: tDashboard('nicknameSaving'),
      nicknameCancel: tDashboard('nicknameCancel'),
      nicknameRequired: tDashboard('nicknameRequired'),
      nicknameError: tDashboard('nicknameError'),
      recentChatsCount: (count: number) =>
        tDashboard('recentChatsCount', { replacements: { count } })
    }),
    [tDashboard]
  );

  const [customCharacters, setCustomCharacters] = useState<UserCharacter[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<UserCharacter | null>(null);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelSubmitting, setPanelSubmitting] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [nicknameValue, setNicknameValue] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const buildSearchTarget = (...values: Array<string | null | undefined | string[]>) =>
    values
      .map(value => {
        if (Array.isArray(value)) {
          return value.join(' ');
        }
        return value ?? '';
      })
      .join(' ')
      .toLowerCase();

const hasCustomCharacters = customCharacters.length > 0;
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
        character.categories
      ).includes(normalizedSearch)
    );
  }, [customCharacters, normalizedSearch]);

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

  useEffect(() => {
  if (!isProfileMenuOpen) {
    return undefined;
  }

  const handleClickOutside = (event: MouseEvent) => {
    if (!profileMenuRef.current) {
      return;
    }

    if (!profileMenuRef.current.contains(event.target as Node)) {
      setIsProfileMenuOpen(false);
    }
  };

  document.addEventListener('mousedown', handleClickOutside);

  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [isProfileMenuOpen]);

  const handleSearchInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

useEffect(() => {
  setIsProfileMenuOpen(false);
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

  const handleNicknameModalClose = () => {
    if (nicknameSaving) {
      return;
    }
    setIsNicknameModalOpen(false);
    setNicknameError(null);
  };

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

  const handleProfileMenuToggle = () => {
    setIsProfileMenuOpen(prev => !prev);
  };

  const handleDeleteAccount = async () => {
    if (!user) {
      setLoadError(dashboardText.deleteAccountError);
      return;
    }

    setIsProfileMenuOpen(false);
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
    setIsProfileMenuOpen(false);
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
    setIsProfileMenuOpen(false);
    setNicknameError(null);
    setNicknameValue(displayName);
    setIsNicknameModalOpen(true);
  };

  const handleSignOutClick = async () => {
    setIsProfileMenuOpen(false);
    setIsNicknameModalOpen(false);
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out failed', error);
    }
  };

  const sidebarContent = (
    <>
      <div className="dashboard-sidebar__brand">Nova Singer AI</div>

      <div className="dashboard-sidebar__create">
        <Link href="/character/create" onClick={closeMobileNav}>
          {dashboardText.visitCreate}
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      <nav className="dashboard-sidebar__nav">
        <Link
          href="/dashboard"
          className="dashboard-sidebar__nav-item dashboard-sidebar__nav-item--active"
          onClick={closeMobileNav}
        >
          <span>{dashboardText.navDashboard}</span>
        </Link>
        <Link href="/history" className="dashboard-sidebar__nav-item" onClick={closeMobileNav}>
          <span>{dashboardText.navHistory}</span>
        </Link>
        <Link href="/suno" className="dashboard-sidebar__nav-item" onClick={closeMobileNav}>
          <span>{dashboardText.navSuno}</span>
        </Link>
      </nav>

      <div className="dashboard-sidebar__search">
        <input
          type="search"
          placeholder={dashboardText.searchPlaceholder}
          aria-label={dashboardText.searchPlaceholder}
          value={searchQuery}
          onChange={handleSearchInputChange}
        />
      </div>

      <div className="dashboard-sidebar__recent">
        <h3>{dashboardText.sidebarRecentTitle}</h3>
        <div className="dashboard-sidebar__recent-list">
          {isLoadingRecentChats ? (
            <div className="dashboard-sidebar__recent-item">{dashboardText.loadingIndicator}</div>
          ) : recentChatsError ? (
            <div className="dashboard-sidebar__recent-item">{recentChatsError}</div>
          ) : !hasRecentChats ? (
            <div className="dashboard-sidebar__recent-item">{dashboardText.sidebarEmptyRecent}</div>
          ) : noRecentSearchResults ? (
            <div className="dashboard-sidebar__recent-item">{dashboardText.searchNoResults}</div>
          ) : (
            filteredRecentChats.map(chat => {
              const updated = formatConversationUpdatedAt(chat.updatedAt);
              const title = buildConversationTitle(chat, characterNames);
              const disabling = Boolean(deletingRecentIds[chat.threadId]);
              return (
                <button
                  key={chat.id}
                  type="button"
                  className="dashboard-sidebar__recent-item"
                  onClick={() => {
                    closeMobileNav();
                    handleContinueChat(chat.threadId, chat.characterId);
                  }}
                  disabled={disabling}
                >
                  <span>{title}</span>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}>
                    {updated || dashboardText.noMessagesYet}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="dashboard-sidebar__profile" ref={profileMenuRef} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={handleProfileMenuToggle}
          aria-haspopup="true"
          aria-expanded={isProfileMenuOpen}
          aria-label={dashboardText.profileMenuLabel}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            width: '100%',
            padding: '12px 16px',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.12)',
            background: isProfileMenuOpen ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.08)',
            color: 'inherit',
            cursor: 'pointer',
            transition: 'background 0.2s ease'
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <strong style={{ fontSize: '0.9rem' }}>{displayName}</strong>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.6)'
              }}
            >
              {profileEmail || dashboardText.sidebarProfileRole}
            </p>
          </div>
          <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.65)' }}>
            {isProfileMenuOpen ? '닫기' : '메뉴'}
          </span>
        </button>

        {isProfileMenuOpen ? (
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
              onClick={handleProfileNickname}
              style={{ justifyContent: 'center' }}
            >
              {dashboardText.profileMenuNickname}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                void handleSignOutClick();
              }}
              style={{ justifyContent: 'center' }}
            >
              {dashboardText.profileMenuSignOut}
            </button>
            <button
              type="button"
              className="btn btn--danger"
              onClick={handleOpenDeleteConfirm}
              disabled={isDeletingAccount}
              style={{ justifyContent: 'center' }}
            >
              {dashboardText.profileMenuDeleteAccount}
            </button>
          </div>
        ) : null}
      </div>
    </>
  );

  useEffect(() => {
    if (!isNicknameModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !nicknameSaving) {
        setIsNicknameModalOpen(false);
        setNicknameError(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const { style } = document.body;
    const previousOverflow = style.overflow;
    style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      style.overflow = previousOverflow;
    };
  }, [isNicknameModalOpen, nicknameSaving]);

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
        <aside
          id="dashboard-sidebar"
          className={`dashboard-sidebar${isMobileNavOpen ? ' dashboard-sidebar--open' : ''}`}
        >
          <div className="dashboard-sidebar__brand">Nova Singer AI</div>

          <div className="dashboard-sidebar__create">
            <Link href="/character/create" onClick={closeMobileNav}>
              {dashboardText.visitCreate}
              <span>＋</span>
            </Link>
          </div>

          <nav className="dashboard-sidebar__nav">
        <Link
          href="/dashboard"
          className="dashboard-sidebar__nav-item dashboard-sidebar__nav-item--active"
          onClick={closeMobileNav}
        >
          <span>{dashboardText.navDashboard}</span>
        </Link>
        <Link href="/history" className="dashboard-sidebar__nav-item" onClick={closeMobileNav}>
          <span>{dashboardText.navHistory}</span>
        </Link>
        <Link href="/suno" className="dashboard-sidebar__nav-item" onClick={closeMobileNav}>
          <span>{dashboardText.navSuno}</span>
            </Link>
          </nav>

          <div className="dashboard-sidebar__search">
            <input
              type="search"
              placeholder={dashboardText.searchPlaceholder}
              aria-label={dashboardText.searchPlaceholder}
              value={searchQuery}
              onChange={handleSearchInputChange}
            />
          </div>

          <div className="dashboard-sidebar__recent">
            <h3>{dashboardText.sidebarRecentTitle}</h3>
            <div className="dashboard-sidebar__recent-list">
              {isLoadingRecentChats ? (
                <div className="dashboard-sidebar__recent-item">{dashboardText.loadingIndicator}</div>
              ) : recentChatsError ? (
                <div className="dashboard-sidebar__recent-item">{recentChatsError}</div>
              ) : !hasRecentChats ? (
                <div className="dashboard-sidebar__recent-item">{dashboardText.sidebarEmptyRecent}</div>
              ) : noRecentSearchResults ? (
                <div className="dashboard-sidebar__recent-item">{dashboardText.searchNoResults}</div>
              ) : (
                filteredRecentChats.map(chat => {
                  const updated = formatConversationUpdatedAt(chat.updatedAt);
                  const title = buildConversationTitle(chat, characterNames);
                  const disabling = Boolean(deletingRecentIds[chat.threadId]);
                  return (
                    <button
                      key={chat.id}
                      type="button"
                      className="dashboard-sidebar__recent-item"
                      onClick={() => {
                        closeMobileNav();
                        handleContinueChat(chat.threadId, chat.characterId);
                      }}
                      disabled={disabling}
                    >
                      <span>{title}</span>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}>
                        {updated || dashboardText.noMessagesYet}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div
          className="dashboard-sidebar__profile"
          ref={profileMenuRef}
          style={{ position: 'relative' }}
        >
          <button
            type="button"
            onClick={handleProfileMenuToggle}
            aria-haspopup="true"
            aria-expanded={isProfileMenuOpen}
            aria-label={dashboardText.profileMenuLabel}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              width: '100%',
              padding: '12px 16px',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.12)',
              background: isProfileMenuOpen ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.08)',
              color: 'inherit',
              cursor: 'pointer',
              transition: 'background 0.2s ease'
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <strong style={{ fontSize: '0.9rem' }}>{displayName}</strong>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.6)'
                }}
              >
                {profileEmail || dashboardText.sidebarProfileRole}
              </p>
            </div>
            <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.65)' }}>
              {isProfileMenuOpen ? '▲' : '▼'}
            </span>
          </button>

          {isProfileMenuOpen ? (
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
                onClick={handleProfileNickname}
                style={{ justifyContent: 'flex-start' }}
              >
                {dashboardText.profileMenuNickname}
              </button>
              <button
                type="button"
              className="btn btn--primary"
              onClick={() => {
                void handleSignOutClick();
              }}
              style={{ justifyContent: 'center' }}
            >
              {dashboardText.profileMenuSignOut}
            </button>
            <button
              type="button"
              className="btn btn--danger"
              onClick={handleOpenDeleteConfirm}
              disabled={isDeletingAccount}
              style={{ justifyContent: 'center' }}
            >
              {dashboardText.profileMenuDeleteAccount}
            </button>
          </div>
        ) : null}
      </div>
        </aside>
        <button
          type="button"
          className={`dashboard-sidebar__backdrop${isMobileNavOpen ? ' dashboard-sidebar__backdrop--visible' : ''}`}
          aria-label="사이드바 닫기"
          onClick={closeMobileNav}
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

          <section className="dashboard-section">
            <div className="dashboard-section__header">
              <h2>{dashboardText.overviewTitle}</h2>
            </div>
            <div className="dashboard-grid">
              {isLoadingProfile ? (
                <div className="dashboard-card">
                  <p className="dashboard-card__meta">{dashboardText.profileLoading}</p>
                </div>
              ) : profileError ? (
                <div className="dashboard-card">
                  <p className="dashboard-card__meta">{profileError}</p>
                </div>
              ) : (
                <>
                  <div className="dashboard-card">
                    <h3 className="dashboard-card__title">{dashboardText.conversationsLabel}</h3>
                    <p
                      style={{
                        margin: '8px 0 0',
                        fontSize: '2rem',
                        fontWeight: 700
                      }}
                    >
                      {stats.conversationCount.toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <div className="dashboard-card">
                    <h3 className="dashboard-card__title">{dashboardText.songsLabel}</h3>
                    <p
                      style={{
                        margin: '8px 0 0',
                        fontSize: '2rem',
                        fontWeight: 700
                      }}
                    >
                      {stats.songCount.toLocaleString('ko-KR')}
                    </p>
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="dashboard-section">
            <div className="dashboard-section__header">
              <h2>{dashboardText.todaysSpotlight}</h2>
            </div>
            <div className="dashboard-grid">
              {filteredSpotlight.length === 0 ? (
                <div className="dashboard-card">
                  <p className="dashboard-card__meta">
                    {normalizedSearch ? dashboardText.searchNoResults : dashboardText.charactersEmpty}
                  </p>
                </div>
              ) : (
                filteredSpotlight.map(scene => (
                  <div key={scene.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <Link
                      href={{ pathname: '/chat', query: { characterId: scene.chatId } }}
                      className={`scene-card ${scene.style}`}
                    >
                      <div className="scene-card__content">
                        <div className="scene-card__tag">{scene.tag}</div>
                        <h3 className="scene-card__title">{scene.title}</h3>
                        <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)' }}>
                          {scene.creator}
                        </span>
                        <p
                          style={{
                            margin: '6px 0 0',
                            fontSize: '0.8rem',
                            color: 'rgba(255,255,255,0.75)'
                          }}
                        >
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
                          maxWidth: '280px', // Assuming card width is around this
                          margin: '0 auto'
                        }}
                      >
                                                  <a href="https://www.youtube.com/@yeonverse-m1k" target="_blank" rel="noopener noreferrer">
                                                    <Image src="/bottons/youtube-play.png" alt="YouTube" width={32} height={32} />
                                                  </a>                        <a href="https://instagram.com/yeonversestudio" target="_blank" rel="noopener noreferrer">
                          <Image src="/bottons/insta_01.png" alt="Instagram" width={32} height={32} />
                        </a>
                                                  <a href="https://tiktok.com/@yeonverse_studio" target="_blank" rel="noopener noreferrer">
                                                    <Image src="/bottons/tt_04.png" alt="TikTok" width={32} height={32} />
                                                  </a>                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

  <section className="dashboard-section">
    <div className="dashboard-section__header">
      <h2>{dashboardText.recentChatsTitle}</h2>
      {hasRecentChats ? (
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => {
            void handleClearRecentChats();
          }}
          disabled={
            isClearingRecentChats ||
            isLoadingRecentChats ||
            Object.keys(deletingRecentIds).length > 0
          }
        >
          {isClearingRecentChats ? dashboardText.clearingRecentChats : dashboardText.clearRecentChats}
        </button>
      ) : null}
    </div>
            <div className="dashboard-grid">
              {isLoadingRecentChats ? (
                <div className="dashboard-card">
                  <p className="dashboard-card__meta">{dashboardText.loadingIndicator}</p>
                </div>
              ) : recentChatsError ? (
                <div className="dashboard-card">
                  <p className="dashboard-card__meta">{recentChatsError}</p>
                </div>
              ) : !hasRecentChats ? (
                <div className="dashboard-card">
                  <p className="dashboard-card__meta">{dashboardText.recentChatsEmpty}</p>
                </div>
              ) : noRecentSearchResults ? (
                <div className="dashboard-card">
                  <p className="dashboard-card__meta">{dashboardText.searchNoResults}</p>
                </div>
              ) : (
                filteredRecentChats.map(chat => {
                  const updated = formatConversationUpdatedAt(chat.updatedAt);
                  const title = buildConversationTitle(chat, characterNames);
                  const isDeleting = Boolean(deletingRecentIds[chat.threadId]);
                  return (
                    <div key={chat.id} className="dashboard-card">
                      <h3 className="dashboard-card__title">{title}</h3>
                      <p className="dashboard-card__meta">{chat.lastMessagePreview}</p>
                      <div className="dashboard-card__stats">
                        <span>{dashboardText.recentChatsCount(chat.messageCount)}</span>
                        <span>{updated || dashboardText.updatedUnknown}</span>
                      </div>
                      <div className="dashboard-card__actions">
                        <button
                          type="button"
                          className="dashboard-card__button dashboard-card__button--primary"
                          onClick={() => handleContinueChat(chat.threadId, chat.characterId)}
                          disabled={isDeleting}
                        >
                          {dashboardText.continueChat}
                        </button>
                        <button
                          type="button"
                          className="dashboard-card__button dashboard-card__button--danger"
                          onClick={() => {
                            void handleDeleteRecentChat(chat);
                          }}
                          disabled={isDeleting}
                        >
                          {isDeleting ? dashboardText.deletingRecentChat : dashboardText.deleteRecentChat}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="dashboard-section">
            <div className="dashboard-section__header">
              <h2>내 커스텀 캐릭터</h2>
              <span className="section-link" />
            </div>
            <div className="dashboard-grid">
              {isLoadingCharacters ? (
                <div className="dashboard-card">
                  <p className="dashboard-card__meta">{dashboardText.charactersLoading}</p>
                </div>
              ) : loadError ? (
                <div className="dashboard-card">
                  <p className="dashboard-card__meta">{loadError}</p>
                </div>
              ) : !hasCustomCharacters ? (
                <div className="dashboard-card">
                  <p className="dashboard-card__meta">{dashboardText.charactersEmpty}</p>
                </div>
              ) : noCustomSearchResults ? (
                <div className="dashboard-card">
                  <p className="dashboard-card__meta">{dashboardText.searchNoResults}</p>
                </div>
              ) : (
                filteredCharacters.map(character => {
                  const summaryText = character.summary
                    ? truncateText(character.summary, 110)
                    : dashboardText.summaryFallback;
                  const instructionsPreview = character.instructions
                    ? truncateText(character.instructions, 140)
                    : dashboardText.instructionsFallback;
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
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.75rem',
                              borderRadius: '8px',
                              minWidth: '60px'
                            }}
                          >
                            {copiedId === character.id
                              ? dashboardText.copyLinkSuccess
                              : `🔗 ${dashboardText.copyLink}`}
                          </button>
                        )}
                      </div>
                      <p className="dashboard-card__meta">{summaryText}</p>
                      <div className="dashboard-card__stats">
                        <span>
                          {dashboardText.visibilityLabel}: {visibilityLabels[character.visibility]}
                        </span>
                        <span>
                          {dashboardText.lastUpdatedLabel}: {formatUpdatedAt(character.updatedAt, dashboardText.updatedUnknown)}
                        </span>
                      </div>
                      <div className="dashboard-card__actions">
                        <button
                          type="button"
                          className="dashboard-card__button dashboard-card__button--primary"
                          onClick={() => handleStartChat(character.id)}
                          disabled={panelSubmitting || isDeleting}
                        >
                          {dashboardText.startChat}
                        </button>
                        <button
                          type="button"
                          className="dashboard-card__button"
                          onClick={() => handleEditCharacter(character.id)}
                          disabled={panelSubmitting || isDeleting}
                        >
                          {dashboardText.edit}
                        </button>
                        <button
                          type="button"
                          className="dashboard-card__button dashboard-card__button--danger"
                          onClick={() => {
                            void handleDeleteCharacter(character.id);
                          }}
                          disabled={isDeleting || panelSubmitting}
                        >
                          {isDeleting ? dashboardText.deleting : dashboardText.delete}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
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
            categories: selectedCharacter.categories
          }}
          onClose={handleCloseEditor}
          onSubmit={handleSubmitEditor}
          isSubmitting={panelSubmitting}
          errorMessage={panelError}
        />
      ) : null}
      {isNicknameModalOpen ? (
        <div
          role="presentation"
          onClick={handleNicknameModalClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 120
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="nickname-modal-title"
            onClick={event => event.stopPropagation()}
            style={{
              width: 'min(420px, 92vw)',
              background: 'rgba(20,20,20,0.96)',
              borderRadius: 18,
              padding: 28,
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 24px 48px rgba(0,0,0,0.45)',
              display: 'grid',
              gap: 18
            }}
          >
            <div>
              <h2 id="nickname-modal-title" style={{ margin: 0, fontSize: '1.4rem' }}>
                {dashboardText.nicknameModalTitle}
              </h2>
              <p
                style={{
                  margin: '8px 0 0',
                  fontSize: '0.9rem',
                  color: 'rgba(255,255,255,0.65)',
                  lineHeight: 1.6
                }}
              >
                {dashboardText.nicknameModalDescription}
              </p>
            </div>

            <form onSubmit={handleNicknameSubmit} style={{ display: 'grid', gap: 16 }}>
              <label style={{ display: 'grid', gap: 8 }}>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                  {dashboardText.nicknameLabel}
                </span>
                <input
                  type="text"
                  value={nicknameValue}
                  onChange={event => setNicknameValue(event.target.value)}
                  placeholder={dashboardText.nicknamePlaceholder}
                  disabled={nicknameSaving}
                  autoFocus
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    fontSize: '0.95rem'
                  }}
                />
              </label>

              {nicknameError ? (
                <p style={{ margin: 0, color: '#fca5a5', fontSize: '0.85rem' }}>{nicknameError}</p>
              ) : null}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={handleNicknameModalClose}
                  disabled={nicknameSaving}
                >
                  {dashboardText.nicknameCancel}
                </button>
                <button type="submit" className="btn btn--primary" disabled={nicknameSaving}>
                  {nicknameSaving ? dashboardText.nicknameSaving : dashboardText.nicknameSave}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {isDeleteConfirmOpen ? (
        <div
          role="presentation"
          onClick={handleCancelDeleteConfirm}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 130
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
            onClick={event => event.stopPropagation()}
            style={{
              width: 'min(420px, 92vw)',
              background: 'rgba(20,20,20,0.96)',
              borderRadius: 18,
              padding: 28,
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 24px 48px rgba(0,0,0,0.45)',
              display: 'grid',
              gap: 18
            }}
          >
            <div>
              <h2 id="delete-confirm-title" style={{ margin: 0, fontSize: '1.35rem', color: '#f87171' }}>
                {dashboardText.profileMenuDeleteAccount}
              </h2>
              <p
                style={{
                  margin: '8px 0 0',
                  fontSize: '0.9rem',
                  color: 'rgba(255,255,255,0.75)',
                  lineHeight: 1.6
                }}
              >
                {dashboardText.deleteAccountConfirm}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleCancelDeleteConfirm}
                disabled={isDeletingAccount}
              >
                {dashboardText.nicknameCancel}
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  void handleDeleteAccount();
                }}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount
                  ? dashboardText.deleteAccountInProgress
                  : dashboardText.profileMenuDeleteAccount}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </RequireAuth>
  );
}
