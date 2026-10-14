import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { User } from 'firebase/auth';

import { DEFAULT_CHARACTER_NAMES } from '@/lib/defaultCharacterNames';

const fallbackName = (id: string) => `Character ${id.slice(0, 6)}`;

// Keeps a characterId -> display name map for the given ids, fetching unknown ids in one batch.
export function useCharacterNameMap(
  user: User | null,
  characterIds: Array<string | null | undefined>
): [Record<string, string>, Dispatch<SetStateAction<Record<string, string>>>] {
  const [names, setNames] = useState<Record<string, string>>({ ...DEFAULT_CHARACTER_NAMES });
  const missingKey = Array.from(
    new Set(characterIds.filter((id): id is string => typeof id === 'string' && Boolean(id.trim()) && !names[id]))
  )
    .sort()
    .join(',');

  useEffect(() => {
    if (!user || !missingKey) {
      return;
    }

    const missingIds = missingKey.split(',');
    let cancelled = false;

    const load = async () => {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/profile/characters/batch', {
          method: 'POST',
          headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: missingIds })
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error((payload && typeof payload.error === 'string' && payload.error) || 'Failed to load character details.');
        }

        const payload = (await response.json()) as { characters?: Array<{ id: string; name?: string | null }> };
        const next: Record<string, string> = {};
        (payload.characters ?? []).forEach(item => {
          next[item.id] = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : fallbackName(item.id);
        });
        missingIds.forEach(id => {
          next[id] ??= fallbackName(id);
        });

        if (!cancelled) {
          setNames(prev => ({ ...prev, ...next }));
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [user, missingKey]);

  return [names, setNames];
}
