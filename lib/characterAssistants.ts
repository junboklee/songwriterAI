import OpenAI from 'openai';

const openaiApiKey =
  process.env.APPSECRETS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
const openai = openaiApiKey
  ? new OpenAI({
      apiKey: openaiApiKey
    })
  : null;

const assistantModel = process.env.OPENAI_ASSISTANT_MODEL ?? 'gpt-4o-mini';

type CharacterDescriptor = {
  userId: string;
  characterId: string;
  name: string;
  summary?: string | null;
  greeting?: string | null;
  instructions: string;
  example?: string | null;
};

const sanitize = (value?: string | null) =>
  typeof value === 'string' ? value.trim() : '';

const buildMetadata = (descriptor: CharacterDescriptor) => {
  const metadata: Record<string, string> = {
    application: 'songwriterAI',
    type: 'custom-character',
    userId: descriptor.userId,
    characterId: descriptor.characterId
  };

  const greeting = sanitize(descriptor.greeting);
  if (greeting) {
    metadata.greeting = greeting;
  }

  const summary = sanitize(descriptor.summary);
  if (summary) {
    metadata.summary = summary;
  }

  const example = sanitize(descriptor.example);
  if (example) {
    metadata.example = example;
  }

  return metadata;
};

export async function createCharacterAssistant(descriptor: CharacterDescriptor) {
  if (!openai) {
    throw new Error('OpenAI client is not configured.');
  }

  const instructions = sanitize(descriptor.instructions);

  if (!instructions) {
    throw new Error('instructions are required to create an assistant.');
  }

  const result = await openai.beta.assistants.create({
    name: descriptor.name,
    description: sanitize(descriptor.summary) || undefined,
    instructions,
    model: assistantModel,
    metadata: buildMetadata(descriptor)
  });

  return result.id;
}

export async function updateCharacterAssistant(
  assistantId: string,
  descriptor: CharacterDescriptor
) {
  if (!openai) {
    throw new Error('OpenAI client is not configured.');
  }

  const instructions = sanitize(descriptor.instructions);

  if (!instructions) {
    throw new Error('instructions are required to update an assistant.');
  }

  await openai.beta.assistants.update(assistantId, {
    name: descriptor.name,
    description: sanitize(descriptor.summary) || undefined,
    instructions,
    metadata: buildMetadata(descriptor)
  });

  return assistantId;
}

export async function deleteCharacterAssistant(assistantId: string) {
  if (!openai) {
    throw new Error('OpenAI client is not configured.');
  }

  await openai.beta.assistants.del(assistantId);
}
