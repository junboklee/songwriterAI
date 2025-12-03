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
- Connect UI pages to the new profile and history endpoints for dashboards, recent chats, and saved lyrics.

## SEO 실행 가이드 (초보용)
1. **페이지 확인** ? `npm run dev`로 로컬 서버를 띄우고 `/`, `/features`, `/pricing` 등 공개 페이지가 정상 노출되는지 확인하세요.
2. **콘텐츠 작성** ? 서비스 한 줄 요약, 핵심 기능, CTA 문장을 먼저 메모한 뒤 `pages/index.tsx`와 추가 페이지의 문구를 다듬습니다.
3. **Lighthouse 점검** ? Chrome DevTools > Lighthouse에서 Performance·SEO 리포트를 생성해 LCP, CLS, 색인 문제를 기록하고 제안된 개선 사항을 반영합니다.
4. **i18n 반영** ? 번역 키를 `locales` 폴더에 추가하고 `I18nProvider`로 노출 언어를 전환합니다. 새 페이지 문구도 동일한 키로 추출해 중복 번역을 막으세요.
5. **사이트맵/robots 생성** ? `npm run build`를 실행하면 postbuild 훅이 자동으로 `public/sitemap*.xml`과 `robots.txt`를 만듭니다. Search Console에 `https://novasingerai.com/sitemap.xml`을 제출하세요.
6. **GA4 / Search Console / GTM 연동** ? `.env.local`에 `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_GTM_ID`를 채우면 `components/SeoMeta.tsx` + `_document.tsx`가 Google 태그/Tag Manager/검증 메타를 자동으로 삽입합니다. 프로덕션 환경 변수에도 동일한 키로 값을 넣으세요.
7. **모니터링** ? 배포 후 GA4 리포트와 Search Console 색인 현황을 주기적으로 확인하고, 404/500 로그는 Firebase Hosting이나 Vercel Logs에서 모니터링하세요.
