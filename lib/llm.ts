import OpenAI from 'openai';

import { SONGWRITING_GUIDELINES } from '@/lib/songwritingPrompt';
import type { TokenUsage } from '@/lib/usage';

export type ChatTurn = {
  role: 'user' | 'assistant';
  content: string;
};

type UsageCallback = (usage: TokenUsage) => void;

const CHAT_MODEL =
  process.env.OPENAI_CHAT_MODEL ?? process.env.OPENAI_ASSISTANT_MODEL ?? 'gpt-4o-mini';
const MAX_OUTPUT_TOKENS = 2000;

let client: OpenAI | null = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.APPSECRETS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI client is not configured.');
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

export function buildSystemPrompt(personaInstructions: string) {
  return `${SONGWRITING_GUIDELINES}\n\n# Your persona\n${personaInstructions.trim()}`;
}

const buildRequest = (personaInstructions: string, turns: ChatTurn[]) => ({
  model: CHAT_MODEL,
  instructions: buildSystemPrompt(personaInstructions),
  input: turns.map(turn => ({ role: turn.role, content: turn.content })),
  max_output_tokens: MAX_OUTPUT_TOKENS,
  store: false
});

const toTokenUsage = (usage?: { input_tokens: number; output_tokens: number } | null) =>
  usage ? { inputTokens: usage.input_tokens, outputTokens: usage.output_tokens } : null;

export async function generateReply(
  personaInstructions: string,
  turns: ChatTurn[],
  onUsage?: UsageCallback
) {
  const response = await getClient().responses.create(buildRequest(personaInstructions, turns));
  const usage = toTokenUsage(response.usage);
  if (usage) {
    onUsage?.(usage);
  }
  return response.output_text.trim();
}

// One-shot completion with caller-supplied instructions (no chat persona or <lyrics> format rules).
export async function completeText(
  instructions: string,
  input: string,
  onUsage?: UsageCallback,
  maxOutputTokens = 800
) {
  const response = await getClient().responses.create({
    model: CHAT_MODEL,
    instructions,
    input: [{ role: 'user', content: input }],
    max_output_tokens: maxOutputTokens,
    store: false
  });
  const usage = toTokenUsage(response.usage);
  if (usage) {
    onUsage?.(usage);
  }
  return response.output_text.trim();
}

export async function* streamReply(
  personaInstructions: string,
  turns: ChatTurn[],
  onUsage?: UsageCallback
): AsyncGenerator<string> {
  const stream = await getClient().responses.create({
    ...buildRequest(personaInstructions, turns),
    stream: true
  });

  for await (const event of stream) {
    if (event.type === 'response.output_text.delta') {
      yield event.delta;
    } else if (event.type === 'response.completed') {
      const usage = toTokenUsage(event.response.usage);
      if (usage) {
        onUsage?.(usage);
      }
    } else if (event.type === 'response.failed' || event.type === 'error') {
      throw new Error('The model failed to generate a reply.');
    }
  }
}
