import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const assistantId = process.env.OPENAI_ASSISTANT_ID;

const wait = (ms: number) =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

async function pollRunCompletion(threadId: string, runId: string) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const run = await openai.beta.threads.runs.retrieve(threadId, runId);

    if (run.status === 'completed') {
      return run;
    }

    if (run.status === 'requires_action') {
      throw new Error('Assistant requested an unsupported action.');
    }

    if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
      throw new Error(run.last_error?.message || `Run ended with status ${run.status}`);
    }

    await wait(1500);
  }

  throw new Error('Timed out waiting for assistant response.');
}

const parseMessageContent = (message: OpenAI.Beta.Threads.Messages.Message) =>
  message.content
    .filter((item): item is OpenAI.Beta.Threads.Messages.TextContentBlock =>
      item.type === 'text'
    )
    .map(item => item.text.value)
    .join('\n')
    .trim();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!assistantId) {
    return res.status(500).json({
      error: 'OPENAI_ASSISTANT_ID is not configured on the server.'
    });
  }

  try {
    const { message, threadId } = req.body as {
      message?: string;
      threadId?: string;
    };

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    let currentThreadId = threadId;

    if (!currentThreadId) {
      const thread = await openai.beta.threads.create();
      currentThreadId = thread.id;
    }

    await openai.beta.threads.messages.create(currentThreadId, {
      role: 'user',
      content: message
    });

    const run = await openai.beta.threads.runs.create(currentThreadId, {
      assistant_id: assistantId
    });

    await pollRunCompletion(currentThreadId, run.id);

    const responseMessages = await openai.beta.threads.messages.list(currentThreadId, {
      limit: 10
    });

    const orderedMessages = [...responseMessages.data].reverse().map(item => ({
      id: item.id,
      role: item.role,
      content: parseMessageContent(item)
    }));

    const lastAssistantMessage =
      [...orderedMessages]
        .reverse()
        .find(entry => entry.role === 'assistant' && entry.content.length > 0) ?? null;

    return res.status(200).json({
      threadId: currentThreadId,
      messages: orderedMessages,
      reply: lastAssistantMessage
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Unexpected error while contacting the assistant.'
    });
  }
}
