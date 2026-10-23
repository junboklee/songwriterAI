import type { NextApiRequest, NextApiResponse } from 'next';
import { Timestamp } from 'firebase-admin/firestore';

import { findCharacterLimitError, parseCategories } from '@/lib/characterFields';
import { getAvatarFile, getSingleValue, parseCharacterForm } from '@/lib/characterForm';
import { AppError, BadRequestError, AgeConfirmationRequiredError } from '@/lib/errors';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireUser, UnauthorizedError } from '@/lib/serverAuth';
import { DEFAULT_CHARACTER_AVATAR } from '@/lib/constants';
import { assertValidAvatarFile } from '@/lib/avatarValidation';
import { uploadAvatar } from '@/lib/avatarStorage';
import { assertPublishable } from '@/lib/moderation';
import { buildCharacterInstructions } from '@/lib/characterPrompt';
import { enforceRateLimit } from '@/lib/rateLimiter';

// Disable the default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

const VISIBILITY_OPTIONS = new Set(['private', 'unlisted', 'public']);
const GENDER_OPTIONS = new Set(['male', 'female', 'none']);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await requireUser(req);
    await enforceRateLimit(`characters:${user.uid}`);
    const { fields, files } = await parseCharacterForm(req);

    const name = getSingleValue(fields.name);
    const greeting = getSingleValue(fields.greeting);
    const shortDescription = getSingleValue(fields.shortDescription);
    const longDescription = getSingleValue(fields.longDescription);
    const visibility = getSingleValue(fields.visibility);
    const genderField = getSingleValue(fields.gender);
    const categoriesRaw = getSingleValue(fields.categories);

    if (!name || !name.trim()) {
      throw new BadRequestError('캐릭터 이름을 입력해 주세요.');
    }
    let avatarUrl: string | null = null;
    const avatarFile = getAvatarFile(files);

    if (avatarFile) {
      assertValidAvatarFile(avatarFile);
    }

    const finalVisibility =
      typeof visibility === 'string' && VISIBILITY_OPTIONS.has(visibility) ? visibility : 'private';
    const resolvedGender =
      typeof genderField === 'string' && GENDER_OPTIONS.has(genderField) ? genderField : 'none';
    const categories = parseCategories(categoriesRaw) ?? [];

    const trimmedName = name.trim();
    const trimmedGreeting = greeting?.trim() ?? '';
    const trimmedShort = shortDescription?.trim() ?? '';
    const trimmedLong = longDescription?.trim() ?? '';
    const limitError = findCharacterLimitError(
      { name: trimmedName, greeting: trimmedGreeting, shortDescription: trimmedShort, longDescription: trimmedLong },
      categories
    );
    if (limitError) {
      throw new BadRequestError(limitError);
    }
    const instructions = buildCharacterInstructions({
      name: trimmedName,
      shortDescription: trimmedShort,
      greeting: trimmedGreeting,
      longDescription: trimmedLong
    });

    if (finalVisibility !== 'private') {
      await assertPublishable([trimmedName, trimmedShort, trimmedGreeting, trimmedLong]);
    }

    // Upload only after moderation so rejected characters leave no orphaned files.
    if (avatarFile) {
      avatarUrl = await uploadAvatar(user.uid, avatarFile);
    }

    const now = Timestamp.now();
    const userRef = adminDb.collection('users').doc(user.uid);
    const userCharacterRef = userRef.collection('characters').doc();
    const publicCharacterRef = adminDb.collection('characters').doc(userCharacterRef.id);
    
    const characterData = {
      name: trimmedName,
      greeting: trimmedGreeting || null,
      shortDescription: trimmedShort || null,
      longDescription: trimmedLong || null,
      instructions,
      visibility: finalVisibility,
      gender: resolvedGender,
      categories,
      avatarUrl: avatarUrl ?? DEFAULT_CHARACTER_AVATAR,
      createdAt: now,
      updatedAt: now,
      creatorId: user.uid,
    };

    await userCharacterRef.set(characterData);

    if (finalVisibility !== 'private') {
      await publicCharacterRef.set(characterData);
    }

    const characterId = userCharacterRef.id;

    return res.status(201).json({
      id: characterId,
      character: {
        ...characterData,
        id: characterId,
        createdAt: now.toDate().toISOString(),
        updatedAt: now.toDate().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({ error: error.message });
    }
    if (error instanceof AgeConfirmationRequiredError) {
      return res.status(403).json({ error: error.message, code: error.code });
    }
    if (error instanceof AppError && error.statusCode < 500) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    console.error('Character create API error:', error);
    return res.status(500).json({
      error: '캐릭터를 저장하는 중 오류가 발생했습니다.',
    });
  }
}
