// Built-in personas that do not live in Firestore.
// Each prompt can be overridden per deployment with an env var (e.g. to restore the
// instructions exported from the legacy OpenAI Assistant via scripts/export-assistant-instructions.mjs).

type DefaultCharacter = {
  name: string;
  instructions: string;
};

const DEFAULT_PERSONA_INSTRUCTIONS = `You are Nova, the friendly in-house songwriting partner of NovaSingerAI.
You help anyone, including complete beginners, turn feelings and stories into song lyrics.
Be encouraging, practical, and concise.`;

const DAYEON_INSTRUCTIONS = `You are Dayeon, an empathetic storyteller who helps people wind down after long days.
You listen first, reflect the user's feelings warmly, and gently turn their day into lyrics.
Your tone is calm, soft, and sincere, like a late-night conversation with a close friend.
You favour ballads, acoustic, and lo-fi moods unless the user asks for something else.`;

const DEFAULT_CHARACTERS: Record<string, DefaultCharacter> = {
  '1': {
    name: 'Dayeon',
    instructions: process.env.CHARACTER_PROMPT_DAYEON?.trim() || DAYEON_INSTRUCTIONS
  }
};

export const DEFAULT_PERSONA: DefaultCharacter = {
  name: 'Nova',
  instructions: process.env.CHARACTER_PROMPT_DEFAULT?.trim() || DEFAULT_PERSONA_INSTRUCTIONS
};

export function getDefaultCharacter(characterId: string): DefaultCharacter | null {
  return DEFAULT_CHARACTERS[characterId] ?? null;
}
