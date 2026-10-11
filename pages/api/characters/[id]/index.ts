import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebaseAdmin';
import { toPublicCharacter } from '@/lib/publicCharacter';

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
    // Only the public collection is searched; private characters live under users/{uid}.
    const snapshot = await adminDb.collection('characters').doc(id).get();
    const data = snapshot.exists ? snapshot.data() : null;

    // `hidden` is set automatically once a character collects enough user reports.
    if (!data || data.visibility === 'private' || data.hidden === true) {
      return res.status(404).json({ error: 'Character not found or is private.' });
    }

    return res.status(200).json({ character: toPublicCharacter(snapshot.id, data) });
  } catch (error) {
    console.error(`Failed to fetch character ${id}:`, error);
    return res.status(500).json({ error: 'Failed to fetch character' });
  }
}
