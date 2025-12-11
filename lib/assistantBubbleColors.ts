const DAYEON_CHARACTER_ID = '1';
const DAYEON_NAME = 'dayeon';

export const ASSISTANT_BUBBLE_COLORS = [
  '#DC2626',
  '#EA580C',
  '#D97706',
  '#059669',
  '#2563EB',
  '#7C3AED',
  '#DB2777'
] as const;

const normalise = (value?: string | null) => (value ?? '').trim().toLowerCase();

const hashSeed = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const isDayeonAssistant = (id?: string | null, name?: string | null) => {
  if (!id && !name) {
    return false;
  }
  if (id && id === DAYEON_CHARACTER_ID) {
    return true;
  }
  return normalise(name) === DAYEON_NAME;
};

export const getAssistantBubbleColor = (seed?: string | null) => {
  const source = seed && seed.trim().length > 0 ? seed : `${Date.now()}`;
  const hash = hashSeed(source);
  const index = hash % ASSISTANT_BUBBLE_COLORS.length;
  return ASSISTANT_BUBBLE_COLORS[index];
};
