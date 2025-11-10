import type { NextApiRequest, NextApiResponse } from 'next';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireUser, UnauthorizedError } from '@/lib/serverAuth';
import { serializeTimestamp } from '@/lib/firestoreUtils';

type ProfilePatchPayload = {
  displayName?: unknown;
  photoURL?: unknown;
  preferences?: unknown;
  recentCharacterIds?: unknown;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const allowedMethods = ['GET', 'PATCH'];

  if (!allowedMethods.includes(req.method ?? '')) {
    res.setHeader('Allow', allowedMethods.join(', '));
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authUser = await requireUser(req);
    const userRef = adminDb.collection('users').doc(authUser.uid);

    if (req.method === 'GET') {
      const [userSnapshot, conversationCountSnap, songCountSnap] = await Promise.all([
        userRef.get(),
        userRef.collection('conversations').count().get(),
        userRef.collection('songs').count().get()
      ]);

      const userData = userSnapshot.exists ? userSnapshot.data() ?? {} : {};
      const recentCharacterIds = Array.isArray(userData.recentCharacterIds)
        ? userData.recentCharacterIds.filter(
            (id: unknown): id is string => typeof id === 'string' && id.length > 0
          )
        : [];
      const preferences =
        userData.preferences && typeof userData.preferences === 'object'
          ? userData.preferences
          : {};

      const profile = {
        uid: authUser.uid,
        email: (userData.email as string | undefined) ?? authUser.email ?? null,
        displayName: (userData.displayName as string | undefined) ?? authUser.name ?? null,
        photoURL: (userData.photoURL as string | undefined) ?? authUser.picture ?? null,
        recentCharacterIds,
        lastCharacterId:
          typeof userData.lastCharacterId === 'string' ? userData.lastCharacterId : null,
        createdAt: serializeTimestamp(userData.createdAt),
        updatedAt: serializeTimestamp(userData.updatedAt),
        lastLoginAt: serializeTimestamp(userData.lastLoginAt),
        preferences
      };

      const stats = {
        conversationCount: conversationCountSnap.data().count,
        songCount: songCountSnap.data().count
      };

      return res.status(200).json({ profile, stats });
    }

    const payload = req.body as ProfilePatchPayload;
    const updates: Record<string, unknown> = {
      updatedAt: Timestamp.now()
    };

    if (typeof payload.displayName === 'string') {
      const trimmed = payload.displayName.trim();
      if (!trimmed) {
        return res.status(400).json({ error: 'displayName must not be empty.' });
      }
      updates.displayName = trimmed;
    }

    if (typeof payload.photoURL === 'string') {
      const trimmed = payload.photoURL.trim();
      if (!trimmed) {
        return res.status(400).json({ error: 'photoURL must not be empty.' });
      }
      updates.photoURL = trimmed;
    }

    if (payload.preferences && typeof payload.preferences === 'object') {
      updates.preferences = payload.preferences;
    }

    if (Array.isArray(payload.recentCharacterIds)) {
      const validated = payload.recentCharacterIds
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        .map(id => id.trim())
        .slice(0, 10);
      updates.recentCharacterIds = validated;
    }

    if (Object.keys(updates).length === 1) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    await userRef.set(updates, { merge: true });
    const updatedSnapshot = await userRef.get();
    const updatedData = updatedSnapshot.data() ?? {};

    return res.status(200).json({
      profile: {
        uid: authUser.uid,
        email: (updatedData.email as string | undefined) ?? authUser.email ?? null,
        displayName:
          (updatedData.displayName as string | undefined) ?? authUser.name ?? null,
        photoURL: (updatedData.photoURL as string | undefined) ?? authUser.picture ?? null,
        recentCharacterIds: Array.isArray(updatedData.recentCharacterIds)
          ? updatedData.recentCharacterIds
          : [],
        lastCharacterId:
          typeof updatedData.lastCharacterId === 'string' ? updatedData.lastCharacterId : null,
        createdAt: serializeTimestamp(updatedData.createdAt),
        updatedAt: serializeTimestamp(updatedData.updatedAt),
        lastLoginAt: serializeTimestamp(updatedData.lastLoginAt),
        preferences:
          updatedData.preferences && typeof updatedData.preferences === 'object'
            ? updatedData.preferences
            : {}
      }
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({ error: error.message });
    }

    console.error('Profile API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected server error.'
    });
  }
}
