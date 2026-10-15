import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';

import { CHARACTER_PROFILES, normaliseMessages, type ChatMessage } from '@/lib/chat/model';
import { DEFAULT_CHARACTER_AVATAR } from '@/lib/constants';

export type CharacterPageProfile = {
  id: string;
  name: string;
  avatar: string;
  summary: string;
  greeting: string;
  example: string;
  visibility: 'private' | 'unlisted' | 'public';
};

type CharacterApiPayload = {
  id?: string;
  name?: string | null;
  summary?: string | null;
  shortDescription?: string | null;
  greeting?: string | null;
  example?: string | null;
  longDescription?: string | null;
  avatarUrl?: string | null;
  visibility?: string | null;
};

export const CHARACTER_PAGE_TEXT = {
  sessionExpired: '세션이 만료되었습니다. 다시 로그인해 주세요.',
  rateLimited: '요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.',
  loadError: '캐릭터 정보를 불러오지 못했습니다.',
  notFound: '공개된 캐릭터를 찾을 수 없습니다.',
  loginRequired: '로그인 후 캐릭터와 대화를 시작할 수 있습니다.'
};

const TEXT = CHARACTER_PAGE_TEXT;

export const adaptCharacter = (raw: CharacterApiPayload, fallbackId: string): CharacterPageProfile => {
  const summarySource =
    (typeof raw.summary === 'string' && raw.summary.trim()) ||
    (typeof raw.shortDescription === 'string' && raw.shortDescription.trim()) ||
    '';
  const exampleSource =
    (typeof raw.example === 'string' && raw.example.trim()) ||
    (typeof raw.longDescription === 'string' && raw.longDescription.trim()) ||
    '';
  const visibility = raw.visibility === 'public' || raw.visibility === 'unlisted' ? raw.visibility : 'private';

  return {
    id: raw.id ?? fallbackId,
    name: raw.name?.trim() || `Character ${fallbackId.slice(0, 6)}`,
    avatar: raw.avatarUrl && raw.avatarUrl.trim() ? raw.avatarUrl : DEFAULT_CHARACTER_AVATAR,
    summary: summarySource,
    greeting: raw.greeting ?? '',
    example: exampleSource,
    visibility
  };
};

async function fetchCharacter(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      (payload && typeof payload.error === 'string' && payload.error) ||
        (response.status === 404 ? TEXT.notFound : TEXT.loadError)
    );
  }
  if (!payload?.character) {
    throw new Error(TEXT.notFound);
  }
  return payload.character as CharacterApiPayload;
}

// Loads the character (the owner's private copy first, then the public one) and seeds the
// conversation with its greeting.
export function useCharacterProfile(
  characterId: string | null,
  user: User | null,
  onLoaded: (character: CharacterPageProfile) => void
) {
  const [character, setCharacter] = useState<CharacterPageProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!characterId) {
      setError(TEXT.notFound);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        let raw: CharacterApiPayload | null = null;

        if (user) {
          try {
            const idToken = await user.getIdToken();
            raw = await fetchCharacter(`/api/profile/characters/${characterId}`, {
              headers: { Authorization: `Bearer ${idToken}` }
            });
          } catch (privateError) {
            console.warn('Failed to load private character, falling back to public access.', privateError);
          }
        }

        // Built-in characters (e.g. Dayeon) live in code, not in the public collection.
        const builtIn = CHARACTER_PROFILES[characterId];
        if (!raw && builtIn) {
          raw = {
            id: builtIn.id,
            name: builtIn.name,
            summary: builtIn.description,
            greeting: builtIn.greeting,
            avatarUrl: builtIn.avatar,
            visibility: 'public'
          };
        }
        raw ??= await fetchCharacter(`/api/characters/${characterId}`);
        const normalized = adaptCharacter(raw, characterId);

        if (!cancelled) {
          setCharacter(normalized);
          onLoaded(normalized);
        }
      } catch (loadError) {
        if (!cancelled) {
          setCharacter(null);
          setError(loadError instanceof Error ? loadError.message : TEXT.loadError);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
    // onLoaded is a state-setting callback from the page; reloading only depends on the inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId, user]);

  return { character, loading, error };
}

// Restores the user's most recent conversation with this character, once per character/user.
export function useCharacterConversation(
  characterId: string | null,
  user: User | null,
  onRestored: (threadId: string, messages: ChatMessage[]) => void
) {
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    setHistoryLoaded(false);
  }, [characterId, user?.uid]);

  useEffect(() => {
    if (!user || !characterId || historyLoaded) {
      return;
    }

    let cancelled = false;

    const loadConversationHistory = async () => {
      try {
        const idToken = await user.getIdToken();
        const headers = { Authorization: `Bearer ${idToken}` };
        const listResponse = await fetch(
          `/api/profile/conversations?limit=1&characterId=${encodeURIComponent(characterId)}`,
          { headers }
        );
        const listPayload = (await listResponse.json().catch(() => ({}))) as {
          conversations?: Array<{ id: string; threadId?: string | null }>;
          error?: string;
        };
        if (!listResponse.ok) {
          throw new Error(listPayload.error || TEXT.loadError);
        }

        const match = listPayload.conversations?.[0];
        const targetThreadId = match?.threadId?.trim() ? match.threadId : match?.id;
        if (!targetThreadId) {
          return;
        }

        const detailResponse = await fetch(`/api/profile/conversations/${targetThreadId}?limit=100`, { headers });
        const detailPayload = (await detailResponse.json().catch(() => ({}))) as {
          messages?: Array<{ id?: string; role?: string | null; content?: string | null }>;
          error?: string;
        };
        if (!detailResponse.ok) {
          throw new Error(detailPayload.error || TEXT.loadError);
        }

        const history = normaliseMessages(
          (detailPayload.messages ?? []).map(item => ({
            id: item.id ?? `msg-${Date.now()}`,
            role: item.role === 'user' ? 'user' : 'assistant',
            content: item.content ?? ''
          }))
        );

        if (!cancelled) {
          onRestored(targetThreadId, history);
        }
      } catch (historyError) {
        console.warn('Failed to load conversation history', historyError);
      } finally {
        if (!cancelled) {
          setHistoryLoaded(true);
        }
      }
    };

    void loadConversationHistory();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId, historyLoaded, user]);
}
