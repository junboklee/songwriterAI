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
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXX        # optional GA4 tracking
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=xxxxx     # optional Search Console verification code
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX                 # optional Google Tag Manager container (or set NEXT_PUBLIC_GOOGLE_TAG_ID)
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
- Expand automated coverage for /api/chat, 레이트리밋, 자동 가사 저장 흐름, 그리고 대시보드 주요 위젯.
- Build a regression checklist (또는 자동 Lighthouse 스크립트)로 마케팅 페이지 성능·SEO 점수를 추적하세요.

## SEO & Localization Checklist
1. **콘텐츠 정비 (완료)** – /, /features, /pricing 카피와 메타 정보를 최신 한국어 버전으로 갱신했습니다.
2. **로케일 확장 (완료)** – locales/en.ts 등록 및 Provider 업데이트로 다국어 확장을 위한 기본 구조를 마련했습니다.
3. **Lighthouse** – `npm run lighthouse` (환경변수 `LIGHTHOUSE_URL` 설정 가능)로 자동 리포트를 생성하거나, Chrome DevTools > Lighthouse에서 Performance·SEO 리포트를 주기적으로 측정하세요.
4. **Sitemap / Robots** – 
pm run build 후 공개 URL(https://novasingerai.com/sitemap.xml)을 Search Console에 제출하는 루틴을 유지하세요.
5. **GA4 / Search Console / GTM** – .env.local에 측정 ID를 채우고 components/SeoMeta.tsx + _document.tsx에서 로딩 여부를 확인하세요.
6. **모니터링** – GA4·Search Console 지표와 Firebase Hosting/Vercel 로그를 주 1회 이상 확인해 404/500 이벤트를 추적하세요.
