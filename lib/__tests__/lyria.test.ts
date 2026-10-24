import { buildLyriaPrompt, generateSong, parseLyriaResponse } from '@/lib/music/lyria';

jest.mock('google-auth-library', () => ({
  GoogleAuth: jest.fn().mockImplementation(() => ({ getAccessToken: jest.fn().mockResolvedValue('token') }))
}));
jest.mock('@/lib/logger', () => ({ logWarn: jest.fn() }));

describe('buildLyriaPrompt', () => {
  it('puts the style first and asks for the lyrics word for word', () => {
    expect(buildLyriaPrompt('acoustic ballad, 72 bpm.', '[Verse]\n비가 와')).toBe(
      'acoustic ballad, 72 bpm. Sing these Korean lyrics exactly as written:\n[Verse]\n비가 와'
    );
  });

  it('falls back to a default style', () => {
    expect(buildLyriaPrompt('  ', '가사')).toMatch(/^Warm Korean pop ballad.*\. Sing these Korean lyrics/);
  });
});

describe('parseLyriaResponse', () => {
  it('returns the audio with the sung lyrics and caption', () => {
    const result = parseLyriaResponse(
      {
        outputs: [
          { type: 'text', text: '[0:00] 비가 와\n[0:04] 너를 불러' },
          { type: 'text', text: 'A gentle acoustic ballad.' },
          { data: Buffer.from('mp3').toString('base64'), mime_type: 'audio/mpeg' }
        ]
      },
      'lyria-3-clip-preview'
    );
    expect(result?.audio.toString()).toBe('mp3');
    expect(result).toMatchObject({
      mimeType: 'audio/mpeg',
      sungLyrics: '[0:00] 비가 와\n[0:04] 너를 불러',
      caption: 'A gentle acoustic ballad.'
    });
  });

  it('returns null without audio', () => {
    expect(parseLyriaResponse({ outputs: [{ type: 'text', text: 'no' }] }, 'm')).toBeNull();
  });
});

describe('generateSong', () => {
  it('calls the interactions API with the chosen model', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ outputs: [{ data: Buffer.from('x').toString('base64'), mimeType: 'audio/mpeg' }] })
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await generateSong({ length: 'full', style: 'trot', lyrics: '가사' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/locations/global/interactions');
    expect(init.headers.Authorization).toBe('Bearer token');
    expect(JSON.parse(init.body).model).toBe('lyria-3-pro-preview');
    expect(result.model).toBe('lyria-3-pro-preview');
  });

  it('maps policy refusals to MUSIC_BLOCKED', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'blocked for an unspecified policy reason' } })
    }) as unknown as typeof fetch;
    await expect(generateSong({ length: 'clip', lyrics: '가사' })).rejects.toMatchObject({
      statusCode: 502,
      code: 'MUSIC_BLOCKED'
    });
  });
});
