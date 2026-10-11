import type { toPublicCharacter } from '@/lib/publicCharacter';

export type PublicCharacter = ReturnType<typeof toPublicCharacter>;

export type ExploreSort = 'recent' | 'popular';

export type ExploreQuery = {
  q?: string | null;
  category?: string | null;
  sort?: ExploreSort;
  offset?: number;
  limit: number;
};

// Likes signal stronger intent than starting a chat.
export const popularityScore = (character: PublicCharacter) =>
  character.likeCount * 3 + character.useCount;

const timestamp = (value: string | null) => (value ? Date.parse(value) || 0 : 0);

const normalize = (value: string | null | undefined) => (value ?? '').toLowerCase().normalize('NFC');

export function topCategories(pool: PublicCharacter[], max = 12) {
  const counts = new Map<string, number>();
  pool.forEach(character =>
    character.categories.forEach(category => counts.set(category, (counts.get(category) ?? 0) + 1))
  );
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([category]) => category);
}

// Filtering, sorting and paging happen in memory over the bounded pool of public characters.
export function queryCharacterPool(pool: PublicCharacter[], query: ExploreQuery) {
  const needle = normalize(query.q?.trim());
  const category = query.category?.trim() || null;

  const matches = pool.filter(character => {
    if (category && !character.categories.includes(category)) {
      return false;
    }
    if (!needle) {
      return true;
    }
    return [character.name, character.shortDescription, character.greeting, ...character.categories]
      .map(normalize)
      .some(text => text.includes(needle));
  });

  matches.sort((a, b) =>
    query.sort === 'popular'
      ? popularityScore(b) - popularityScore(a) || timestamp(b.updatedAt) - timestamp(a.updatedAt)
      : timestamp(b.updatedAt) - timestamp(a.updatedAt)
  );

  const offset = Math.max(0, query.offset ?? 0);
  const items = matches.slice(offset, offset + query.limit);
  const nextOffset = offset + items.length;

  return {
    items,
    total: matches.length,
    nextCursor: nextOffset < matches.length ? nextOffset : null
  };
}
