import type { NextApiRequest, NextApiResponse } from 'next';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import formidable, { Fields, Files, File as FormidableFile } from 'formidable';

import { BadRequestError } from '@/lib/errors';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireUser, UnauthorizedError } from '@/lib/serverAuth';
import { deleteConversationsByCharacter } from '@/lib/conversationCleanup';
import { DEFAULT_CHARACTER_AVATAR } from '@/lib/constants';
import { buildCharacterInstructions } from '@/lib/characterPrompt';
import { assertValidAvatarFile } from '@/lib/avatarValidation';
import { deleteAvatarByUrl, uploadAvatar } from '@/lib/avatarStorage';
import { assertPublishable } from '@/lib/moderation';

export const config = {
  api: {
    bodyParser: false,
  },
};

const parseForm = (req: NextApiRequest): Promise<{ fields: Fields; files: Files }> => {
  const form = formidable({});
  return new Promise((resolve, reject) => {
    form.parse(
      req,
      (err: Error | null, fields: Fields, files: Files) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({ fields, files });
      }
    );
  });
};

const getSingleValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};


type CharacterDocument = {
  name?: string;
  summary?: string | null;
  greeting?: string | null;
  instructions?: string;
  example?: string | null;
  visibility?: string | null;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  longDescription?: string | null;
  shortDescription?: string | null;
  avatarUrl?: string | null;
  categories?: string[];
  creatorId?: string | null;
  gender?: string | null;
};

const VISIBILITY_OPTIONS = new Set(['private', 'unlisted', 'public']);
const GENDER_OPTIONS = new Set(['male', 'female', 'none']);

const serializeCharacter = (id: string, data: CharacterDocument) => ({
  id,
  name: typeof data.name === 'string' ? data.name : '',
  summary: typeof data.summary === 'string' ? data.summary : null,
  greeting: typeof data.greeting === 'string' ? data.greeting : null,
  instructions: typeof data.instructions === 'string' ? data.instructions : null,
  example: typeof data.example === 'string' ? data.example : null,
  visibility: typeof data.visibility === 'string' ? data.visibility : null,
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : null,
  updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : null,
  longDescription: typeof data.longDescription === 'string' ? data.longDescription : null,
  shortDescription: typeof data.shortDescription === 'string' ? data.shortDescription : null,
  avatarUrl:
    typeof data.avatarUrl === 'string' && data.avatarUrl.trim()
      ? data.avatarUrl
      : null, // Changed from DEFAULT_CHARACTER_AVATAR to null
  categories: Array.isArray(data.categories) ? data.categories : [],
  gender: typeof data.gender === 'string' ? data.gender : 'none'
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const characterId = Array.isArray(id) ? id[0] : id;

  if (!characterId) {
    return res.status(400).json({ error: 'characterId is required.' });
  }

  const allowedMethods = ['GET', 'PATCH', 'DELETE'];

  if (!allowedMethods.includes(req.method ?? '')) {
    res.setHeader('Allow', allowedMethods.join(', '));
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authUser = await requireUser(req);
    const userRef = adminDb.collection('users').doc(authUser.uid);
    const characterRef = userRef.collection('characters').doc(characterId);
    const publicCharacterRef = adminDb.collection('characters').doc(characterId);

    if (req.method === 'GET') {
      const snapshot = await characterRef.get();

      if (!snapshot.exists) {
        return res.status(404).json({ error: 'Character not found.' });
      }

      const data = snapshot.data() as CharacterDocument;
      return res.status(200).json({ character: serializeCharacter(snapshot.id, data) });
    }

    if (req.method === 'DELETE') {
      const snapshot = await characterRef.get();

      if (!snapshot.exists) {
        return res.status(204).end();
      }

      const data = snapshot.data() as CharacterDocument;

      await adminDb.runTransaction(async tx => {
        tx.delete(characterRef);
        tx.delete(publicCharacterRef);
      });

      await deleteConversationsByCharacter({ userId: authUser.uid, characterId });

      const userSnapshot = await userRef.get();
      if (userSnapshot.exists) {
        const userData = userSnapshot.data() ?? {};
        const profileUpdates: Record<string, unknown> = {};

        if (Array.isArray(userData.recentCharacterIds)) {
          const filtered = userData.recentCharacterIds.filter(
            (value): value is string =>
              typeof value === 'string' && value.trim().length > 0 && value !== characterId
          );

          if (filtered.length !== userData.recentCharacterIds.length) {
            profileUpdates.recentCharacterIds = filtered;
          }
        }

        if (userData.lastCharacterId === characterId) {
          profileUpdates.lastCharacterId = null;
        }

        if (Object.keys(profileUpdates).length > 0) {
          await userRef.update(profileUpdates);
        }
      }

      await deleteAvatarByUrl(authUser.uid, data.avatarUrl);

      return res.status(204).end();
    }

    // For PATCH requests
    const { fields, files } = await parseForm(req);
    const snapshot = await characterRef.get();

    if (!snapshot.exists) {
      return res.status(404).json({ error: 'Character not found.' });
    }

    const now = Timestamp.now();
    const updates: Record<string, unknown> = {
      updatedAt: now
    };

    const current = snapshot.data() as CharacterDocument;

    const name = getSingleValue(fields.name);
    const greeting = getSingleValue(fields.greeting);
    const shortDescription = getSingleValue(fields.shortDescription);
    const longDescription = getSingleValue(fields.longDescription);
    const visibility = getSingleValue(fields.visibility);
    const categoriesRaw = getSingleValue(fields.categories);
    const example = getSingleValue(fields.example);
    const avatarRemoved = getSingleValue(fields.avatarRemoved); // Added avatarRemoved field
    const genderField = getSingleValue(fields.gender);

    if (typeof name === 'string') {
      const trimmed = name.trim();
      if (!trimmed) {
        throw new BadRequestError('캐릭터 이름은 비워둘 수 없습니다.');
      }
      updates.name = trimmed;
    }
    if (typeof greeting === 'string') {
      const trimmed = greeting.trim();
      updates.greeting = trimmed || null;
    }
    if (typeof shortDescription === 'string') {
      const trimmed = shortDescription.trim();
      updates.shortDescription = trimmed || null;
      updates.summary = trimmed || null;
    }
    if (typeof longDescription === 'string') {
      const trimmed = longDescription.trim();
      updates.longDescription = trimmed || null;
    }
    if (visibility && VISIBILITY_OPTIONS.has(visibility)) {
      updates.visibility = visibility;
    }
    if (genderField && GENDER_OPTIONS.has(genderField)) {
      updates.gender = genderField;
    }
    if (categoriesRaw) {
      try {
        const parsed = JSON.parse(categoriesRaw);
        if (Array.isArray(parsed)) {
          updates.categories = parsed.filter(
            (category: unknown): category is string => typeof category === 'string'
          );
        }
      } catch {
        // ignore if parsing fails
      }
    }
    if (typeof example === 'string') {
      const trimmed = example.trim();
      updates.example = trimmed || null;
    }

    const rawAvatarFile = files.avatar;
    const avatarFile = (Array.isArray(rawAvatarFile) ? rawAvatarFile[0] : rawAvatarFile) as
      | FormidableFile
      | undefined;
    const avatarRemovedField = fields.avatarRemoved; // Get the raw field value

    if (avatarFile) {
      assertValidAvatarFile(avatarFile);
      updates.avatarUrl = await uploadAvatar(authUser.uid, avatarFile);
    } else if (avatarRemovedField) { // If avatarRemoved field is present at all
      updates.avatarUrl = null;
    }

    const mergedName =
      typeof updates.name === 'string'
        ? (updates.name as string)
        : typeof current.name === 'string'
          ? current.name
          : '';
    const mergedShort =
      typeof updates.shortDescription === 'string'
        ? updates.shortDescription
        : current.shortDescription ?? null;
    const mergedGreeting =
      typeof updates.greeting === 'string' ? updates.greeting : current.greeting ?? null;
    const mergedLong =
      typeof updates.longDescription === 'string'
        ? updates.longDescription
        : current.longDescription ?? null;
    const mergedExample = // Added mergedExample
      typeof updates.example === 'string'
        ? updates.example
        : current.example ?? null;

    const cleanName = mergedName.trim();
    if (!cleanName) {
      throw new BadRequestError('캐릭터 이름은 비워둘 수 없습니다.');
    }

    const cleanShort = mergedShort?.toString().trim() || null;
    const cleanGreeting = mergedGreeting?.toString().trim() || null;
    const cleanLong = mergedLong?.toString().trim() || null;
    const cleanExample = mergedExample?.toString().trim() || null; // Added cleanExample

    const instructions = buildCharacterInstructions({
      name: cleanName,
      shortDescription: cleanShort,
      greeting: cleanGreeting,
      longDescription: cleanLong,
      example: cleanExample
    });

    updates.instructions = instructions;

    const nextVisibility = (updates.visibility as string | undefined) ?? current.visibility ?? 'private';
    if (nextVisibility !== 'private') {
      try {
        await assertPublishable([cleanName, cleanShort, cleanGreeting, cleanLong, cleanExample]);
      } catch (moderationError) {
        // The new avatar was uploaded before the merged text was known; don't leave it behind.
        if (avatarFile) {
          await deleteAvatarByUrl(authUser.uid, updates.avatarUrl as string | null);
        }
        throw moderationError;
      }
    }
    // Legacy field from the per-character OpenAI Assistants era.
    updates.assistantId = FieldValue.delete();
    let resolvedAvatar: string | null = null; // Initialize to null

    if (updates.avatarUrl === null) { // If avatar was explicitly removed
      resolvedAvatar = null; // Keep it null
    } else if (typeof updates.avatarUrl === 'string' && updates.avatarUrl.trim()) {
      resolvedAvatar = updates.avatarUrl; // Use the new avatar URL
    } else if (typeof current.avatarUrl === 'string' && current.avatarUrl.trim()) {
      resolvedAvatar = current.avatarUrl; // Use the current avatar URL
    } else {
      resolvedAvatar = DEFAULT_CHARACTER_AVATAR; // Fallback to default
    }
    updates.avatarUrl = resolvedAvatar;

    if (!current.creatorId) {
      updates.creatorId = authUser.uid;
    }

    await characterRef.update(updates);

    if (current.avatarUrl && current.avatarUrl !== updates.avatarUrl) {
      await deleteAvatarByUrl(authUser.uid, current.avatarUrl);
    }

    const updatedSnap = await characterRef.get();
    const updatedData = updatedSnap.data() as CharacterDocument;

    if (updatedData.visibility === 'private') {
      await publicCharacterRef.delete().catch(() => undefined);
    } else {
      // merge keeps community fields (likeCount, useCount, reportCount, hidden) owned by the public doc.
      await publicCharacterRef.set(
        {
          ...updatedData,
          creatorId: updatedData.creatorId ?? authUser.uid,
          assistantId: FieldValue.delete()
        },
        { merge: true }
      );
    }

    return res.status(200).json({
      character: serializeCharacter(updatedSnap.id, updatedData)
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({ error: error.message });
    }

    if (error instanceof BadRequestError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }

    console.error('Character API error:', error);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
}
