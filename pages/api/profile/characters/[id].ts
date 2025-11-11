import type { NextApiRequest, NextApiResponse } from 'next';
import { Timestamp } from 'firebase-admin/firestore';
import { Bucket } from '@google-cloud/storage';
import formidable, { Fields, Files } from 'formidable';
import { v4 as uuidv4 } from 'uuid';

import { BadRequestError } from '@/lib/errors';
import { adminDb, adminStorage } from '@/lib/firebaseAdmin';
import { requireUser, UnauthorizedError } from '@/lib/serverAuth';
import {
  createCharacterAssistant,
  deleteCharacterAssistant,
  updateCharacterAssistant
} from '@/lib/characterAssistants';
import { DEFAULT_CHARACTER_AVATAR } from '@/lib/constants';
import { buildCharacterInstructions } from '@/lib/characterPrompt';

export const config = {
  api: {
    bodyParser: false,
  },
};

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


type CharacterDocument = {
  name?: string;
  summary?: string | null;
  greeting?: string | null;
  instructions?: string;
  example?: string | null;
  visibility?: string | null;
  assistantId?: string | null;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  longDescription?: string | null;
  shortDescription?: string | null;
  avatarUrl?: string | null;
  categories?: string[];
  creatorId?: string | null;

};

const VISIBILITY_OPTIONS = new Set(['private', 'unlisted', 'public']);

const serializeCharacter = (id: string, data: CharacterDocument) => ({
  id,
  name: typeof data.name === 'string' ? data.name : '',
  summary: typeof data.summary === 'string' ? data.summary : null,
  greeting: typeof data.greeting === 'string' ? data.greeting : null,
  instructions: typeof data.instructions === 'string' ? data.instructions : null,
  example: typeof data.example === 'string' ? data.example : null,
  visibility: typeof data.visibility === 'string' ? data.visibility : null,
  assistantId: typeof data.assistantId === 'string' ? data.assistantId : null,
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : null,
  updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : null,
  longDescription: typeof data.longDescription === 'string' ? data.longDescription : null,
  shortDescription: typeof data.shortDescription === 'string' ? data.shortDescription : null,
  avatarUrl:
    typeof data.avatarUrl === 'string' && data.avatarUrl.trim()
      ? data.avatarUrl
      : DEFAULT_CHARACTER_AVATAR,
  categories: Array.isArray(data.categories) ? data.categories : [],
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
      const assistantId =
        typeof data.assistantId === 'string' && data.assistantId.trim()
          ? data.assistantId.trim()
          : null;

      await characterRef.delete();
      await publicCharacterRef.delete().catch(() => undefined);

      if (assistantId) {
        try {
          await deleteCharacterAssistant(assistantId);
        } catch (assistantError) {
          console.error('Failed to delete assistant for character', assistantError);
        }
      }

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

    const avatarFile = files.avatar?.[0];
    if (avatarFile) {
      const bucket: Bucket = adminStorage.bucket();
      const fileName = `avatars/${authUser.uid}/${uuidv4()}-${avatarFile.originalFilename}`;
      
      await bucket.upload(avatarFile.filepath, {
        destination: fileName,
        metadata: {
          contentType: avatarFile.mimetype,
        },
      });
      updates.avatarUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
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

    const cleanName = mergedName.trim();
    if (!cleanName) {
      throw new BadRequestError('캐릭터 이름은 비워둘 수 없습니다.');
    }

    const cleanShort = mergedShort?.toString().trim() || null;
    const cleanGreeting = mergedGreeting?.toString().trim() || null;
    const cleanLong = mergedLong?.toString().trim() || null;

    const instructions = buildCharacterInstructions({
      name: cleanName,
      shortDescription: cleanShort,
      greeting: cleanGreeting,
      longDescription: cleanLong
    });

    updates.instructions = instructions;
    const resolvedAvatar =
      (typeof updates.avatarUrl === 'string' && updates.avatarUrl.trim()
        ? updates.avatarUrl
        : null) ??
      (typeof current.avatarUrl === 'string' && current.avatarUrl.trim()
        ? current.avatarUrl
        : null) ??
      DEFAULT_CHARACTER_AVATAR;
    updates.avatarUrl = resolvedAvatar;

    const descriptor = {
      userId: authUser.uid,
      characterId,
      name: cleanName,
      summary: cleanShort,
      greeting: cleanGreeting,
      instructions,
      example: current.example || null
    };

    const existingAssistantId =
      typeof current.assistantId === 'string' && current.assistantId.trim()
        ? current.assistantId.trim()
        : null;

    let resolvedAssistantId = existingAssistantId;

    try {
      if (resolvedAssistantId) {
        await updateCharacterAssistant(resolvedAssistantId, descriptor);
      } else {
        resolvedAssistantId = await createCharacterAssistant(descriptor);
        updates.assistantId = resolvedAssistantId;
      }
    } catch (assistantError) {
      console.error('Failed to sync assistant for character', assistantError);
      return res.status(502).json({
        error: 'OpenAI assistant를 업데이트하지 못했습니다. 잠시 후 다시 시도해주세요.'
      });
    }

    if (!current.creatorId) {
      updates.creatorId = authUser.uid;
    }

    await characterRef.update(updates);

    const updatedSnap = await characterRef.get();
    const updatedData = updatedSnap.data() as CharacterDocument;

    if (updatedData.visibility === 'private') {
      await publicCharacterRef.delete().catch(() => undefined);
    } else {
      await publicCharacterRef.set({
        ...updatedData,
        creatorId: updatedData.creatorId ?? authUser.uid
      });
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
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected server error.'
    });
  }
}
