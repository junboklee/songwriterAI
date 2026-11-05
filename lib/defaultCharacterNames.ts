export const DEFAULT_CHARACTER_NAMES: Record<string, string> = {
  '1': '다연'
};

// Songs and threads saved before the built-in character was renamed in Korean still say 'Dayeon'.
export const displayCharacterName = (name: string) => (name.trim().toLowerCase() === 'dayeon' ? '다연' : name);

