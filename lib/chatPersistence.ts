import { adminDb } from '@/lib/firebaseAdmin';
import type { AuthenticatedUser } from '@/lib/serverAuth';
import { Timestamp } from 'firebase-admin/firestore';
import type { DocumentData, DocumentSnapshot } from 'firebase-admin/firestore';

type PersistedMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: Date | null;
  characterId?: string | null;
};

type SongDraftInput = {
  id?: string | null;
  title?: string | null;
  lyrics?: string | null;
  prompt?: string | null;
  metadata?: Record<string, unknown> | null;
  characterId?: string | null;
};

const MAX_PREVIEW_LENGTH = 200;

export async function saveThreadSnapshot({
  user,
  threadId,
  messages,
  characterId,
  songDraft
}: {
  user: AuthenticatedUser;
  threadId: string;
  messages: PersistedMessage[];
  characterId?: string | null;
  songDraft?: SongDraftInput | null;
}) {
  const userRef = adminDb.collection('users').doc(user.uid);
  const threadRef = userRef.collection('threads').doc(threadId);
  const conversationRef = userRef.collection('conversations').doc(threadId);
  const nowDate = new Date();
  const nowTs = Timestamp.fromDate(nowDate);

  const sanitizedMessages = messages.map(message => ({
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt:
      message.createdAt instanceof Date && !Number.isNaN(message.createdAt.getTime())
        ? message.createdAt
        : nowDate,
    characterId: message.characterId ?? null
  }));

  const hasSongLyrics =
    songDraft && typeof songDraft.lyrics === 'string' && songDraft.lyrics.trim().length > 0;
  const hasSongPrompt =
    songDraft && typeof songDraft.prompt === 'string' && songDraft.prompt.trim().length > 0;

  const normalizedSongDraft =
    songDraft && typeof songDraft === 'object' && (hasSongLyrics || hasSongPrompt)
      ? {
          id: songDraft.id ?? undefined,
          title:
            typeof songDraft.title === 'string' && songDraft.title.trim().length > 0
              ? songDraft.title.trim()
              : null,
          lyrics:
            typeof songDraft.lyrics === 'string' && songDraft.lyrics.trim().length > 0
              ? songDraft.lyrics.trim()
              : null,
          prompt:
            typeof songDraft.prompt === 'string' && songDraft.prompt.trim().length > 0
              ? songDraft.prompt.trim()
              : null,
          metadata:
            songDraft.metadata && typeof songDraft.metadata === 'object'
              ? { ...songDraft.metadata }
              : {},
          characterId: songDraft.characterId ?? characterId ?? null
        }
      : null;

  const songsRef = normalizedSongDraft ? userRef.collection('songs') : null;
  const songRef =
    normalizedSongDraft && songsRef
      ? normalizedSongDraft.id
        ? songsRef.doc(normalizedSongDraft.id)
        : songsRef.doc()
      : null;

  await adminDb.runTransaction(async tx => {
    const readPromises: Promise<DocumentSnapshot<DocumentData>>[] = [
      tx.get(threadRef),
      tx.get(conversationRef)
    ];

    if (songRef) {
      readPromises.push(tx.get(songRef));
    }

    const snapshots = await Promise.all(readPromises);
    const threadSnap = snapshots[0];
    const conversationSnap = snapshots[1];
    const songSnap = songRef ? snapshots[2] : null;

    const messageRefs = sanitizedMessages.map(message =>
      conversationRef.collection('messages').doc(message.id)
    );
    const messageSnaps = await Promise.all(messageRefs.map(ref => tx.get(ref)));

    const lastMessage = sanitizedMessages[sanitizedMessages.length - 1] ?? null;
    const lastMessageDate =
      lastMessage?.createdAt instanceof Date && !Number.isNaN(lastMessage.createdAt.getTime())
        ? lastMessage.createdAt
        : null;
    const lastMessageTs = lastMessageDate ? Timestamp.fromDate(lastMessageDate) : null;

    const threadPayload: Record<string, unknown> = {
      threadId,
      messages: sanitizedMessages,
      updatedAt: nowTs,
      user: {
        uid: user.uid,
        email: user.email ?? null,
        displayName: user.displayName ?? null
      },
      characterId: characterId ?? null
    };

    if (!threadSnap.exists) {
      threadPayload.createdAt = nowTs;
    }

    let messageCount =
      conversationSnap.exists && typeof conversationSnap.get('messageCount') === 'number'
        ? (conversationSnap.get('messageCount') as number)
        : 0;

    sanitizedMessages.forEach((_, index) => {
      if (!messageSnaps[index]?.exists) {
        messageCount += 1;
      }
    });

    sanitizedMessages.forEach((message, index) => {
      const messageRef = messageRefs[index];
      const messageSnap = messageSnaps[index];
      const createdAt =
        message.createdAt instanceof Date && !Number.isNaN(message.createdAt.getTime())
          ? Timestamp.fromDate(message.createdAt)
          : nowTs;

      const messagePayload: Record<string, unknown> = {
        threadId,
        role: message.role,
        content: message.content,
        characterId: message.characterId ?? null,
        updatedAt: nowTs
      };

      if (!messageSnap?.exists) {
        messagePayload.createdAt = createdAt;
      } else if (!messageSnap.get('createdAt')) {
        messagePayload.createdAt = createdAt;
      }

      tx.set(messageRef, messagePayload, { merge: true });
    });

    const conversationPayload: Record<string, unknown> = {
      threadId,
      updatedAt: nowTs,
      messageCount,
      characterId: characterId ?? null
    };

    if (lastMessage) {
      const preview =
        lastMessage.content.length > MAX_PREVIEW_LENGTH
          ? `${lastMessage.content.slice(0, MAX_PREVIEW_LENGTH)}...`
          : lastMessage.content;

      conversationPayload.lastMessageId = lastMessage.id;
      conversationPayload.lastMessageRole = lastMessage.role;
      conversationPayload.lastMessagePreview = preview;
      conversationPayload.lastMessageAt = lastMessageTs ?? nowTs;
    }

    if (!conversationSnap.exists) {
      conversationPayload.createdAt = nowTs;
    }

    tx.set(threadRef, threadPayload, { merge: true });
    tx.set(conversationRef, conversationPayload, { merge: true });

    if (songRef && normalizedSongDraft) {
      const songPayload: Record<string, unknown> = {
        title: normalizedSongDraft.title ?? null,
        lyrics: normalizedSongDraft.lyrics ?? '',
        prompt: normalizedSongDraft.prompt ?? null,
        metadata: normalizedSongDraft.metadata ?? {},
        characterId: normalizedSongDraft.characterId ?? null,
        threadId,
        updatedAt: nowTs
      };

      if (!songSnap?.exists) {
        songPayload.createdAt = nowTs;
      }

      tx.set(songRef, songPayload, { merge: true });
    }
  });
}
