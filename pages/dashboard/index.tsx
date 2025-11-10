import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { signOut, updateProfile } from 'firebase/auth';
import { RequireAuth } from '@/components/RequireAuth';
import CharacterEditorPanel, { CharacterVisibility } from '@/components/CharacterEditorPanel';
import { useAuth } from '@/context/AuthContext';
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

const TEXT: Record<string, any> = {
  charactersLoadError: '커스텀 캐릭터를 불러오지 못했습니다.',
  charactersLoading: '커스텀 캐릭터를 불러오는 중입니다...',
  charactersEmpty: '아직 만든 커스텀 캐릭터가 없어요.',
  deleteError: '캐릭터를 삭제하지 못했습니다.',
  updateError: '캐릭터 정보를 업데이트할 수 없습니다.',
  updatedUnknown: '업데이트 정보 없음',
  summaryFallback: '소개가 아직 작성되지 않았어요.',
  instructionsFallback: 'AI 지침이 아직 작성되지 않았어요.',
  panelNameRequired: '캐릭터 이름을 입력해 주세요.',
  panelInstructionsRequired: 'AI 지침을 입력해 주세요.',
  profileLoadError: '프로필 정보를 불러오지 못했습니다.',
  profileLoading: '프로필 정보를 불러오는 중...',
  recentChatsLoadError: '최근 대화를 불러오지 못했습니다.',
  recentChatsEmpty: '최근 대화가 아직 없습니다.',
  overviewTitle: '내 활동 요약',
  conversationsLabel: '대화',
  songsLabel: '저장된 가사',
  recentChatsTitle: '최근 대화',
  recentChatsCount: (count: number) => `${count}개의 메시지`,
  sidebarRecentTitle: '최근 대화',
  sidebarEmptyRecent: '최근 대화 내역이 없습니다.',
  sidebarProfileRole: '크리에이터',
  continueChat: '대화 이어가기',
  startChat: '대화 시작',
  edit: '수정',
  delete: '삭제',
  deleting: '삭제 중...',
  visitCreate: '만들기',
  navDashboard: '대시보드',
  navHistory: '대화 기록',
  navSuno: '라이브러리',
  searchPlaceholder: '검색',
  searchButton: '검색',
  searchNoResults: '검색 결과가 없습니다.',
  welcome: (name: string) => `${name}님, 다시 만나서 반가워요!`,
  loadingIndicator: '불러오는 중입니다...',
  todaysSpotlight: '오늘의 추천 캐릭터',
  defaultTag: '캐릭터',
  noMessagesYet: '저장된 메시지가 없습니다.',
  updatedAt: (value: string | null) => (value ? `업데이트: ${value}` : '업데이트 정보 없음'),
  createdLabel: '생성',
  lastUpdatedLabel: '업데이트'
};

Object.assign(TEXT, {
  deleteRecentChat: '\uB300\uD654 \uC0AD\uC81C',
  deletingRecentChat: '\uC0AD\uC81C \uC911...',
  deleteRecentChatConfirm: '\uC774 \uB300\uD654\uB97C \uC0AD\uC81C\uD560\uAE4C\uC694?',
  deleteRecentChatError: '\uB300\uD654\uB97C \uC0AD\uC81C\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.',
  clearRecentChats: '\uC804\uCCB4 \uC0AD\uC81C',
  clearingRecentChats: '\uC804\uCCB4 \uC0AD\uC81C \uC911...',
  clearRecentChatsConfirm: '\uCD5C\uADFC \uB300\uD654\uB97C \uBAA8\uB450 \uC0AD\uC81C\uD560\uAE4C\uC694?',
  clearRecentChatsError: '\uCD5C\uADFC \uB300\uD654\uB97C \uBAA8\uB450 \uC0AD\uC81C\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.',
  profileMenuNickname: '\uB2C9\uB124\uC784 \uBCC0\uACBD',
  profileMenuSignOut: '\uB85C\uADF8\uC544\uC6C3',
  profileMenuLabel: '\uACC4\uC815 \uBA54\uB274',
  nicknameModalTitle: '\uB2C9\uB124\uC784 \uBCC0\uACBD',
  nicknameModalDescription: '\uC0C8\uB85C\uC6B4 \uD45C\uC2DC \uC774\uB984\uC744 \uC785\uB825\uD558\uBA74 \uD3B8\uC9C0\uD558\uBA74 \uBAA8\uB4E0 \uD654\uBA74\uC5D0 \uC801\uC6A9\uB429\uB2C8\uB2E4.',
  nicknameLabel: '\uD45C\uC2DC \uC774\uB984',
  nicknamePlaceholder: '\uC608: \uADFC\uB370\uB098 \uC218',
  nicknameSave: '\uC800\uC7A5',
  nicknameSaving: '\uC800\uC7A5\uC911...',
  nicknameCancel: '\uCDE8\uC18C',
  nicknameRequired: '\uD45C\uC2DC \uC774\uB984\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.',
  nicknameError: '\uD45C\uC2DC \uC774\uB984 \uC5C5\uB370\uC774\uD2B8\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.'
});

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

const adaptConversation = (item: ConversationApiItem): ConversationListItem => ({
  id: item.id,
  threadId: item.threadId && item.threadId.trim() ? item.threadId : item.id,
  title: item.title ?? null,
  lastMessagePreview: item.lastMessagePreview?.trim() || TEXT.noMessagesYet,
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

const formatUpdatedAt = (isoDate?: string | null) => {
  if (!isoDate) {
    return TEXT.updatedUnknown;
  }

  try {
    return new Intl.DateTimeFormat('ko', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(isoDate));
  } catch {
    return TEXT.updatedUnknown;
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
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [nicknameValue, setNicknameValue] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | null>(null);

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
              : TEXT.charactersLoadError
          );
        }

        const items = Array.isArray(payload.characters) ? payload.characters : [];
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
          setLoadError(error instanceof Error ? error.message : TEXT.charactersLoadError);
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
  }, [user]);

  useEffect(() => {
    if (!user || !recentChats.length) {
      return;
    }

    const missingIds = Array.from(
      new Set(
        recentChats
          .map(conversation => conversation.characterId)
          .filter((id): id is string => Boolean(id) && !characterNames[id])
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
              : TEXT.profileLoadError
          );
        }

        if (!cancelled) {
          setProfileData(payload as ProfileResponse);
        }
      } catch (error) {
        if (!cancelled) {
          setProfileError(error instanceof Error ? error.message : TEXT.profileLoadError);
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
  }, [user]);

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
              : TEXT.recentChatsLoadError
          );
        }

        const items = Array.isArray(payload.conversations) ? payload.conversations : [];
        if (!cancelled) {
          const normalized = items.map(adaptConversation);
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
          setRecentChatsError(error instanceof Error ? error.message : TEXT.recentChatsLoadError);
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
  }, [user]);

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
          creator: custom.categories[0] ?? TEXT.sidebarProfileRole,
          description: custom.summary || TEXT.summaryFallback,
          tag: custom.categories[0] ?? TEXT.defaultTag,
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
        creator: TEXT.sidebarProfileRole,
        description: TEXT.summaryFallback,
        tag: TEXT.defaultTag,
        sample: '',
        style: `scene-card--${((index % 3) + 1).toString()}`,
        chatId: id
      });
    });

    if (!derived.length) {
      return featuredCharacters;
    }

    return derived.slice(0, featuredCharacters.length);
  }, [customCharacters, profileData, characterNames, recentChats]);

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
    TEXT.sidebarProfileRole;

  const profileEmail = profileData?.profile.email || user?.email || '';

  const stats = profileData?.stats ?? { conversationCount: 0, songCount: 0 };

  const welcomeTitle = TEXT.welcome(displayName);
  const statusSummary = profileData
    ? `${TEXT.conversationsLabel}: ${stats.conversationCount.toLocaleString('ko-KR')} · ${
        TEXT.songsLabel
      }: ${stats.songCount.toLocaleString('ko-KR')}`
    : isLoadingProfile
    ? TEXT.profileLoading
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

    if (!window.confirm(TEXT.deleteRecentChatConfirm)) {
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
          TEXT.deleteRecentChatError;
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
      setRecentChatsError(error instanceof Error ? error.message : TEXT.deleteRecentChatError);
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

    if (!window.confirm(TEXT.clearRecentChatsConfirm)) {
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
          TEXT.clearRecentChatsError;
        throw new Error(message);
      }

      setRecentChats([]);
      setCharacterNames({ ...DEFAULT_CHARACTER_NAMES });
      setDeletingRecentIds({});
  } catch (error) {
    setRecentChatsError(error instanceof Error ? error.message : TEXT.clearRecentChatsError);
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
      setNicknameError(TEXT.nicknameError);
      return;
    }

    const trimmed = nicknameValue.trim();
    if (!trimmed) {
      setNicknameError(TEXT.nicknameRequired);
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
          (payload && typeof payload.error === 'string' && payload.error) || TEXT.nicknameError;
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
      setNicknameError(error instanceof Error ? error.message : TEXT.nicknameError);
    } finally {
      setNicknameSaving(false);
    }
  };

  const handleProfileMenuToggle = () => {
    setIsProfileMenuOpen(prev => !prev);
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
      setLoadError(TEXT.deleteError);
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
          payload && typeof payload.error === 'string' ? payload.error : TEXT.deleteError
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
      setLoadError(error instanceof Error ? error.message : TEXT.deleteError);
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
      setPanelError(TEXT.updateError);
      return;
    }

    const characterId = payload.get('id');
    if (!characterId) {
      setPanelError(TEXT.updateError);
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
            : TEXT.updateError
        );
      }

      if (!responseBody.character || typeof responseBody.character.id !== 'string') {
        throw new Error(TEXT.updateError);
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
      setPanelError(error instanceof Error ? error.message : TEXT.updateError);
    } finally {
      setPanelSubmitting(false);
    }
  };

  return (
    <RequireAuth>
      <div className="dashboard-page">
        <aside className="dashboard-sidebar">
          <div className="dashboard-sidebar__brand">Nova Singer AI</div>

          <div className="dashboard-sidebar__create">
            <Link href="/character/create">
              {TEXT.visitCreate}
              <span>＋</span>
            </Link>
          </div>

          <nav className="dashboard-sidebar__nav">
            <Link
              href="/dashboard"
              className="dashboard-sidebar__nav-item dashboard-sidebar__nav-item--active"
            >
              <span>{TEXT.navDashboard}</span>
            </Link>
            <Link href="/history" className="dashboard-sidebar__nav-item">
              <span>{TEXT.navHistory}</span>
            </Link>
            <Link href="/suno" className="dashboard-sidebar__nav-item">
              <span>{TEXT.navSuno}</span>
            </Link>
          </nav>

          <div className="dashboard-sidebar__search">
            <input
              type="search"
              placeholder={TEXT.searchPlaceholder}
              aria-label={TEXT.searchPlaceholder}
              value={searchQuery}
              onChange={handleSearchInputChange}
            />
          </div>

          <div className="dashboard-sidebar__recent">
            <h3>{TEXT.sidebarRecentTitle}</h3>
            <div className="dashboard-sidebar__recent-list">
              {isLoadingRecentChats ? (
                <div className="dashboard-sidebar__recent-item">{TEXT.loadingIndicator}</div>
              ) : recentChatsError ? (
                <div className="dashboard-sidebar__recent-item">{recentChatsError}</div>
              ) : !hasRecentChats ? (
                <div className="dashboard-sidebar__recent-item">{TEXT.sidebarEmptyRecent}</div>
              ) : noRecentSearchResults ? (
                <div className="dashboard-sidebar__recent-item">{TEXT.searchNoResults}</div>
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
                      onClick={() => handleContinueChat(chat.threadId, chat.characterId)}
                      disabled={disabling}
                    >
                      <span>{title}</span>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}>
                        {updated || TEXT.noMessagesYet}
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
            aria-label={TEXT.profileMenuLabel}
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
                {profileEmail || TEXT.sidebarProfileRole}
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
                {TEXT.profileMenuNickname}
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  void handleSignOutClick();
                }}
                style={{ justifyContent: 'center' }}
              >
                {TEXT.profileMenuSignOut}
              </button>
            </div>
          ) : null}
        </div>
        </aside>

        <main className="dashboard-main">
          <header className="dashboard-main__header">
            <div className="dashboard-main__title">
              <h1>{welcomeTitle}</h1>
              <span className="dashboard-status">{statusSummary}</span>
            </div>
            <form className="dashboard-searchbar" onSubmit={handleSearchSubmit}>
              <input
                type="search"
                placeholder={TEXT.searchPlaceholder}
                aria-label={TEXT.searchPlaceholder}
                value={searchQuery}
                onChange={handleSearchInputChange}
              />
            </form>
          </header>

          <section className="dashboard-section">
            <div className="dashboard-section__header">
              <h2>{TEXT.overviewTitle}</h2>
            </div>
            <div className="dashboard-grid">
              {isLoadingProfile ? (
                <div className="dashboard-card">
                  <p className="dashboard-card__meta">{TEXT.profileLoading}</p>
                </div>
              ) : profileError ? (
                <div className="dashboard-card">
                  <p className="dashboard-card__meta">{profileError}</p>
                </div>
              ) : (
                <>
                  <div className="dashboard-card">
                    <h3 className="dashboard-card__title">{TEXT.conversationsLabel}</h3>
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
                    <h3 className="dashboard-card__title">{TEXT.songsLabel}</h3>
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
              <h2>{TEXT.todaysSpotlight}</h2>
            </div>
            <div className="dashboard-grid">
              {filteredSpotlight.length === 0 ? (
                <div className="dashboard-card">
                  <p className="dashboard-card__meta">
                    {normalizedSearch ? TEXT.searchNoResults : TEXT.charactersEmpty}
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
      <h2>{TEXT.recentChatsTitle}</h2>
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
          {isClearingRecentChats ? TEXT.clearingRecentChats : TEXT.clearRecentChats}
        </button>
      ) : null}
    </div>
            <div className="dashboard-grid">
              {isLoadingRecentChats ? (
                <div className="dashboard-card">
                  <p className="dashboard-card__meta">{TEXT.loadingIndicator}</p>
                </div>
              ) : recentChatsError ? (
                <div className="dashboard-card">
                  <p className="dashboard-card__meta">{recentChatsError}</p>
                </div>
              ) : !hasRecentChats ? (
                <div className="dashboard-card">
                  <p className="dashboard-card__meta">{TEXT.recentChatsEmpty}</p>
                </div>
              ) : noRecentSearchResults ? (
                <div className="dashboard-card">
                  <p className="dashboard-card__meta">{TEXT.searchNoResults}</p>
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
                        <span>{TEXT.recentChatsCount(chat.messageCount)}</span>
                        <span>{updated || TEXT.updatedUnknown}</span>
                      </div>
                      <div className="dashboard-card__actions">
                        <button
                          type="button"
                          className="dashboard-card__button dashboard-card__button--primary"
                          onClick={() => handleContinueChat(chat.threadId, chat.characterId)}
                          disabled={isDeleting}
                        >
                          {TEXT.continueChat}
                        </button>
                        <button
                          type="button"
                          className="dashboard-card__button dashboard-card__button--danger"
                          onClick={() => {
                            void handleDeleteRecentChat(chat);
                          }}
                          disabled={isDeleting}
                        >
                          {isDeleting ? TEXT.deletingRecentChat : TEXT.deleteRecentChat}
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
                  <p className="dashboard-card__meta">{TEXT.charactersLoading}</p>
                </div>
              ) : loadError ? (
                <div className="dashboard-card">
                  <p className="dashboard-card__meta">{loadError}</p>
                </div>
              ) : !hasCustomCharacters ? (
                <div className="dashboard-card">
                  <p className="dashboard-card__meta">{TEXT.charactersEmpty}</p>
                </div>
              ) : noCustomSearchResults ? (
                <div className="dashboard-card">
                  <p className="dashboard-card__meta">{TEXT.searchNoResults}</p>
                </div>
              ) : (
                filteredCharacters.map(character => {
                  const summaryText = character.summary
                    ? truncateText(character.summary, 110)
                    : TEXT.summaryFallback;
                  const instructionsPreview = character.instructions
                    ? truncateText(character.instructions, 140)
                    : TEXT.instructionsFallback;
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
                            {copiedId === character.id ? '복사됨!' : '🔗 링크'}
                          </button>
                        )}
                      </div>
                      <p className="dashboard-card__meta">{summaryText}</p>
                      <div className="dashboard-card__stats">
                        <span>공개 범위: {visibilityLabels[character.visibility]}</span>
                        <span>업데이트: {formatUpdatedAt(character.updatedAt)}</span>
                      </div>
                      <div className="dashboard-card__actions">
                        <button
                          type="button"
                          className="dashboard-card__button dashboard-card__button--primary"
                          onClick={() => handleStartChat(character.id)}
                          disabled={panelSubmitting || isDeleting}
                        >
                          {TEXT.startChat}
                        </button>
                        <button
                          type="button"
                          className="dashboard-card__button"
                          onClick={() => handleEditCharacter(character.id)}
                          disabled={panelSubmitting || isDeleting}
                        >
                          {TEXT.edit}
                        </button>
                        <button
                          type="button"
                          className="dashboard-card__button dashboard-card__button--danger"
                          onClick={() => {
                            void handleDeleteCharacter(character.id);
                          }}
                          disabled={isDeleting || panelSubmitting}
                        >
                          {isDeleting ? TEXT.deleting : TEXT.delete}
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
                {TEXT.nicknameModalTitle}
              </h2>
              <p
                style={{
                  margin: '8px 0 0',
                  fontSize: '0.9rem',
                  color: 'rgba(255,255,255,0.65)',
                  lineHeight: 1.6
                }}
              >
                {TEXT.nicknameModalDescription}
              </p>
            </div>

            <form onSubmit={handleNicknameSubmit} style={{ display: 'grid', gap: 16 }}>
              <label style={{ display: 'grid', gap: 8 }}>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                  {TEXT.nicknameLabel}
                </span>
                <input
                  type="text"
                  value={nicknameValue}
                  onChange={event => setNicknameValue(event.target.value)}
                  placeholder={TEXT.nicknamePlaceholder}
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
                  {TEXT.nicknameCancel}
                </button>
                <button type="submit" className="btn btn--primary" disabled={nicknameSaving}>
                  {nicknameSaving ? TEXT.nicknameSaving : TEXT.nicknameSave}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </RequireAuth>
  );
}
