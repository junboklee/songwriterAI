export type ChatApiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export type ChatApiResult = {
  threadId: string;
  messages: ChatApiMessage[];
  reply: ChatApiMessage | null;
};

export class ChatRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type SendChatOptions = {
  idToken: string;
  message: string;
  threadId?: string | null;
  characterId?: string | null;
  onDelta?: (fullText: string) => void;
};

// Splits an SSE buffer into complete events, returning the unparsed remainder.
const drainEvents = (buffer: string) => {
  const events: Array<{ event: string; data: string }> = [];
  let rest = buffer;
  let boundary = rest.indexOf('\n\n');

  while (boundary !== -1) {
    const chunk = rest.slice(0, boundary);
    rest = rest.slice(boundary + 2);
    let event = 'message';
    const data: string[] = [];
    chunk.split('\n').forEach(line => {
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        data.push(line.slice(5).trim());
      }
    });
    events.push({ event, data: data.join('\n') });
    boundary = rest.indexOf('\n\n');
  }

  return { events, rest };
};

export async function sendChatMessage({
  idToken,
  message,
  threadId,
  characterId,
  onDelta
}: SendChatOptions): Promise<ChatApiResult> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({ message, threadId, characterId })
  });

  if (!response.ok) {
    let errorMessage = '';
    try {
      errorMessage = ((await response.json()) as { error?: string }).error ?? '';
    } catch {
      // non-JSON error body
    }
    throw new ChatRequestError(errorMessage, response.status);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/event-stream') || !response.body) {
    return (await response.json()) as ChatApiResult;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const { events, rest } = drainEvents(buffer);
    buffer = rest;

    for (const item of events) {
      const payload = item.data ? JSON.parse(item.data) : {};
      if (item.event === 'delta') {
        text += payload.text ?? '';
        onDelta?.(text);
      } else if (item.event === 'done') {
        return payload as ChatApiResult;
      } else if (item.event === 'error') {
        throw new ChatRequestError(payload.error ?? '', 500);
      }
    }

    if (done) {
      break;
    }
  }

  throw new ChatRequestError('', 500);
}
