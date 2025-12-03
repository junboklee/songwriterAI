import type { NextApiRequest, NextApiResponse } from 'next';

import { deleteAllConversations } from '@/lib/conversationCleanup';
import { deleteCharacterAssistant } from '@/lib/characterAssistants';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { requireUser, UnauthorizedError } from '@/lib/serverAuth';

const DEFAULT_BATCH_SIZE = 200;

async function deleteQueryBatch(
  query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>,
  batchSize = DEFAULT_BATCH_SIZE
) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snapshot = await query.limit(batchSize).get();
    if (snapshot.empty) {
      break;
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    if (snapshot.size < batchSize) {
      break;
    }
  }
}

async function deleteUserCharacters(userId: string) {
  const userRef = adminDb.collection('users').doc(userId);
  const charactersSnapshot = await userRef.collection('characters').get();

  for (const doc of charactersSnapshot.docs) {
    const data = doc.data();
    const assistantId =
      typeof data.assistantId === 'string' && data.assistantId.trim()
        ? data.assistantId.trim()
        : null;

    await doc.ref.delete().catch(() => undefined);
    await adminDb.collection('characters').doc(doc.id).delete().catch(() => undefined);

    if (assistantId) {
      try {
        await deleteCharacterAssistant(assistantId);
      } catch (error) {
        console.error('Failed to delete character assistant during account removal', {
          userId,
          characterId: doc.id,
          error
        });
      }
    }
  }
}

async function deleteSubcollection(
  collectionRef: FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>
) {
  await deleteQueryBatch(collectionRef, DEFAULT_BATCH_SIZE);
}

async function deleteUserAccount(uid: string) {
  const userRef = adminDb.collection('users').doc(uid);

  await deleteAllConversations(uid);
  await deleteUserCharacters(uid);
  await deleteSubcollection(userRef.collection('songs'));
  await deleteSubcollection(userRef.collection('threads'));

  await userRef.delete().catch(() => undefined);

  try {
    await adminAuth.deleteUser(uid);
  } catch (error) {
    // If the Firebase Auth user is already missing, proceed without failing the request.
    if (!(error instanceof Error) || !/auth\/user-not-found/i.test(error.message)) {
      throw error;
    }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authUser = await requireUser(req);
    await deleteUserAccount(authUser.uid);
    return res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({ error: error.message });
    }

    console.error('Failed to delete user account', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected server error.'
    });
  }
}
