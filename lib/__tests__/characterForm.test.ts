import type { NextApiRequest } from 'next';

import { parseCharacterForm } from '@/lib/characterForm';

let mockError: (Error & { code?: number; httpCode?: number }) | null = null;
const mockOptions: unknown[] = [];

jest.mock('formidable', () => ({
  __esModule: true,
  default: (options: unknown) => {
    mockOptions.push(options);
    return {
      parse: (_req: unknown, callback: (err: unknown, fields: unknown, files: unknown) => void) =>
        callback(mockError, { name: ['Muse'] }, {})
    };
  }
}));

const req = {} as NextApiRequest;
const formidableError = (code: number, httpCode: number) => Object.assign(new Error('raw'), { code, httpCode });

describe('parseCharacterForm', () => {
  beforeEach(() => {
    mockError = null;
  });

  it('parses with a 2MB, single-file limit', async () => {
    await expect(parseCharacterForm(req)).resolves.toEqual({ fields: { name: ['Muse'] }, files: {} });
    expect(mockOptions.at(-1)).toMatchObject({ maxFiles: 1, maxFileSize: 2 * 1024 * 1024 });
  });

  it('turns an oversized upload into a 400 with a Korean message', async () => {
    mockError = formidableError(1016, 413);
    await expect(parseCharacterForm(req)).rejects.toMatchObject({
      statusCode: 400,
      message: '이미지는 2MB 이하만 올릴 수 있어요.'
    });
  });

  it('turns other client mistakes into a 400 and keeps server errors as they are', async () => {
    mockError = formidableError(1006, 413);
    await expect(parseCharacterForm(req)).rejects.toMatchObject({ statusCode: 400 });

    mockError = formidableError(1, 500);
    await expect(parseCharacterForm(req)).rejects.toThrow('raw');
  });
});
