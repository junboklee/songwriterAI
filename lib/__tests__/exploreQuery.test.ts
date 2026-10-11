import { popularityScore, queryCharacterPool, topCategories, type PublicCharacter } from '@/lib/exploreQuery';

const character = (overrides: Partial<PublicCharacter>): PublicCharacter => ({
  id: 'id',
  name: 'Name',
  summary: null,
  shortDescription: null,
  greeting: null,
  longDescription: null,
  visibility: 'public',
  gender: 'none',
  avatarUrl: null,
  categories: [],
  likeCount: 0,
  useCount: 0,
  createdAt: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides
});

const pool = [
  character({ id: 'a', name: '발라드 장인', categories: ['발라드'], likeCount: 1, useCount: 2, updatedAt: '2026-03-01T00:00:00.000Z' }),
  character({ id: 'b', name: 'Rap Coach', categories: ['힙합'], likeCount: 5, useCount: 0, updatedAt: '2026-01-01T00:00:00.000Z' }),
  character({ id: 'c', name: '캐롤 요정', shortDescription: '크리스마스 발라드', categories: ['발라드', '시즌'], useCount: 10, updatedAt: '2026-02-01T00:00:00.000Z' })
];

describe('queryCharacterPool', () => {
  it('sorts by most recent by default', () => {
    expect(queryCharacterPool(pool, { limit: 10 }).items.map(item => item.id)).toEqual(['a', 'c', 'b']);
  });

  it('sorts by popularity weighting likes above chats', () => {
    expect(popularityScore(pool[1])).toBe(15);
    expect(queryCharacterPool(pool, { limit: 10, sort: 'popular' }).items.map(item => item.id)).toEqual([
      'b',
      'c',
      'a'
    ]);
  });

  it('filters by category and free-text search across name and description', () => {
    expect(queryCharacterPool(pool, { limit: 10, category: '발라드' }).items.map(item => item.id)).toEqual(['a', 'c']);
    expect(queryCharacterPool(pool, { limit: 10, q: '크리스마스' }).items.map(item => item.id)).toEqual(['c']);
    expect(queryCharacterPool(pool, { limit: 10, q: 'rap' }).items.map(item => item.id)).toEqual(['b']);
  });

  it('pages with an offset cursor', () => {
    const first = queryCharacterPool(pool, { limit: 2 });
    expect(first.nextCursor).toBe(2);
    const second = queryCharacterPool(pool, { limit: 2, offset: first.nextCursor ?? 0 });
    expect(second.items.map(item => item.id)).toEqual(['b']);
    expect(second.nextCursor).toBeNull();
  });
});

describe('topCategories', () => {
  it('orders categories by how many characters use them', () => {
    expect(topCategories(pool)).toEqual(['발라드', '시즌', '힙합']);
  });
});
