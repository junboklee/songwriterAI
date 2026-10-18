import type { NextApiRequest } from 'next';
import formidable, { type Fields, type Files, type File as FormidableFile } from 'formidable';

import { AVATAR_MAX_BYTES } from '@/lib/characterFields';
import { BadRequestError } from '@/lib/errors';

// formidable's codes for files over maxFileSize / maxTotalFileSize.
const FILE_TOO_BIG_CODES = new Set([1009, 1016]);

// Parses a character create/edit form (multipart) with tight limits: one avatar of at most 2MB
// and a small amount of text, so oversized uploads are cut off while streaming, not after.
export function parseCharacterForm(req: NextApiRequest): Promise<{ fields: Fields; files: Files }> {
  const form = formidable({
    maxFiles: 1,
    maxFileSize: AVATAR_MAX_BYTES,
    maxFieldsSize: 64 * 1024
  });
  return new Promise((resolve, reject) => {
    form.parse(req, (error: (Error & { code?: number; httpCode?: number }) | null, fields: Fields, files: Files) => {
      if (!error) {
        resolve({ fields, files });
        return;
      }
      if (typeof error.code === 'number' && FILE_TOO_BIG_CODES.has(error.code)) {
        reject(new BadRequestError('이미지는 2MB 이하만 올릴 수 있어요.'));
      } else if (typeof error.httpCode === 'number' && error.httpCode >= 400 && error.httpCode < 500) {
        reject(new BadRequestError('입력 내용이 너무 많거나 형식이 올바르지 않아요.'));
      } else {
        reject(error);
      }
    });
  });
}

export const getSingleValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export const getAvatarFile = (files: Files): FormidableFile | undefined => {
  const raw = files.avatar;
  return (Array.isArray(raw) ? raw[0] : raw) as FormidableFile | undefined;
};
