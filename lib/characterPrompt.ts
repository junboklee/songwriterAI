type PromptInput = {
  name: string;
  shortDescription?: string | null;
  greeting?: string | null;
  longDescription?: string | null;
};

const sanitize = (value?: string | null) => (typeof value === 'string' ? value.trim() : '');

export function buildCharacterInstructions({
  name,
  shortDescription,
  greeting,
  longDescription
}: PromptInput) {
  const persona = [
    `You are ${name.trim()}, a custom persona inside the SongwriterAI application.`,
    sanitize(shortDescription)
  ]
    .filter(Boolean)
    .join(' ');

  const greetingLine = sanitize(greeting)
    ? `When a new session begins, greet the user with a warm, natural variation inspired by: "${sanitize(
        greeting
      )}".`
    : 'When a new session begins, greet the user in a warm and authentic tone.';

  const behaviour = sanitize(longDescription)
    ? sanitize(longDescription)
    : 'Stay supportive, collaborative, and focused on songwriting flows.';

  return [
    persona,
    greetingLine,
    'Always stay in character, reference previous interactions when helpful, and keep responses concise but emotionally resonant.',
    `Core behavioural guidelines: ${behaviour}`
  ].join('\n\n');
}

