import type { File as FormidableFile } from 'formidable';

import { BadRequestError } from '@/lib/errors';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

export function assertValidAvatarFile(file: FormidableFile) {
  if (!file) {
    throw new BadRequestError('Avatar file is required.');
  }

  const mimeType = typeof file.mimetype === 'string' ? file.mimetype.toLowerCase() : '';
  if (!ACCEPTED_IMAGE_TYPES.has(mimeType)) {
    throw new BadRequestError('Avatar must be a PNG, JPG, or WEBP image.');
  }

  const size = typeof file.size === 'number' ? file.size : Number(file.size ?? 0);
  if (!Number.isFinite(size) || size <= 0 || size > MAX_AVATAR_SIZE) {
    throw new BadRequestError('Avatar size must be 2MB or smaller.');
  }
}
