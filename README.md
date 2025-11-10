# songwriterAI

## Backend Overview
- Next.js API routes backed by Firebase Admin for secure Firestore access.
- OpenAI Assistants API handles lyric generation; chat responses are stored per user.
- Firestore stores user profiles, conversation threads + messages, and saved song drafts.

## Required Environment Variables
Add the following server-side keys to `.env.local` (or the deployment environment) in addition to the existing `NEXT_PUBLIC_FIREBASE_*` values:

```
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
OPENAI_ASSISTANT_ID=asst_xxx   # ensure the casing matches this key
```

> **Tip:** When copying the private key, replace literal newlines with `\n` so that the value stays on one line.

The frontend continues to use the Firebase Web SDK; server routes verify Firebase ID tokens from either the `Authorization: Bearer <token>` header or the `__session` cookie.

## Firestore Data Model
```
users/{uid}
  displayName, email, photoURL, recentCharacterIds[], lastCharacterId
  conversations/{threadId}
    title, lastMessagePreview, messageCount, characterId
    messages/{messageId}
      role, content, createdAt, characterId
  songs/{songId}
    title, lyrics, characterId, metadata, threadId
```

## API Summary
All routes require a valid Firebase ID token.

### `POST /api/chat`
- Body: `{ message: string, threadId?: string, characterId?: string, songDraft?: { id?, title?, lyrics, metadata?, characterId? } }`
- Response: `{ threadId, messages, reply }`
- After each call, the user profile, conversation, messages, and optional song draft persist to Firestore.

### `GET /api/profile`
- Returns profile details plus aggregate stats (`conversationCount`, `songCount`).

### `PATCH /api/profile`
- Body: `{ displayName?, photoURL?, preferences?, recentCharacterIds? }`
- Updates user profile metadata.

### `GET /api/profile/conversations`
- Query params: `limit` (<=50), `cursor` (millis from previous `updatedAt`).
- Lists conversations ordered by recent activity, supplying `nextCursor` when more pages exist.

### `GET /api/profile/conversations/{threadId}`
- Query params: `limit` (<=100), `cursor` (millis from previous `createdAt`).
- Returns the conversation header plus paginated messages.

### `GET /api/profile/songs`
- Query params: `limit` (<=50), `cursor` (millis from previous `createdAt`).
- Lists saved song drafts with metadata.

## Client Integration Notes
- Obtain the Firebase ID token on the client via `getIdToken()` and attach it to API requests.
- Provide `characterId` whenever a request is tied to a specific persona so recent-character tracking remains accurate.
- To store a song immediately after generation, send the lyrics and optional metadata via the `songDraft` payload when calling `/api/chat`.

## Next Steps
- Implement Apple sign-in on the frontend (`OAuthProvider('apple.com')` with Firebase Auth).
- Connect UI pages to the new profile and history endpoints for dashboards, recent chats, and saved lyrics.
