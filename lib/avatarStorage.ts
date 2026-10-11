import { randomUUID } from 'crypto';
import type { File as FormidableFile } from 'formidable';

import { BadRequestError } from '@/lib/errors';
import { adminStorage } from '@/lib/firebaseAdmin';
import { logWarn } from '@/lib/logger';

const safeFileName = (value?: string | null) =>
  (value ?? 'avatar').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80) || 'avatar';

export async function uploadAvatar(userId: string, file: FormidableFile) {
  const filePath = file.filepath;
  if (typeof filePath !== 'string' || !filePath) {
    throw new BadRequestError('Invalid avatar file.');
  }

  const bucket = adminStorage.bucket();
  const destination = `avatars/${userId}/${randomUUID()}-${safeFileName(file.originalFilename)}`;

  await bucket.upload(filePath, {
    destination,
    metadata: { contentType: file.mimetype || undefined }
  });

  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media`;
}

// Deletes an avatar previously produced by uploadAvatar. URLs outside the user's folder are ignored.
export async function deleteAvatarByUrl(userId: string, url?: string | null) {
  if (typeof url !== 'string') {
    return;
  }

  const match = url.match(/\/o\/([^?]+)/);
  const objectPath = match ? decodeURIComponent(match[1]) : null;
  if (!objectPath || !objectPath.startsWith(`avatars/${userId}/`)) {
    return;
  }

  try {
    await adminStorage.bucket().file(objectPath).delete({ ignoreNotFound: true });
  } catch (error) {
    logWarn('avatar.delete_failed', {
      objectPath,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function deleteUserAvatars(userId: string) {
  await adminStorage.bucket().deleteFiles({ prefix: `avatars/${userId}/`, force: true });
}
