import OpenAI from 'openai';

import { recordAiStatus } from '@/lib/aiStatus';
import { AppError } from '@/lib/errors';
import { logError, logWarn } from '@/lib/logger';
import { extractLyrics } from '@/lib/lyricsFormat';
import { SONGWRITING_GUIDELINES } from '@/lib/songwritingPrompt';
import type { TokenUsage } from '@/lib/usage';

export type ChatTurn = {
  role: 'user' | 'assistant';
  content: string;
};

type UsageCallback = (usage: TokenUsage) => void;

const CHAT_MODEL =
  process.env.OPENAI_CHAT_MODEL ?? process.env.OPENAI_ASSISTANT_MODEL ?? 'gpt-5.4-mini';

// GPT-5 / o-series models reason before answering. Reasoning tokens count towards
// max_output_tokens, so they get a larger budget and a low effort (songwriting needs little
// planning, and low effort keeps latency close to the older non-reasoning models).
export const isReasoningModel = (model: string) => /^(gpt-5|o\d)/.test(model);

export function modelOptions(model: string, maxVisibleTokens: number) {
  return isReasoningModel(model)
    ? { max_output_tokens: maxVisibleTokens * 2, reasoning: { effort: 'low' as const } }
    : { max_output_tokens: maxVisibleTokens };
}

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

// The provider turned the request down for the whole service (credits used up, or rate limited).
// Users get a calm Korean message; the provider's own message goes to the log, which alerts.
export class AiUnavailableError extends AppError {
  constructor() {
    super('지금은 AI가 잠시 답할 수 없어요. 잠시 후 다시 시도해 주세요.', { statusCode: 503, code: 'AI_UNAVAILABLE' });
  }
}

const QUOTA_MESSAGE = /no credits|insufficient_quota|exceeded your current quota/i;

export function asProviderError(error: unknown) {
  if (error instanceof AppError) {
    return error;
  }
  const { status, code, message } = (error ?? {}) as { status?: unknown; code?: unknown; message?: unknown };
  const text = `${String(code ?? '')} ${String(message ?? '')}`;
  const quota = QUOTA_MESSAGE.test(text);
  if (!quota && status !== 429) {
    return error;
  }
  if (quota) {
    recordAiStatus(false);
  }
  logError('llm.unavailable', error, { reason: quota ? 'quota' : 'rate_limit' });
  return new AiUnavailableError();
}

// The smallest request that shows whether the credits are used up (lib/aiStatus.ts). A refused
// request costs nothing; otherwise it is a few tokens. Logged as a warning only, so it doesn't
// raise an alert every ten minutes while the credits are out.
export async function probeAi() {
  try {
    await getClient().responses.create({ model: CHAT_MODEL, input: 'ok', ...modelOptions(CHAT_MODEL, 16), store: false });
    return true;
  } catch (error) {
    const { code, message } = (error ?? {}) as { code?: unknown; message?: unknown };
    const quota = QUOTA_MESSAGE.test(`${String(code ?? '')} ${String(message ?? '')}`);
    logWarn('llm.probe_failed', { quota });
    return !quota;
  }
}

const rethrowProviderError = (error: unknown): never => {
  throw asProviderError(error);
};

export function buildSystemPrompt(personaInstructions: string) {
  return `${SONGWRITING_GUIDELINES}\n\n# Your persona\n${personaInstructions.trim()}`;
}

const buildRequest = (personaInstructions: string, turns: ChatTurn[]) => ({
  model: CHAT_MODEL,
  instructions: buildSystemPrompt(personaInstructions),
  input: turns.map(turn => ({ role: turn.role, content: turn.content })),
  ...modelOptions(CHAT_MODEL, 2000),
  store: false
});

const toTokenUsage = (usage?: { input_tokens: number; output_tokens: number } | null) =>
  usage ? { inputTokens: usage.input_tokens, outputTokens: usage.output_tokens } : null;

export async function generateReply(
  personaInstructions: string,
  turns: ChatTurn[],
  onUsage?: UsageCallback
) {
  const response = await getClient()
    .responses.create(buildRequest(personaInstructions, turns))
    .catch(rethrowProviderError);
  recordAiStatus(true);
  const usage = toTokenUsage(response.usage);
  if (usage) {
    onUsage?.(usage);
  }
  return response.output_text.trim();
}

// Template placeholders (○○) left inside the lyrics block. The prompt forbids them, but the model
// still leaves some when the blank is a proper noun (a shop or school name), roughly 1 reply in 15.
export const hasPlaceholderLyrics = (reply: string) => /[○●]/.test(extractLyrics(reply)?.body ?? '');

export const PLACEHOLDER_RETRY_REQUEST =
  'Your lyrics still contain ○ placeholders. Answer my previous message again from the start, in the same format, ' +
  'with every ○ replaced by a concrete, believable detail you invent (names of people, shops, schools and places included). ' +
  'Do not mention this correction.';

// Asks once more when the reply's lyrics still contain ○ placeholders. Returns the retry only if it
// is clean, so a failed retry never makes things worse.
export async function withoutPlaceholders(
  personaInstructions: string,
  turns: ChatTurn[],
  reply: string,
  onUsage?: UsageCallback
) {
  if (!hasPlaceholderLyrics(reply)) {
    return reply;
  }
  const retry = await generateReply(
    personaInstructions,
    [...turns, { role: 'assistant', content: reply }, { role: 'user', content: PLACEHOLDER_RETRY_REQUEST }],
    onUsage
  ).catch(() => '');
  return retry && !hasPlaceholderLyrics(retry) ? retry : reply;
}

// One-shot completion with caller-supplied instructions (no chat persona or <lyrics> format rules).
export async function completeText(
  instructions: string,
  input: string,
  onUsage?: UsageCallback,
  maxOutputTokens = 800
) {
  const response = await getClient()
    .responses.create({
      model: CHAT_MODEL,
      instructions,
      input: [{ role: 'user', content: input }],
      ...modelOptions(CHAT_MODEL, maxOutputTokens),
      store: false
    })
    .catch(rethrowProviderError);
  recordAiStatus(true);
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
  try {
    const stream = await getClient().responses.create({
      ...buildRequest(personaInstructions, turns),
      stream: true
    });

    for await (const event of stream) {
      if (event.type === 'response.output_text.delta') {
        yield event.delta;
      } else if (event.type === 'response.completed') {
        recordAiStatus(true);
        const usage = toTokenUsage(event.response.usage);
        if (usage) {
          onUsage?.(usage);
        }
      } else if (event.type === 'response.failed' || event.type === 'error') {
        throw new Error('The model failed to generate a reply.');
      }
    }
  } catch (error) {
    // The SDK reports a used-up quota while iterating the stream, not when it is created.
    rethrowProviderError(error);
  }
}
