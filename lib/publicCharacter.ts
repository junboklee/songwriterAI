import { serializeTimestamp } from '@/lib/firestoreUtils';

const normalizeString = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

// Fields safe to show to anyone. Prompts (instructions/example) and creator ids stay server-side.
export function toPublicCharacter(id: string, data: Record<string, unknown>) {
  const categories = Array.isArray(data.categories)
    ? data.categories.filter(
        (item): item is string => typeof item === 'string' && item.trim().length > 0
      )
    : [];

  const shortDescription = normalizeString(data.shortDescription ?? data.summary);

  return {
    id,
    name: normalizeString(data.name),
    summary: shortDescription,
    shortDescription,
    greeting: normalizeString(data.greeting),
    longDescription: normalizeString(data.longDescription),
    visibility: data.visibility === 'unlisted' ? 'unlisted' : 'public',
    gender: normalizeString(data.gender) ?? 'none',
    avatarUrl: normalizeString(data.avatarUrl),
    categories,
    likeCount: typeof data.likeCount === 'number' ? Math.max(0, data.likeCount) : 0,
    useCount: typeof data.useCount === 'number' ? Math.max(0, data.useCount) : 0,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt)
  };
}
