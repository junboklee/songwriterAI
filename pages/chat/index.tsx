import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent
} from 'react';

import { AppNav } from '@/components/AppNav';
import { AppShell } from '@/components/AppShell';
import { MainSidebar } from '@/components/MainSidebar';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/I18nContext';
import { DEFAULT_CHARACTER_AVATAR } from '@/lib/constants';
import { DEFAULT_CHARACTER_NAMES } from '@/lib/defaultCharacterNames';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type ConversationSummary = {
  id: string;
  threadId: string;
  title: string | null;
  lastMessagePreview: string;
  updatedAt: string | null;
  characterId: string | null;
};

type CharacterProfile = {
  id: string;
  name: string;
  tag: string;
  avatar: string;
  greeting: string;
  description: string;
  availability: string;
  videoUrl?: string | null;
};

type CustomCharacterProfile = {
  id: string;
  name: string;
  summary: string;
  greeting: string;
  longDescription: string;
  avatarUrl: string | null;
  categories: string[];
  videoUrl?: string | null;
};

type ResolvedCharacter = {
  id: string;
  name: string;
  avatar: string;
  description: string;
  availability: string;
  greeting: string;
  videoUrl: string | null;
};

const TEXT = {
  sidebarTitle: '\uCD5C\uADFC \uB300\uD654',
  loadingTitle: '\uBD88\uB7EC\uC624\uB294 \uC911\u2026',
  loadingDescription: '\uCD5C\uADFC \uB300\uD654\uB97C \uBD88\uB7EC\uC624\uACE0 \uC788\uC2B5\uB2C8\uB2E4.',
  errorTitle: '\uB300\uD654\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694',
  errorDescription: '\uCD5C\uADFC \uB300\uD654\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.',
  emptyTitle: '\uC544\uC9C1 \uB300\uD654\uAC00 \uC5C6\uC5B4\uC694',
  emptyDescription: '\uCCAB \uBA54\uC2DC\uC9C0\uB97C \uBCF4\uB0B4\uBA74 \uBAA9\uB85D\uC774 \uCC44\uC6CC\uC9D1\uB2C8\uB2E4.',
  pinnedTitle: '\uC5ED\uD560 \uB180\uC774 \uD504\uB7FD\uD2B8',
  emptyPreview: '\uCD5C\uADFC \uBA54\uC2DC\uC9C0\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.',
  sessionExpired: '\uC138\uC158\uC774 \uB9CC\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uB85C\uADF8\uC778\uD574 \uC8FC\uC138\uC694.',
  rateLimited:
    '\uC694\uCCAD \uD55C\uB3C4\uB97C \uCD08\uACFC\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.',
  loadingRecent: '\uC5EC\uB7EC \uB300\uD654\uB97C \uBD88\uB7EC\uC624\uACE0 \uC788\uC2B5\uB2C8\uB2E4.',
  summaryFallback: '사용자가 만든 맞춤형 캐릭터입니다.',
  defaultTag: '커스텀 캐릭터'
};

const CHARACTER_PROFILES: Record<string, CharacterProfile> = {
  '1': {
    id: '1',
    name: 'Dayeon',
    tag: 'Empathy',
    avatar: '/avatars/dayeon.png',
    greeting: 'Shall we start a new conversation together?',
    description: 'Empathetic storyteller for winding down after long days.',
    availability: 'Usually active at night'
  },
};

const QUICK_REPLIES = [
  '지금 가사를 만들고 라이브러리에 저장해줘',
  '크리스마스에 어울리는 캐롤송을 작사해줘.',
  '안녕, 반가워',
  '오늘 하루는 어땠어?'
];

type RoleplayPrompt = {
  label: string;
  prompt: string;
  emoji: string;
};

const ROLEPLAY_PROMPTS: RoleplayPrompt[] = [
  {
    label: '비 오는 날 카페 씬',
    prompt: '비 오는 오후, 카페 창가에서 우연히 마주친 사이처럼 이야기해 줘.',
    emoji: '\u2614\uFE0F'
  },
  {
    label: '동창회 재회',
    prompt: '고등학교 동창회에서 오랜만에 만난 친구로 대화해 줘.',
    emoji: '\uD83C\uDF89'
  },
  {
    label: '탐정과 조수',
    prompt: '탐정과 조수가 되어 미스터리 사건을 함께 해결하는 상황극을 시작하자.',
    emoji: '\uD83D\uDD75\uFE0F'
  },
  {
    label: '응원단장 모드',
    prompt: '응원단장처럼 오늘 하루를 힘차게 응원해 줘.',
    emoji: '\uD83C\uDF88'
  },
  {
    label: '판타지 모험 준비',
    prompt: '판타지 세계의 마법사와 여행자가 모험 계획을 세우는 장면을 연기해 줘.',
    emoji: '\u2728'
  }
];

const CHAT_VIDEO_EMBED_URL = process.env.NEXT_PUBLIC_CHAT_VIDEO_URL ?? null;
const DIRECT_VIDEO_FILE_PATTERN = /\.(mp4|webm|ogg)(\?.*)?$/i;
const CHAT_VIDEO_FALLBACKS = [
  'https://www.youtube.com/embed/tOihHKzR5M0',
  'https://www.youtube.com/embed/aH46U7nV6Fs',
  'https://www.youtube.com/embed/x4qlgpwIaQk',
  'https://youtube.com/shorts/eQ49JMHQBhs',
  'https://youtube.com/shorts/puhfko17-1M',
  'https://youtu.be/gcq4B9b-pbs',
  'https://youtu.be/S0cQj30xYrE'
];

const BASE_CHARACTER_NAMES = { ...DEFAULT_CHARACTER_NAMES };
const AUTO_SAVE_STORAGE_KEY = 'songwriter:autoSaveLyrics';

declare global {
  interface Window {
    YT?: {
      Player: new (element: HTMLElement | string, options: any) => {
        loadVideoById: (id: string) => void;
        playVideo: () => void;
        destroy: () => void;
      };
      PlayerState: {
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const extractYouTubeVideoId = (rawUrl: string): string | null => {
  if (!rawUrl) {
    return null;
  }

  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      return url.pathname.replace('/', '') || null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (url.pathname.startsWith('/shorts/')) {
        const [, maybeId] = url.pathname.split('/shorts/');
        return maybeId ? maybeId.replace('/', '') || null : null;
      }

      if (url.pathname.startsWith('/embed/')) {
        const parts = url.pathname.split('/');
        return parts[2] ?? null;
      }

      if (url.pathname === '/watch') {
        return url.searchParams.get('v');
      }
    }
  } catch {
    return null;
  }

  return null;
};

const ensureMutedYouTubeUrl = (rawUrl: string) => {
  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.set('mute', '1');
    if (!parsed.searchParams.has('playsinline')) {
      parsed.searchParams.set('playsinline', '1');
    }
    if (!parsed.searchParams.has('rel')) {
      parsed.searchParams.set('rel', '0');
    }
    if (!parsed.searchParams.has('modestbranding')) {
      parsed.searchParams.set('modestbranding', '1');
    }
    return parsed.toString();
  } catch {
    const separator = rawUrl.includes('?') ? '&' : '?';
    return `${rawUrl}${separator}mute=1`;
  }
};

const buildYouTubeEmbedUrl = (videoId: string) =>
  ensureMutedYouTubeUrl(
    `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`
  );

const normaliseYouTubeEmbedUrl = (rawUrl: string) => {
  const extracted = extractYouTubeVideoId(rawUrl);
  if (extracted) {
    return buildYouTubeEmbedUrl(extracted);
  }

  if (rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be')) {
    return ensureMutedYouTubeUrl(rawUrl);
  }

  return rawUrl;
};

const pickRandomItem = <T,>(items: T[], exclude?: T | null): T | null => {
  if (items.length === 0) {
    return null;
  }

  const filtered = exclude ? items.filter(item => item !== exclude) : items;
  const pool = filtered.length > 0 ? filtered : items;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? null;
};

const normaliseMessages = (items: ChatMessage[]) =>
  items
    .filter(item => (item.role === 'assistant' || item.role === 'user') && item.content)
    .map(item => ({ ...item, content: item.content.trim() }))
    .filter(item => item.content.length > 0);

const isLikelyLyrics = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }

  const lines = trimmed.split(/\r?\n/).map(line => line.trim());
  const meaningful = lines.filter(line => line.length > 0);
  if (meaningful.length < 3) {
    return false;
  }

  const shortLineCount = meaningful.filter(line => line.length <= 80).length;
  const structured =
    trimmed.includes('\n') && shortLineCount >= Math.max(3, Math.round(meaningful.length * 0.6));

  return structured;
};

type PersistLyricsOptions = {
  lyrics: string;
  title?: string | null;
  threadId: string;
  characterId: string | null;
  characterName?: string | null;
  idToken: string;
};

export default function ChatPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t: tChat } = useTranslation('chat');
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoSaveLyrics, setAutoSaveLyrics] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarConversations, setSidebarConversations] = useState<ConversationSummary[]>([]);
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const [sidebarError, setSidebarError] = useState<string | null>(null);
  const [customCharacters, setCustomCharacters] = useState<Record<string, CustomCharacterProfile>>(
    {}
  );
  const customCharactersRef = useRef<Record<string, CustomCharacterProfile>>({});
  const [characterNames, setCharacterNames] = useState<Record<string, string>>(
    () => ({ ...BASE_CHARACTER_NAMES })
  );
  const lastStoredMessageIdRef = useRef<string | null>(null);
  const lastLoadedThreadRef = useRef<string | null>(null);
  const fallbackVideoIds = useMemo(
    () =>
      CHAT_VIDEO_FALLBACKS.map(url => extractYouTubeVideoId(url))
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    []
  );
  const [activeFallbackId, setActiveFallbackId] = useState<string | null>(null);
  const [isYouTubeApiReady, setIsYouTubeApiReady] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [videoVolume, setVideoVolume] = useState(1);
  const isVideoMutedRef = useRef(isVideoMuted);
  const videoVolumeRef = useRef(videoVolume);
  const youtubePlayerRef = useRef<any>(null);
  const youtubeContainerRef = useRef<HTMLDivElement | null>(null);
  const muteMonitorRef = useRef<number | null>(null);
  const suppressMuteSyncRef = useRef(false);
  const suppressVolumeSyncRef = useRef(false);
  const suppressMuteTimeoutRef = useRef<number | null>(null);
  const suppressVolumeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const stored = window.localStorage.getItem(AUTO_SAVE_STORAGE_KEY);
    if (stored === 'off') {
      setAutoSaveLyrics(false);
    }
  }, []);

  const handleToggleAutoSave = useCallback(() => {
    setAutoSaveLyrics(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(AUTO_SAVE_STORAGE_KEY, next ? 'on' : 'off');
      }
      return next;
    });
  }, []);
  const pendingPlayerSyncRef = useRef(false);
  const pendingVolumeSyncRef = useRef(false);
  const pickNextFallbackId = useCallback(
    (exclude?: string | null) => pickRandomItem(fallbackVideoIds, exclude),
    [fallbackVideoIds]
  );

  const clearMuteSuppressTimeout = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (suppressMuteTimeoutRef.current !== null) {
      window.clearTimeout(suppressMuteTimeoutRef.current);
      suppressMuteTimeoutRef.current = null;
    }
  }, []);

  const clearVolumeSuppressTimeout = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (suppressVolumeTimeoutRef.current !== null) {
      window.clearTimeout(suppressVolumeTimeoutRef.current);
      suppressVolumeTimeoutRef.current = null;
    }
  }, []);

  const applyPlayerMuteState = useCallback(
    (player: any, shouldMute: boolean) => {
      if (!player) {
        return;
      }

      if (typeof window !== 'undefined') {
        suppressMuteSyncRef.current = true;
        clearMuteSuppressTimeout();
        suppressMuteTimeoutRef.current = window.setTimeout(() => {
          suppressMuteSyncRef.current = false;
          suppressMuteTimeoutRef.current = null;
        }, 600);
      }

      if (shouldMute && typeof player.mute === 'function') {
        player.mute();
      } else if (!shouldMute && typeof player.unMute === 'function') {
        player.unMute();
      }
    },
    [clearMuteSuppressTimeout]
  );

  const applyPlayerVolumeState = useCallback(
    (player: any, volume: number) => {
      if (!player || typeof player.setVolume !== 'function') {
        return;
      }
      const clamped = Math.max(0, Math.min(1, volume));
      if (typeof window !== 'undefined') {
        suppressVolumeSyncRef.current = true;
        clearVolumeSuppressTimeout();
        suppressVolumeTimeoutRef.current = window.setTimeout(() => {
          suppressVolumeSyncRef.current = false;
          suppressVolumeTimeoutRef.current = null;
        }, 600);
      }
      player.setVolume(Math.round(clamped * 100));
    },
    [clearVolumeSuppressTimeout]
  );

  const syncMutePreferenceFromPlayer = useCallback(() => {
    const player = youtubePlayerRef.current;
    if (!player) {
      return;
    }

    if (typeof player.isMuted === 'function') {
      const nextMuted = player.isMuted();
      if (!suppressMuteSyncRef.current) {
        setIsVideoMuted(prev => {
          if (prev === nextMuted) {
            return prev;
          }
          pendingPlayerSyncRef.current = true;
          return nextMuted;
        });
      }
    }

    if (typeof player.getVolume === 'function' && !player.isMuted()) {
      const rawVolume = player.getVolume();
      if (typeof rawVolume === 'number' && !Number.isNaN(rawVolume)) {
        const normalized = Math.max(0, Math.min(1, rawVolume / 100));
        if (!suppressVolumeSyncRef.current) {
          setVideoVolume(prev => {
            if (Math.abs(prev - normalized) < 0.01) {
              return prev;
            }
            pendingVolumeSyncRef.current = true;
            return normalized;
          });
        }
      }
    }
  }, []);

  const startMuteMonitor = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (muteMonitorRef.current !== null) {
      return;
    }
    muteMonitorRef.current = window.setInterval(() => {
      syncMutePreferenceFromPlayer();
    }, 500);
  }, [syncMutePreferenceFromPlayer]);

  const stopMuteMonitor = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (muteMonitorRef.current !== null) {
      window.clearInterval(muteMonitorRef.current);
      muteMonitorRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopMuteMonitor();
      clearMuteSuppressTimeout();
      clearVolumeSuppressTimeout();
    };
  }, [stopMuteMonitor, clearMuteSuppressTimeout, clearVolumeSuppressTimeout]);

const getCharacterName = useCallback(
  (id?: string | null, fallback?: string | null) => {
    if (!id) {
      return fallback ? fallback.trim() || null : null;
    }

    const trimmedId = id.trim();
    if (!trimmedId) {
      return fallback ? fallback.trim() || null : null;
    }

    const custom = customCharacters[trimmedId];
    if (custom?.name?.trim()) {
      return custom.name.trim();
    }

    if (CHARACTER_PROFILES[trimmedId]?.name) {
      return CHARACTER_PROFILES[trimmedId].name;
    }

    const mapped = characterNames[trimmedId];
    if (typeof mapped === 'string' && mapped.trim()) {
      return mapped.trim();
    }

    if (fallback && fallback.trim()) {
      return fallback.trim();
    }

    return `Character ${trimmedId.slice(0, 6)}`;
  },
  [characterNames, customCharacters]
);

const fetchCustomCharacters = useCallback(
    async (ids: string[], idToken: string | null) => {
      const uniqueIds = Array.from(
        new Set(
          ids
            .map(id => (typeof id === 'string' ? id.trim() : ''))
            .filter(id => id.length > 0)
        )
      );

      const missing = uniqueIds.filter(
        id => !CHARACTER_PROFILES[id] && !customCharactersRef.current[id]
      );

      if (!missing.length) {
        return;
      }

      const foundCharacters: Record<string, CustomCharacterProfile> = {};

      // Step 1: Try to fetch from the user's private collection if logged in
      if (idToken) {
        try {
          const response = await fetch('/api/profile/characters/batch', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`
            },
            body: JSON.stringify({ ids: missing })
          });

          if (response.ok) {
            const payload = (await response.json()) as {
              characters?: Array<Record<string, unknown>>;
            };
            (payload.characters ?? []).forEach(item => {
              const id = typeof item.id === 'string' ? item.id : null;
              if (!id) return;

              foundCharacters[id] = {
                id,
                name: typeof item.name === 'string' && item.name.trim() ? item.name : '커스텀 캐릭터',
                summary: typeof item.summary === 'string' ? item.summary : '',
                greeting: typeof item.greeting === 'string' ? item.greeting : '',
                longDescription:
                  typeof item.longDescription === 'string'
                    ? item.longDescription
                    : typeof item.instructions === 'string'
                    ? item.instructions
                    : '',
                avatarUrl:
                  typeof item.avatarUrl === 'string' && item.avatarUrl.trim()
                    ? item.avatarUrl
                    : DEFAULT_CHARACTER_AVATAR,
                categories: Array.isArray(item.categories)
                  ? item.categories.filter((c): c is string => typeof c === 'string')
                  : [],
                videoUrl: typeof item.videoUrl === 'string' ? item.videoUrl : null
              };
            });
          }
        } catch (e) {
          console.error('Failed to fetch private characters', e);
        }
      }

      // Step 2: For any characters still missing, try the public endpoint
      const stillMissing = missing.filter(id => !foundCharacters[id]);
      if (stillMissing.length > 0) {
        await Promise.all(
          stillMissing.map(async id => {
            try {
              const response = await fetch(`/api/characters/${id}`);
              if (response.ok) {
                const payload = (await response.json()) as { character: Record<string, unknown> };
                const item = payload.character;
                foundCharacters[id] = {
                  id: id,
                  name: typeof item.name === 'string' && item.name.trim() ? item.name : '커스텀 캐릭터',
                  summary: typeof item.shortDescription === 'string' ? item.shortDescription : '',
                  greeting: typeof item.greeting === 'string' ? item.greeting : '',
                  longDescription:
                    typeof item.longDescription === 'string'
                      ? item.longDescription
                      : typeof item.instructions === 'string'
                      ? item.instructions
                      : '',
                  avatarUrl:
                    typeof item.avatarUrl === 'string' && item.avatarUrl.trim()
                      ? item.avatarUrl
                      : DEFAULT_CHARACTER_AVATAR,
                  categories: Array.isArray(item.categories)
                    ? item.categories.filter((c): c is string => typeof c === 'string')
                    : [],
                  videoUrl: typeof item.videoUrl === 'string' ? item.videoUrl : null
                };
              }
            } catch (e) {
              console.error(`Failed to fetch public character ${id}`, e);
            }
          })
        );
      }

      if (Object.keys(foundCharacters).length) {
        setCustomCharacters(prev => ({ ...prev, ...foundCharacters }));
        setCharacterNames(prev => {
          const next = { ...prev };
          Object.entries(foundCharacters).forEach(([id, profile]) => {
            if (profile.name?.trim()) {
              next[id] = profile.name.trim();
            }
          });
          return next;
        });
      }
    },
    [setCharacterNames, setCustomCharacters]
  );

  const persistLyrics = useCallback(async (options: PersistLyricsOptions) => {
  const { lyrics, title, threadId, characterId, characterName, idToken } = options;
  const trimmedLyrics = lyrics.trim();

  if (!trimmedLyrics) {
    return;
  }

  const firstMeaningfulLine =
    trimmedLyrics
      .split(/\r?\n/)
      .map(line => line.trim())
      .find(line => line.length > 0) ?? '';

  const autoTitle = title?.trim()
    ? title.trim()
    : firstMeaningfulLine
      ? firstMeaningfulLine.slice(0, 60)
      : characterName
        ? `${characterName}의 새 노래`
        : `자동 저장 ${new Date().toLocaleString()}`;

  try {
    await fetch('/api/profile/songs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({
        title: autoTitle,
        lyrics: trimmedLyrics,
        characterId,
        threadId,
        metadata: {
          source: 'auto-from-chat',
          characterName: characterName ?? null,
          storedAt: new Date().toISOString()
        }
      })
    });
  } catch (storeError) {
    console.error('Failed to store lyrics automatically', storeError);
  }
}, []);

useEffect(() => {
  if (!user) {
    setCustomCharacters({});
    setCharacterNames({ ...BASE_CHARACTER_NAMES });
  }
}, [user]);

useEffect(() => {
  customCharactersRef.current = customCharacters;
}, [customCharacters]);

const requestedCharacterId = useMemo(() => {
  if (Array.isArray(router.query.characterId)) {
    return router.query.characterId[0] ?? null;
  }

  return typeof router.query.characterId === 'string' ? router.query.characterId : null;
}, [router.query.characterId]);

const characterId = requestedCharacterId ?? '1';

  useEffect(() => {
    if (!characterId) {
      return;
    }

    if (CHARACTER_PROFILES[characterId] || customCharacters[characterId]) {
      return;
    }

    let cancelled = false;

    const loadCharacter = async () => {
      try {
        const idToken = user ? await user.getIdToken() : null;
        if (cancelled) {
          return;
        }
        await fetchCustomCharacters([characterId], idToken);
      } catch {
        // ignore single fetch failure
      }
    };

    void loadCharacter();

    return () => {
      cancelled = true;
    };
  }, [characterId, customCharacters, fetchCustomCharacters, user]);

  const character: ResolvedCharacter = useMemo(() => {
    if (CHARACTER_PROFILES[characterId]) {
      const base = CHARACTER_PROFILES[characterId];
      return {
        id: characterId,
        name: getCharacterName(characterId, base.name) ?? base.name,
        avatar: base.avatar,
        description: base.description,
        availability: base.availability,
        greeting: base.greeting,
        videoUrl: base.videoUrl ?? null
      };
    }

    const custom = customCharacters[characterId];
    if (custom) {
      return {
        id: characterId,
        name:
          getCharacterName(characterId, custom.name) ?? custom.name ?? 'Custom character',
        avatar: custom.avatarUrl ?? DEFAULT_CHARACTER_AVATAR,
        description:
          custom.summary || custom.longDescription || 'User-created custom character.',
        availability: custom.categories[0]
          ? `Tag: ${custom.categories[0]}`
          : 'Custom character',
        greeting: custom.greeting || 'Hello! Shall we create a song together?',
        videoUrl: custom.videoUrl ?? null
      };
    }

    const fallbackName = getCharacterName(characterId, null);
    if (fallbackName) {
      return {
        id: characterId ?? '1',
        name: fallbackName,
        avatar: CHARACTER_PROFILES['1'].avatar,
        description: TEXT.summaryFallback,
        availability: TEXT.defaultTag,
        greeting: 'Hi! Ready to start a new chat?',
        videoUrl: null
      };
    }

    const fallback = CHARACTER_PROFILES['1'];
    return {
      id: '1',
      name: fallback.name,
      avatar: fallback.avatar,
      description: fallback.description,
      availability: fallback.availability,
      greeting: fallback.greeting,
      videoUrl: fallback.videoUrl ?? null
    };
  }, [characterId, customCharacters, getCharacterName]);

  const shouldUseFallbackPlaylist =
    !character.videoUrl && !CHAT_VIDEO_EMBED_URL && fallbackVideoIds.length > 0;

  useEffect(() => {
    isVideoMutedRef.current = isVideoMuted;
  }, [isVideoMuted]);

  useEffect(() => {
    videoVolumeRef.current = videoVolume;
  }, [videoVolume]);

  useEffect(() => {
    if (!shouldUseFallbackPlaylist) {
      setActiveFallbackId(null);
      return;
    }

    setActiveFallbackId(prev => {
      if (prev && fallbackVideoIds.includes(prev)) {
        return prev;
      }
      return pickNextFallbackId(null);
    });
  }, [shouldUseFallbackPlaylist, fallbackVideoIds, pickNextFallbackId]);

  useEffect(() => {
    if (!shouldUseFallbackPlaylist) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    if (window.YT && typeof window.YT.Player === 'function') {
      setIsYouTubeApiReady(true);
      return;
    }

    const scriptId = 'youtube-iframe-api';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.body.appendChild(script);
    }

    const handleReady = () => {
      setIsYouTubeApiReady(true);
    };

    const previous = window.onYouTubeIframeAPIReady;
    const wrapped = () => {
      previous?.();
      handleReady();
    };
    window.onYouTubeIframeAPIReady = wrapped;

    return () => {
      if (window.onYouTubeIframeAPIReady === wrapped) {
        window.onYouTubeIframeAPIReady = previous;
      }
    };
  }, [shouldUseFallbackPlaylist]);

  useEffect(() => {
    if (!shouldUseFallbackPlaylist) {
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.destroy();
        youtubePlayerRef.current = null;
      }
      stopMuteMonitor();
      return;
    }

    if (
      typeof window === 'undefined' ||
      !isYouTubeApiReady ||
      !youtubeContainerRef.current ||
      !window.YT?.Player
    ) {
      return;
    }

    if (youtubePlayerRef.current) {
      startMuteMonitor();
      return;
    }

    const initialVideoId = activeFallbackId ?? pickNextFallbackId(null);
    if (!initialVideoId) {
      return;
    }

    if (!activeFallbackId) {
      setActiveFallbackId(initialVideoId);
    }

    const player = new window.YT.Player(youtubeContainerRef.current, {
      width: '100%',
      height: '100%',
      videoId: initialVideoId,
      playerVars: {
        autoplay: 1,
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
        controls: 1,
        mute: 1
      },
      events: {
        onReady: (event: any) => {
          applyPlayerMuteState(event?.target, isVideoMutedRef.current);
          applyPlayerVolumeState(event?.target, videoVolumeRef.current);
          if (typeof event?.target?.playVideo === 'function') {
            event.target.playVideo();
          }
          syncMutePreferenceFromPlayer();
          startMuteMonitor();
        },
        onStateChange: (event: any) => {
          syncMutePreferenceFromPlayer();
          if (event?.data === window.YT?.PlayerState?.ENDED) {
            setActiveFallbackId(prev => pickNextFallbackId(prev));
          }
        }
      }
    });

    youtubePlayerRef.current = player;

    return () => {
      stopMuteMonitor();
      player.destroy();
      youtubePlayerRef.current = null;
    };
  }, [
    shouldUseFallbackPlaylist,
    isYouTubeApiReady,
    activeFallbackId,
    pickNextFallbackId,
    startMuteMonitor,
    stopMuteMonitor,
    syncMutePreferenceFromPlayer,
    applyPlayerMuteState,
    applyPlayerVolumeState
  ]);

  useEffect(() => {
    if (!shouldUseFallbackPlaylist || !activeFallbackId) {
      return;
    }

    if (youtubePlayerRef.current && typeof youtubePlayerRef.current.loadVideoById === 'function') {
      youtubePlayerRef.current.loadVideoById(activeFallbackId);
      applyPlayerMuteState(youtubePlayerRef.current, isVideoMutedRef.current);
      applyPlayerVolumeState(youtubePlayerRef.current, videoVolumeRef.current);
    }
  }, [activeFallbackId, shouldUseFallbackPlaylist, applyPlayerMuteState, applyPlayerVolumeState]);

  useEffect(() => {
    if (!shouldUseFallbackPlaylist) {
      return;
    }
    const player = youtubePlayerRef.current;
    if (!player) {
      return;
    }

    if (pendingPlayerSyncRef.current) {
      pendingPlayerSyncRef.current = false;
      return;
    }

    applyPlayerMuteState(player, isVideoMuted);
    if (pendingVolumeSyncRef.current) {
      pendingVolumeSyncRef.current = false;
      return;
    }
    if (!isVideoMuted) {
      applyPlayerVolumeState(player, videoVolume);
    }
  }, [isVideoMuted, videoVolume, shouldUseFallbackPlaylist, applyPlayerMuteState, applyPlayerVolumeState]);

  useEffect(() => {
    setThreadId(null);
    lastLoadedThreadRef.current = null;
  }, [characterId]);

  useEffect(() => {
    lastStoredMessageIdRef.current = null;
  }, [threadId, characterId]);

  const isUserTyping = input.trim().length > 0;
  const statusVariant = isLoading ? 'assistant' : isUserTyping ? 'user' : 'idle';
  const statusMessage = isLoading
    ? tChat('status.assistantTyping', { replacements: { name: character.name } })
    : isUserTyping
      ? tChat('status.userTyping')
      : tChat('status.ready', { replacements: { name: character.name } });

  const videoSourceMeta = useMemo(() => {
    const raw = character.videoUrl ?? CHAT_VIDEO_EMBED_URL ?? null;

    if (!raw) {
      return {
        url: null as string | null,
        isDirect: false,
        status: shouldUseFallbackPlaylist ? '랜덤 재생 중' : '링크 미설정'
      };
    }

    if (DIRECT_VIDEO_FILE_PATTERN.test(raw)) {
      return {
        url: raw,
        isDirect: true,
        status: '준비 완료'
      };
    }

    return {
      url: normaliseYouTubeEmbedUrl(raw),
      isDirect: false,
      status: '준비 완료'
    };
  }, [character.videoUrl, shouldUseFallbackPlaylist]);

  const videoPanelUrl = videoSourceMeta.url;
  const isDirectVideoSource = videoSourceMeta.isDirect;
  const videoPanelStatus = videoSourceMeta.status;

  const resolveCharacterMeta = useCallback(
    (id?: string | null) => {
      if (!id) {
        return null;
      }

      const trimmedId = id.trim();
      if (!trimmedId) {
        return null;
      }

      if (CHARACTER_PROFILES[trimmedId]) {
        const base = CHARACTER_PROFILES[trimmedId];
        return {
          id: trimmedId,
          name: getCharacterName(trimmedId, base.name) ?? base.name,
          avatar: base.avatar,
          description: base.description
        };
      }

      const custom = customCharacters[trimmedId];
      if (custom) {
        return {
          id: trimmedId,
          name:
            getCharacterName(trimmedId, custom.name) ?? custom.name ?? 'Custom character',
          avatar: custom.avatarUrl ?? DEFAULT_CHARACTER_AVATAR,
          description:
            custom.summary || custom.longDescription || 'User-created custom character.'
        };
      }

      const inferredName = getCharacterName(trimmedId, null);
      if (inferredName) {
        return {
          id: trimmedId,
          name: inferredName,
          avatar: DEFAULT_CHARACTER_AVATAR,
  summaryFallback: '사용자가 만든 맞춤형 캐릭터입니다.',
        };
      }

      return null;
    },
    [customCharacters, getCharacterName]
  );

  const handleRolePromptSelect = useCallback(
    (promptText: string) => {
      setInput(promptText);
      if (chatInputRef.current) {
        chatInputRef.current.focus();
      }
    },
    [setInput]
  );

  const sidebar = useMemo(
    () => (
      <MainSidebar active="chat">
        <div>
          <p className="section-title">{TEXT.sidebarTitle}</p>
          <div className="sidebar-list" style={{ marginTop: 14 }}>
            {sidebarLoading ? (
              <div className="sidebar-item">
                <div className="sidebar-item__icon">\u23F3</div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{TEXT.loadingTitle}</p>
                  <p
                    style={{
                      margin: '4px 0 0',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem'
                    }}
                  >
                    {TEXT.loadingDescription}
                  </p>
                </div>
              </div>
            ) : null}

            {!sidebarLoading && sidebarError ? (
              <div className="sidebar-item">
                <div className="sidebar-item__icon">\u26A0\uFE0F</div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{TEXT.errorTitle}</p>
                  <p
                    style={{
                      margin: '4px 0 0',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem'
                    }}
                  >
                    {sidebarError}
                  </p>
                </div>
              </div>
            ) : null}

            {!sidebarLoading && !sidebarError && sidebarConversations.length === 0 ? (
              <div className="sidebar-item">
                <div className="sidebar-item__icon">\uD83D\uDCAC</div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{TEXT.emptyTitle}</p>
                  <p
                    style={{
                      margin: '4px 0 0',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem'
                    }}
                  >
                    {TEXT.emptyDescription}
                  </p>
                </div>
              </div>
            ) : null}

            {!sidebarLoading && !sidebarError
              ? sidebarConversations.map(conversation => {
                  const conversationCharacter = resolveCharacterMeta(conversation.characterId);

                  return (
                    <button
                      key={conversation.threadId}
                      type="button"
                      className="sidebar-item"
                      onClick={() =>
                        router.push({
                          pathname: '/chat',
                          query: {
                            threadId: conversation.threadId,
                            characterId: conversation.characterId ?? characterId
                          }
                        })
                      }
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
                        <span className="sidebar-item__icon">\uD83D\uDCA0</span>
                      )}
                      <div>
                        <p style={{ fontWeight: 600, margin: 0 }}>
                          {conversationCharacter?.name ||
                            conversation.title ||
                            `Thread ${conversation.threadId.slice(0, 6)}`}
                        </p>
                        <p
                          style={{
                            color: 'var(--text-secondary)',
                            margin: '4px 0 0',
                            fontSize: '0.8rem'
                          }}
                        >
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
                onClick={() => handleRolePromptSelect(prompt.prompt)}
              >
                {prompt.emoji} {prompt.label}
              </button>
            ))}
          </div>
        </div>
      </MainSidebar>
    ),
    [
      characterId,
      resolveCharacterMeta,
      router,
      sidebarConversations,
      sidebarError,
      sidebarLoading,
      handleRolePromptSelect
    ]
  );

  useEffect(() => {
    if (threadId || isLoading) {
      return;
    }

    if (character.greeting) {
      setMessages([
        {
          id: 'intro',
          role: 'assistant',
          content: character.greeting
        }
      ]);
    } else {
      setMessages([]);
    }
    setError(null);
  }, [character, threadId, isLoading]);

  const scrollToLatest = useCallback(() => {
    if (!scrollContainerRef.current) {
      return;
    }
    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToLatest();
  }, [messages, isLoading, scrollToLatest]);

  useEffect(() => {
    if (!user) {
      setSidebarConversations([]);
      return;
    }

    let cancelled = false;

    const fetchConversationList = async (
      idToken: string,
      options?: { characterId?: string | null; limit?: number }
    ): Promise<ConversationSummary[]> => {
      if (cancelled) {
        return [];
      }

      const searchParams = new URLSearchParams();
      const requestedLimit =
        typeof options?.limit === 'number' && Number.isFinite(options.limit)
          ? Math.floor(options.limit)
          : 20;
      const safeLimit = Math.min(Math.max(requestedLimit, 1), 50);
      searchParams.set('limit', String(safeLimit));

      if (options?.characterId) {
        searchParams.set('characterId', options.characterId);
      }

      const response = await fetch(`/api/profile/conversations?${searchParams.toString()}`, {
        headers: { Authorization: `Bearer ${idToken}` }
      });

      if (!response.ok) {
        throw new Error((await response.text()) || TEXT.errorDescription);
      }

      if (cancelled) {
        return [];
      }

      const payload = (await response.json()) as { conversations?: any[] };

      return (payload.conversations ?? []).map(item => ({
        id: item.id,
        threadId: item.threadId ?? item.id,
        title: item.title ?? null,
        lastMessagePreview: item.lastMessagePreview ?? '',
        updatedAt: item.updatedAt ?? null,
        characterId: item.characterId ?? null
      }));
    };

    const loadConversations = async (idToken: string) => {
      if (cancelled) return [];
      setSidebarLoading(true);
      setSidebarError(null);
      try {
        const items = await fetchConversationList(idToken);
        if (cancelled) return [];
        setSidebarConversations(items);
        if (items.length) {
          setCharacterNames(prev => {
            const next = { ...prev };
            items.forEach(item => {
              if (item.characterId && item.title && item.title.trim()) {
                next[item.characterId] = item.title.trim();
              }
            });
            return next;
          });
        }

        const idsToPreload = items
          .map(item => item.characterId)
          .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

        if (idsToPreload.length) {
          await fetchCustomCharacters(idsToPreload, idToken);
        }

        return items;
      } catch (err) {
        if (cancelled) return [];
        setSidebarError(err instanceof Error ? err.message : TEXT.errorDescription);
        return [];
      } finally {
        if (!cancelled) setSidebarLoading(false);
      }
    };

    const loadThreadDetails = async (idToken: string, threadIdToLoad: string) => {
      if (cancelled) return;
      setIsLoading(true);
      try {
        const response = await fetch(`/api/profile/conversations/${threadIdToLoad}?limit=100`, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        if (!response.ok) return;

        const payload = (await response.json()) as {
          conversation?: { threadId?: string | null; characterId?: string | null };
          messages?: Array<{ id: string; role: string; content?: string }>;
        };
        if (cancelled) return;

        const fetchedMessages =
          (payload.messages ?? []).map<ChatMessage>(m => ({
            id: m.id,
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content ?? ''
          }));

        const resolvedThreadId = payload.conversation?.threadId ?? threadIdToLoad;
        setThreadId(resolvedThreadId);
        lastLoadedThreadRef.current = resolvedThreadId;

        const relatedCharacterId =
          typeof payload.conversation?.characterId === 'string'
            ? payload.conversation.characterId
            : null;
        if (relatedCharacterId) {
          await fetchCustomCharacters([relatedCharacterId], idToken);
        }
        const cleaned = normaliseMessages(fetchedMessages);
        if (cleaned.length) {
          setMessages(cleaned);
          setError(null);
          if (typeof window !== 'undefined') {
            window.requestAnimationFrame(scrollToLatest);
          } else {
            scrollToLatest();
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(TEXT.errorDescription);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    const initialize = async () => {
      const idToken = await user.getIdToken();
      const conversations = await loadConversations(idToken);
      if (characterId) {
        await fetchCustomCharacters([characterId], idToken);
      }

      const preferredThreadId =
        typeof router.query.threadId === 'string' ? router.query.threadId : null;

      if (preferredThreadId) {
        if (lastLoadedThreadRef.current !== preferredThreadId) {
          await loadThreadDetails(idToken, preferredThreadId);
        }
        return;
      }

      let latestForChar = conversations?.find(c => c.characterId === characterId);
      const hasExplicitCharacterSelection = Boolean(requestedCharacterId);

      if (!latestForChar && characterId) {
        try {
          const filtered = await fetchConversationList(idToken, {
            characterId,
            limit: 1
          });
          if (filtered.length) {
            latestForChar = filtered[0];
          }
        } catch (characterLoadError) {
          console.warn('Failed to load recent conversation for character', {
            error: characterLoadError
          });
        }
      }

      if (hasExplicitCharacterSelection) {
        if (latestForChar) {
          await loadThreadDetails(idToken, latestForChar.threadId);
          router.replace(
            {
              pathname: '/chat',
              query: { characterId, threadId: latestForChar.threadId }
            },
            undefined,
            { shallow: true }
          );
        }
        return;
      }

      if (latestForChar) {
        await loadThreadDetails(idToken, latestForChar.threadId);
        router.replace(
          {
            pathname: '/chat',
            query: { characterId, threadId: latestForChar.threadId }
          },
          undefined,
          { shallow: true }
        );
        return;
      }

      const mostRecentConversation = conversations?.[0];
      if (mostRecentConversation) {
        await loadThreadDetails(idToken, mostRecentConversation.threadId);
        const fallbackCharacterId = mostRecentConversation.characterId ?? characterId ?? '1';
        router.replace(
          {
            pathname: '/chat',
            query: {
              characterId: fallbackCharacterId,
              threadId: mostRecentConversation.threadId
            }
          },
          undefined,
          { shallow: true }
        );
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
}, [characterId, fetchCustomCharacters, requestedCharacterId, router, router.query.threadId, scrollToLatest, user]);

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
      if (!user) {
        throw new Error(TEXT.sessionExpired);
      }

      const idToken = await user.getIdToken();
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          message: trimmed,
          threadId,
          characterId
        })
      });

      const raw = await response.text();

      if (!response.ok) {
        let errorMessage = 'Assistant request failed.';

        try {
          const errorPayload = JSON.parse(raw) as { error?: string };

          if (response.status === 401) {
            errorMessage = errorPayload?.error ?? TEXT.sessionExpired;
          } else if (response.status === 429) {
            errorMessage = errorPayload?.error ?? TEXT.rateLimited;
          } else if (errorPayload?.error) {
            errorMessage = errorPayload.error;
          }
        } catch {
          if (response.status === 401) {
            errorMessage = TEXT.sessionExpired;
          } else if (response.status === 429) {
            errorMessage = TEXT.rateLimited;
          }
        }

        throw new Error(errorMessage);
      }

      const data: {
        threadId: string;
        messages: Array<{
          id: string;
          role: 'user' | 'assistant';
          content: string;
        }>;
        reply: ChatMessage | null;
      } = raw ? JSON.parse(raw) : { threadId: '', messages: [], reply: null };

      setThreadId(data.threadId);
      if (data.threadId) {
        lastLoadedThreadRef.current = data.threadId;
      }

      if (data.threadId && router.query.threadId !== data.threadId) {
        router.replace(
          {
            pathname: '/chat',
            query: { characterId, threadId: data.threadId }
          },
          undefined,
          { shallow: true }
        );
      }

      if (data.messages?.length) {
        setMessages(prev => {
          const intro = prev[0]?.id === 'intro' ? [prev[0]] : [];
          const cleaned = normaliseMessages(data.messages);
          return [...intro, ...cleaned];
        });
      } else if (data.reply) {
        const replyMessage = data.reply;
        setMessages(prev => {
          const intro = prev[0]?.id === 'intro' ? [prev[0]] : [];
          const history = prev.filter(item => item.id !== 'intro');
          const cleaned = normaliseMessages([...history, replyMessage]);
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

      setSidebarConversations(prev => {
        const lastAssistantMessage =
          [...(data.messages ?? [])]
            .reverse()
            .find(entry => entry.role === 'assistant' && entry.content.trim().length > 0) ??
          data.reply ??
          null;

        const previewText =
          lastAssistantMessage?.content.trim() ||
          trimmed;

        const existing = prev.find(item => item.threadId === data.threadId);
        const updated: ConversationSummary = {
          id: existing?.id ?? data.threadId,
          threadId: data.threadId,
          title: existing?.title ?? getCharacterName(characterId, character.name),
          lastMessagePreview: previewText,
          updatedAt: new Date().toISOString(),
          characterId
        };

      const next = [updated, ...prev.filter(item => item.threadId !== data.threadId)];
      return next.slice(0, 20);
    });

      const assistantMessages: Array<{ id?: string; content: string }> = [
        ...(data.reply && data.reply.role === 'assistant' ? [data.reply] : []),
        ...((data.messages ?? [])
          .slice()
          .reverse()
          .filter(
            entry =>
              entry.role === 'assistant' &&
              typeof entry.content === 'string' &&
              entry.content.trim().length > 0
          ) as Array<{ id: string; content: string }>)
      ];

      const lastAssistantMessage =
        assistantMessages.find(message => message.content.trim().length > 0) ?? null;

      if (
        autoSaveLyrics &&
        lastAssistantMessage &&
        isLikelyLyrics(lastAssistantMessage.content) &&
        data.threadId &&
        lastStoredMessageIdRef.current !== lastAssistantMessage.id
      ) {
        lastStoredMessageIdRef.current =
          lastAssistantMessage.id ?? `lyrics-${Date.now()}`;
        void persistLyrics({
          lyrics: lastAssistantMessage.content,
          threadId: data.threadId,
          characterId,
          characterName: character.name,
          idToken
        });
      }

      if (characterId) {
        const resolvedName = getCharacterName(characterId, character.name);
        if (resolvedName) {
          setCharacterNames(prev => {
            if (prev[characterId] === resolvedName) {
              return prev;
            }
            return { ...prev, [characterId]: resolvedName };
          });
        }
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

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();

      const trimmed = input.trim();
      if (!trimmed || isLoading) {
        return;
      }

      const formElement = formRef.current;

      if (!formElement) {
        return;
      }

      if (typeof formElement.requestSubmit === 'function') {
        formElement.requestSubmit();
        return;
      }

      formElement.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  };

  return (
    <RequireAuth>
      <div className="chat-page">
        <AppShell sidebar={sidebar}>
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
                    <Image
                      src={character.avatar}
                      alt={`${character.name} avatar`}
                      width={32}
                      height={32}
                      style={{ borderRadius: 12, marginTop: 4 }}
                    />
                    <div className="chat-message__bubble chat-message__bubble--assistant typing-indicator-wrapper">
                      <div className="typing-indicator">
                        <span className="typing-indicator__dot" />
                        <span className="typing-indicator__dot" />
                        <span className="typing-indicator__dot" />
                      </div>
                      <span className="typing-indicator__label">
                        {tChat('typingIndicator.assistant')}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              <form ref={formRef} onSubmit={handleSubmit} className="chat-footer">
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
                ref={chatInputRef}
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={tChat('inputPlaceholder')}
              />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="btn btn--primary"
                    style={{ paddingInline: 24 }}
                  >
                    {tChat('send')}
                  </button>
                </div>
                <div className="chat-footer__options" style={{ marginTop: 12 }}>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: '0.78rem',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={autoSaveLyrics}
                      onChange={handleToggleAutoSave}
                    />
                    <span>가사 자동 저장</span>
                  </label>
                </div>
                {error ? (
                  <p style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--danger)' }}>
                    {error}
                  </p>
                ) : null}
              </form>
            </div>
          </div>

          <aside className="chat-stage__video">
            <div className="chat-video-panel">
              <div className="chat-video-panel__header">
                <div>
                  <p className="chat-video-panel__title">Music Video</p>
                  <span className="chat-video-panel__subtitle">9:16 Vertical</span>
                </div>
                <span className="chat-video-panel__status">{videoPanelStatus}</span>
              </div>
              <div className="chat-video-panel__media">
                  <div
                    className={`chat-video-frame${
                      videoPanelUrl || shouldUseFallbackPlaylist ? '' : ' chat-video-frame--empty'
                    }`}
                  >
                  {videoPanelUrl ? (
                    isDirectVideoSource ? (
                      <video
                        key={videoPanelUrl}
                        src={videoPanelUrl}
                        controls
                        playsInline
                        muted={isVideoMuted}
                        preload="metadata"
                        poster={character.avatar}
                        onLoadedMetadata={event => {
                          event.currentTarget.volume = videoVolumeRef.current;
                        }}
                        onVolumeChange={event => {
                          const target = event.currentTarget;
                          const nextMuted = target.muted;
                          const nextVolume = Math.max(0, Math.min(1, target.volume));
                          setIsVideoMuted(prev => (prev === nextMuted ? prev : nextMuted));
                          setVideoVolume(prev =>
                            Math.abs(prev - nextVolume) < 0.01 ? prev : nextVolume
                          );
                        }}
                      />
                    ) : (
                      <iframe
                        src={videoPanelUrl}
                        title={`${character.name} video`}
                        allow="autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                      />
                    )
                  ) : shouldUseFallbackPlaylist ? (
                    <div className="chat-video-frame__youtube">
                      <div ref={youtubeContainerRef} className="chat-video-frame__youtube-player" />
                      {!isYouTubeApiReady ? (
                        <div className="chat-video-panel__placeholder">
                          <p>영상 로딩 중...</p>
                          <span>잠시만 기다려 주세요.</span>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="chat-video-panel__placeholder">
                      <p>영상이 여기에 표시됩니다</p>
                      <span>
                        환경변수 <code>NEXT_PUBLIC_CHAT_VIDEO_URL</code> 로 링크를 지정하세요.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
        </AppShell>
      </div>
    </RequireAuth>
  );
}
