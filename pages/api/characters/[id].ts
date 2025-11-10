import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebaseAdmin';
import { serializeTimestamp } from '@/lib/firestoreUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid character ID' });
  }

  try {
    // First, try to find the character in the public collection
    const publicDocRef = adminDb.collection('characters').doc(id);
    const publicDocSnap = await publicDocRef.get();

    if (publicDocSnap.exists) {
      const characterData = publicDocSnap.data();
      if (characterData) {
        if (characterData.visibility === 'private') {
          return res.status(403).json({ error: 'This character is private and cannot be accessed via this endpoint.' });
        }
        
        return res.status(200).json({
          character: {
            ...characterData,
            id: publicDocSnap.id,
            createdAt: serializeTimestamp(characterData.createdAt),
            updatedAt: serializeTimestamp(characterData.updatedAt),
          }
        });
      }
    }

    // If not in public collection, it might be a private character.
    // This endpoint is for public access, so we don't search user subcollections.
    // If we needed to, we would need the user ID.
    return res.status(404).json({ error: 'Character not found or is private.' });

  } catch (error) {
    console.error(`Failed to fetch character ${id}:`, error);
    return res.status(500).json({ error: 'Failed to fetch character' });
  }
}
