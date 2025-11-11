import type { NextApiRequest, NextApiResponse } from 'next';
import { Timestamp } from 'firebase-admin/firestore';
import { Bucket } from '@google-cloud/storage';
import formidable, { Fields, Files } from 'formidable';
import { v4 as uuidv4 } from 'uuid';

import { BadRequestError } from '@/lib/errors';
import { adminDb, adminStorage } from '@/lib/firebaseAdmin';
import { requireUser, UnauthorizedError } from '@/lib/serverAuth';
import { createCharacterAssistant } from '@/lib/characterAssistants';
import { DEFAULT_CHARACTER_AVATAR } from '@/lib/constants';
import { buildCharacterInstructions } from '@/lib/characterPrompt';

// Disable the default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

const VISIBILITY_OPTIONS = new Set(['private', 'unlisted', 'public']);

// Helper to parse the form
const parseForm = (req: NextApiRequest): Promise<{ fields: Fields; files: Files }> => {
  const form = formidable({});
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
      }
      resolve({ fields, files });
    });
  });
};

const getSingleValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await requireUser(req);
    const { fields, files } = await parseForm(req);

    const name = getSingleValue(fields.name);
    const greeting = getSingleValue(fields.greeting);
    const shortDescription = getSingleValue(fields.shortDescription);
    const longDescription = getSingleValue(fields.longDescription);
    const visibility = getSingleValue(fields.visibility);
    const categoriesRaw = getSingleValue(fields.categories);

    if (!name || !name.trim()) {
      throw new BadRequestError('캐릭터 이름을 입력해 주세요.');
    }
    let avatarUrl: string | null = null;
    const avatarFile = files.avatar?.[0];

    if (avatarFile) {
      const bucket: Bucket = adminStorage.bucket();
      const fileName = `avatars/${user.uid}/${uuidv4()}-${avatarFile.originalFilename}`;
      
      await bucket.upload(avatarFile.filepath, {
        destination: fileName,
        metadata: {
          contentType: avatarFile.mimetype,
        },
      });
      avatarUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
    }

    const finalVisibility =
      typeof visibility === 'string' && VISIBILITY_OPTIONS.has(visibility) ? visibility : 'private';
    let categories: string[] = [];
    if (categoriesRaw) {
      try {
        const parsed = JSON.parse(categoriesRaw);
        if (Array.isArray(parsed)) {
          categories = parsed.filter((item): item is string => typeof item === 'string');
        }
      } catch {
        categories = [];
      }
    }

    const trimmedName = name.trim();
    const trimmedGreeting = greeting?.trim() ?? '';
    const trimmedShort = shortDescription?.trim() ?? '';
    const trimmedLong = longDescription?.trim() ?? '';
    const instructions = buildCharacterInstructions({
      name: trimmedName,
      shortDescription: trimmedShort,
      greeting: trimmedGreeting,
      longDescription: trimmedLong
    });

    const now = Timestamp.now();
    const userRef = adminDb.collection('users').doc(user.uid);
    const userCharacterRef = userRef.collection('characters').doc();
    const publicCharacterRef = adminDb.collection('characters').doc(userCharacterRef.id);
    const characterId = userCharacterRef.id;

    let assistantId: string | null = null;
    if (trimmedName.toLowerCase() === 'dayeon') {
      assistantId = 'asst_ED99NuKgahDCWbPaId4kUwq1';
    } else {
      try {
        assistantId = await createCharacterAssistant({
          userId: user.uid,
          characterId,
          name: trimmedName,
          summary: trimmedShort || null,
          greeting: trimmedGreeting || null,
          instructions,
          example: null,
        });
      } catch (assistantError) {
        console.error('Failed to create assistant for character', assistantError);
      }
    }

    const characterData = {
      name: trimmedName,
      greeting: trimmedGreeting || null,
      shortDescription: trimmedShort || null,
      longDescription: trimmedLong || null,
      instructions,
      visibility: finalVisibility,
      categories,
      avatarUrl: avatarUrl ?? DEFAULT_CHARACTER_AVATAR,
      assistantId,
      createdAt: now,
      updatedAt: now,
      creatorId: user.uid,
    };

    await userCharacterRef.set(characterData);

    if (finalVisibility !== 'private') {
      await publicCharacterRef.set(characterData);
    }

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
    if (error instanceof BadRequestError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    console.error('Character create API error:', error);
    return res.status(500).json({
      error: '캐릭터를 저장하는 중 오류가 발생했습니다.',
    });
  }
}
