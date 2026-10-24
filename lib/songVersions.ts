import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { DocumentReference } from 'firebase-admin/firestore';

import { isAiAssisted } from '@/lib/aiDisclosure';
import { adminDb } from '@/lib/firebaseAdmin';
import { serializeTimestamp } from '@/lib/firestoreUtils';
import { deleteSongAudioFiles } from '@/lib/music/songAudio';

// users/{uid}/songs/{songId}/versions/{versionId} holds every saved revision of a song.
// The song document itself always mirrors the latest version.

export const MAX_VERSIONS_PER_SONG = 50;

// Public, read-only copies of songs the owner chose to share: sharedSongs/{shareId}.
export const SHARED_SONGS_COLLECTION = 'sharedSongs';

export type VersionSource = 'initial' | 'auto-from-chat' | 'manual' | 'restore';

export type VersionInput = {
  title: string | null;
  lyrics: string;
  style?: string | null;
  source: VersionSource;
  // Set when an AI rewrite is part of this version; the song then stays marked as AI-assisted.
  aiAssisted?: boolean;
  // The lines that AI rewrite produced, so the authorship record can tell them from typed lines.
  aiLines?: string[];
};

export const serializeSong = (id: string, data: FirebaseFirestore.DocumentData) => ({
  id,
  title: (data.title as string | undefined) ?? null,
  lyrics: (data.lyrics as string | undefined) ?? '',
  prompt: (data.prompt as string | undefined) ?? null,
  characterId: (data.characterId as string | undefined) ?? null,
  threadId: (data.threadId as string | undefined) ?? null,
  metadata: data.metadata && typeof data.metadata === 'object' ? data.metadata : {},
  versionCount: typeof data.versionCount === 'number' ? data.versionCount : 0,
  shareId: typeof data.shareId === 'string' ? data.shareId : null,
  aiAssisted: isAiAssisted(data),
  createdAt: serializeTimestamp(data.createdAt),
  updatedAt: serializeTimestamp(data.updatedAt)
});

export const serializeVersion = (id: string, data: FirebaseFirestore.DocumentData) => ({
  id,
  title: (data.title as string | undefined) ?? null,
  lyrics: (data.lyrics as string | undefined) ?? '',
  style: (data.style as string | undefined) ?? null,
  source: (data.source as VersionSource | undefined) ?? 'manual',
  aiLines: Array.isArray(data.aiLines) ? (data.aiLines as unknown[]).filter((line): line is string => typeof line === 'string') : [],
  createdAt: serializeTimestamp(data.createdAt)
});

// Appends a version and updates the song to match it. Songs saved before versioning existed
// get their current content preserved as an 'initial' version first.
export async function appendSongVersion(songRef: DocumentReference, input: VersionInput) {
  const versionsRef = songRef.collection('versions');
  const now = Timestamp.now();

  await adminDb.runTransaction(async tx => {
    const songSnap = await tx.get(songRef);
    if (!songSnap.exists) {
      throw new Error('SONG_NOT_FOUND');
    }

    const song = songSnap.data() ?? {};
    let added = 0;

    if (typeof song.versionCount !== 'number' && typeof song.lyrics === 'string' && song.lyrics) {
      tx.set(versionsRef.doc(), {
        title: song.title ?? null,
        lyrics: song.lyrics,
        style: song.metadata?.style ?? null,
        source: 'initial',
        createdAt: song.updatedAt ?? song.createdAt ?? now
      });
      added += 1;
    }

    tx.set(versionsRef.doc(), {
      title: input.title,
      lyrics: input.lyrics,
      style: input.style ?? null,
      source: input.source,
      ...(input.aiLines?.length ? { aiLines: input.aiLines } : {}),
      createdAt: now
    });
    added += 1;

    const updates: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = {
      title: input.title,
      lyrics: input.lyrics,
      updatedAt: now,
      versionCount: FieldValue.increment(added)
    };
    if (input.style !== undefined) {
      updates['metadata.style'] = input.style;
    }
    if (input.aiAssisted) {
      updates.aiAssisted = true;
    }
    tx.update(songRef, updates);

    // Keep the public share page in sync with the latest version.
    if (typeof song.shareId === 'string' && song.shareId) {
      tx.set(
        adminDb.collection(SHARED_SONGS_COLLECTION).doc(song.shareId),
        {
          title: input.title,
          lyrics: input.lyrics,
          ...(input.style !== undefined ? { style: input.style } : {}),
          aiAssisted: input.aiAssisted || isAiAssisted(song),
          updatedAt: now
        },
        { merge: true }
      );
    }
  });

  await pruneOldVersions(songRef);
}

async function pruneOldVersions(songRef: DocumentReference) {
  const stale = await songRef
    .collection('versions')
    .orderBy('createdAt', 'desc')
    .offset(MAX_VERSIONS_PER_SONG)
    .get();

  if (stale.empty) {
    return;
  }

  const batch = adminDb.batch();
  stale.docs.forEach(doc => batch.delete(doc.ref));
  batch.update(songRef, { versionCount: FieldValue.increment(-stale.size) });
  await batch.commit();
}

// Auto-saved lyrics from the same conversation with the same title are revisions of one song.
export async function findAutoSaveTarget(
  userId: string,
  threadId: string,
  title: string | null
): Promise<DocumentReference | null> {
  if (!title) {
    return null;
  }

  const snapshot = await adminDb
    .collection('users')
    .doc(userId)
    .collection('songs')
    .where('threadId', '==', threadId)
    .get();

  const match = snapshot.docs
    .filter(doc => doc.get('title') === title)
    .sort(
      (a, b) =>
        (b.get('updatedAt')?.toMillis?.() ?? 0) - (a.get('updatedAt')?.toMillis?.() ?? 0)
    )[0];

  return match?.ref ?? null;
}

export async function shareSong(ownerId: string, songRef: DocumentReference) {
  const songSnap = await songRef.get();
  const song = songSnap.data() ?? {};
  if (typeof song.shareId === 'string' && song.shareId) {
    return song.shareId as string;
  }

  const shareRef = adminDb.collection(SHARED_SONGS_COLLECTION).doc();
  const now = Timestamp.now();
  const batch = adminDb.batch();
  batch.set(shareRef, {
    ownerId,
    songId: songRef.id,
    title: song.title ?? null,
    lyrics: song.lyrics ?? '',
    style: song.metadata?.style ?? null,
    // Drives the "AI 생성" label on the public page and share image.
    aiAssisted: isAiAssisted(song),
    createdAt: now,
    updatedAt: now
  });
  batch.update(songRef, { shareId: shareRef.id });
  await batch.commit();
  return shareRef.id;
}

export async function unshareSong(songRef: DocumentReference) {
  const shareId = (await songRef.get()).get('shareId');
  const batch = adminDb.batch();
  if (typeof shareId === 'string' && shareId) {
    batch.delete(adminDb.collection(SHARED_SONGS_COLLECTION).doc(shareId));
  }
  batch.update(songRef, { shareId: FieldValue.delete() });
  await batch.commit();
}

// Deletes a song with its versions, generated audio and public share page.
export async function deleteSongDeep(songRef: DocumentReference) {
  const shareId = (await songRef.get()).get('shareId');
  if (typeof shareId === 'string' && shareId) {
    await adminDb.collection(SHARED_SONGS_COLLECTION).doc(shareId).delete();
  }
  const ownerId = songRef.parent.parent?.id;
  if (ownerId) {
    await deleteSongAudioFiles(ownerId, songRef.id);
  }
  await adminDb.recursiveDelete(songRef);
}

export async function deleteSharedSongsByOwner(ownerId: string) {
  const snapshot = await adminDb
    .collection(SHARED_SONGS_COLLECTION)
    .where('ownerId', '==', ownerId)
    .get();
  await Promise.all(snapshot.docs.map(doc => doc.ref.delete()));
}
