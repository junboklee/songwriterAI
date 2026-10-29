import OpenAI from 'openai';

import { PLACEHOLDER_RETRY_REQUEST, hasPlaceholderLyrics, withoutPlaceholders } from '@/lib/llm';

const createMock = (OpenAI as unknown as { __mocks: { responsesCreateMock: jest.Mock } }).__mocks.responsesCreateMock;

const reply = (lyrics: string) => `좋아요!\n<lyrics title="빵집">\n${lyrics}\n</lyrics>\n<style>bright pop jingle</style>`;
const answer = (text: string) => ({ output_text: text, usage: { input_tokens: 100, output_tokens: 50 } });

describe('placeholder retry', () => {
  beforeAll(() => {
    process.env.OPENAI_API_KEY = 'test';
  });
  beforeEach(() => createMock.mockReset());

  it('only looks inside the lyrics block', () => {
    expect(hasPlaceholderLyrics(reply('[Chorus]\n○○ 베이커리'))).toBe(true);
    expect(hasPlaceholderLyrics(`${reply('[Chorus]\n해바라기 베이커리')}\n○○를 알려 주세요`)).toBe(false);
    expect(hasPlaceholderLyrics('그냥 대화예요')).toBe(false);
  });

  it('leaves clean replies alone without another call', async () => {
    const clean = reply('[Chorus]\n해바라기 베이커리');
    await expect(withoutPlaceholders('persona', [{ role: 'user', content: 'CM송' }], clean)).resolves.toBe(clean);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('asks once more and uses the clean retry, counting both calls', async () => {
    const leaked = reply('[Chorus]\n○○ 베이커리');
    const fixed = reply('[Chorus]\n해바라기 베이커리');
    createMock.mockResolvedValueOnce(answer(fixed));
    const onUsage = jest.fn();

    await expect(withoutPlaceholders('persona', [{ role: 'user', content: 'CM송' }], leaked, onUsage)).resolves.toBe(fixed);
    const input = createMock.mock.calls[0][0].input;
    expect(input.slice(-2)).toEqual([
      { role: 'assistant', content: leaked },
      { role: 'user', content: PLACEHOLDER_RETRY_REQUEST }
    ]);
    expect(onUsage).toHaveBeenCalledWith({ inputTokens: 100, outputTokens: 50 });
  });

  it('keeps the first reply when the retry fails or still has placeholders', async () => {
    const leaked = reply('[Chorus]\n○○ 베이커리');
    createMock.mockResolvedValueOnce(answer(reply('[Chorus]\n○○ 빵집')));
    await expect(withoutPlaceholders('persona', [], leaked)).resolves.toBe(leaked);
    createMock.mockRejectedValueOnce(new Error('timeout'));
    await expect(withoutPlaceholders('persona', [], leaked)).resolves.toBe(leaked);
  });
});
