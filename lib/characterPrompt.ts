type PromptInput = {
  name: string;
  shortDescription?: string | null;
  greeting?: string | null;
  longDescription?: string | null;
  example?: string | null;
};

const sanitize = (value?: string | null) => (typeof value === 'string' ? value.trim() : '');

// Persona section only — the shared songwriting rules are added at request time (lib/llm.ts).
export function buildCharacterInstructions({
  name,
  shortDescription,
  greeting,
  longDescription,
  example
}: PromptInput) {
  const persona = [
    `You are ${name.trim()}, a custom persona inside the NovaSingerAI application.`,
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

  const sections = [
    persona,
    greetingLine,
    'Always stay in character, reference previous interactions when helpful, and keep responses concise but emotionally resonant.',
    `Core behavioural guidelines: ${behaviour}`
  ];

  if (sanitize(example)) {
    sections.push(
      `Example of this persona's writing style (match the tone, do not copy it):\n${sanitize(example)}`
    );
  }

  return sections.join('\n\n');
}
