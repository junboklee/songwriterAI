import type { NextApiRequest, NextApiResponse } from 'next';

import { adminDb } from '@/lib/firebaseAdmin';
import { SHARED_SONGS_COLLECTION } from '@/lib/songVersions';

// Public fields of a shared song (the same content /s/{shareId} shows). Used by the edge
// share-card renderer, which cannot use the Firebase Admin SDK itself.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const shareId = Array.isArray(req.query.shareId) ? req.query.shareId[0] : req.query.shareId;
  res.setHeader('Cache-Control', 'private, no-store');

  try {
    const snapshot = shareId ? await adminDb.collection(SHARED_SONGS_COLLECTION).doc(shareId).get() : null;
    if (!snapshot?.exists) {
      return res.status(404).json({ error: 'Not found' });
    }
    const data = snapshot.data() ?? {};
    return res.status(200).json({
      title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : null,
      lyrics: typeof data.lyrics === 'string' ? data.lyrics : '',
      // Shares made before this field existed came from chats.
      aiAssisted: data.aiAssisted !== false
    });
  } catch (error) {
    console.error('Share API error:', error);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
}
