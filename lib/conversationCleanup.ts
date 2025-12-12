import { FieldPath } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebaseAdmin';

const MESSAGE_BATCH_SIZE = 200;
const SONG_BATCH_SIZE = 100;
const CONVERSATION_BATCH_SIZE = 50;

async function deleteQueryBatch(
  query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>,
  batchSize: number
) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snapshot = await query.limit(batchSize).get();
    if (snapshot.empty) {
      break;
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    if (snapshot.size < batchSize) {
      break;
    }
  }
}

export async function deleteConversation({
  userId,
  threadId
}: {
  userId: string;
  threadId: string;
}) {
  const userRef = adminDb.collection('users').doc(userId);
  const conversationRef = userRef.collection('conversations').doc(threadId);
  const messagesRef = conversationRef.collection('messages');
  const songsQuery = userRef.collection('songs').where('threadId', '==', threadId);
  const threadRef = userRef.collection('threads').doc(threadId);

  await deleteQueryBatch(messagesRef, MESSAGE_BATCH_SIZE);
  await deleteQueryBatch(songsQuery, SONG_BATCH_SIZE);

  await conversationRef.delete().catch(() => undefined);
  await threadRef.delete().catch(() => undefined);
}

export async function deleteConversations({
  userId,
  threadIds
}: {
  userId: string;
  threadIds: string[];
}) {
  const uniqueIds = Array.from(new Set(threadIds.filter(id => typeof id === 'string' && id)));

  for (const threadId of uniqueIds) {
    // eslint-disable-next-line no-await-in-loop
    await deleteConversation({ userId, threadId });
  }
}

export async function deleteAllConversations(userId: string) {
  const userRef = adminDb.collection('users').doc(userId);
  const conversationRef = userRef.collection('conversations');

  const ids: string[] = [];
  let query = conversationRef.orderBy(FieldPath.documentId()).limit(CONVERSATION_BATCH_SIZE);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snapshot = await query.get();
    if (snapshot.empty) {
      break;
    }

    snapshot.docs.forEach(doc => {
      ids.push(doc.id);
    });

    if (snapshot.size < CONVERSATION_BATCH_SIZE) {
      break;
    }

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    query = conversationRef
      .orderBy(FieldPath.documentId())
      .startAfter(lastDoc.id)
      .limit(CONVERSATION_BATCH_SIZE);
  }

  await deleteConversations({ userId, threadIds: ids });
}

export async function deleteConversationsByCharacter({
  userId,
  characterId
}: {
  userId: string;
  characterId: string;
}) {
  if (!characterId) {
    return;
  }

  const userRef = adminDb.collection('users').doc(userId);
  const snapshot = await userRef
    .collection('conversations')
    .where('characterId', '==', characterId)
    .get();

  if (snapshot.empty) {
    return;
  }

  const threadIds = snapshot.docs.map(doc => doc.id);
  await deleteConversations({ userId, threadIds });
}
