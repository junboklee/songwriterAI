import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';

import {
  CHARACTER_PROFILES,
  TEXT,
  type CharacterMeta,
  type CustomCharacterProfile,
  type ResolvedCharacter
} from '@/lib/chat/model';
import { DEFAULT_CHARACTER_AVATAR } from '@/lib/constants';
import { DEFAULT_CHARACTER_NAMES } from '@/lib/defaultCharacterNames';

const BASE_CHARACTER_NAMES = { ...DEFAULT_CHARACTER_NAMES };

// Private (/api/profile/characters/batch) and public (/api/characters/{id}) payloads differ only
// in where the short summary lives.
const toCustomProfile = (
  id: string,
  item: Record<string, unknown>,
  summaryField: 'summary' | 'shortDescription'
): CustomCharacterProfile => ({
  id,
  name: typeof item.name === 'string' && item.name.trim() ? item.name : '커스텀 캐릭터',
  summary: typeof item[summaryField] === 'string' ? (item[summaryField] as string) : '',
  greeting: typeof item.greeting === 'string' ? item.greeting : '',
  longDescription:
    typeof item.longDescription === 'string'
      ? item.longDescription
      : typeof item.instructions === 'string'
      ? item.instructions
      : '',
  avatarUrl:
    typeof item.avatarUrl === 'string' && item.avatarUrl.trim() ? item.avatarUrl : DEFAULT_CHARACTER_AVATAR,
  categories: Array.isArray(item.categories)
    ? item.categories.filter((c): c is string => typeof c === 'string')
    : [],
  videoUrl: typeof item.videoUrl === 'string' ? item.videoUrl : null
});

// Resolves built-in and custom characters for the chat page: names, profiles and lazy loading.
export function useChatCharacters(user: User | null, characterId: string) {
  const [customCharacters, setCustomCharacters] = useState<Record<string, CustomCharacterProfile>>({});
  const customCharactersRef = useRef<Record<string, CustomCharacterProfile>>({});
  const [characterNames, setCharacterNames] = useState<Record<string, string>>(() => ({
    ...BASE_CHARACTER_NAMES
  }));

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

  const fetchCustomCharacters = useCallback(async (ids: string[], idToken: string | null) => {
    const uniqueIds = Array.from(
      new Set(ids.map(id => (typeof id === 'string' ? id.trim() : '')).filter(id => id.length > 0))
    );

    const missing = uniqueIds.filter(id => !CHARACTER_PROFILES[id] && !customCharactersRef.current[id]);
    if (!missing.length) {
      return;
    }

    const foundCharacters: Record<string, CustomCharacterProfile> = {};

    // Step 1: the user's own characters (private ones included) when logged in.
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
          const payload = (await response.json()) as { characters?: Array<Record<string, unknown>> };
          (payload.characters ?? []).forEach(item => {
            if (typeof item.id === 'string') {
              foundCharacters[item.id] = toCustomProfile(item.id, item, 'summary');
            }
          });
        }
      } catch (e) {
        console.error('Failed to fetch private characters', e);
      }
    }

    // Step 2: anything still missing from the public catalogue.
    const stillMissing = missing.filter(id => !foundCharacters[id]);
    await Promise.all(
      stillMissing.map(async id => {
        try {
          const response = await fetch(`/api/characters/${id}`);
          if (response.ok) {
            const payload = (await response.json()) as { character: Record<string, unknown> };
            foundCharacters[id] = toCustomProfile(id, payload.character, 'shortDescription');
          }
        } catch (e) {
          console.error(`Failed to fetch public character ${id}`, e);
        }
      })
    );

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
        name: getCharacterName(characterId, custom.name) ?? custom.name ?? 'Custom character',
        avatar: custom.avatarUrl ?? DEFAULT_CHARACTER_AVATAR,
        description: custom.summary || custom.longDescription || 'User-created custom character.',
        availability: custom.categories[0] ? `Tag: ${custom.categories[0]}` : 'Custom character',
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

  const resolveCharacterMeta = useCallback(
    (id?: string | null): CharacterMeta | null => {
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
          name: getCharacterName(trimmedId, custom.name) ?? custom.name ?? 'Custom character',
          avatar: custom.avatarUrl ?? DEFAULT_CHARACTER_AVATAR,
          description: custom.summary || custom.longDescription || 'User-created custom character.'
        };
      }

      const inferredName = getCharacterName(trimmedId, null);
      if (inferredName) {
        return {
          id: trimmedId,
          name: inferredName,
          avatar: DEFAULT_CHARACTER_AVATAR,
          description: TEXT.summaryFallback
        };
      }

      return null;
    },
    [customCharacters, getCharacterName]
  );

  return {
    character,
    getCharacterName,
    fetchCustomCharacters,
    resolveCharacterMeta,
    setCharacterNames
  };
}
