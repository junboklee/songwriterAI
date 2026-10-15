# songwriterAI

## Backend Overview
- Next.js API routes backed by Firebase Admin for secure Firestore access.
- OpenAI Responses API handles lyric generation (`lib/llm.ts`). Conversation history lives in Firestore and is replayed on each request, so no state is kept on OpenAI.
- Every character prompt is combined with the shared songwriting rules in `lib/songwritingPrompt.ts`, which ask the model to wrap lyrics in `<lyrics title="...">` / `<style>` markup (parsed by `lib/lyricsFormat.ts`).
- Firestore stores user profiles, conversation threads + messages, and saved song drafts.

## Required Environment Variables
Add the following server-side keys to `.env.local` (or the deployment environment) in addition to the existing `NEXT_PUBLIC_FIREBASE_*` values:

```
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
OPENAI_API_KEY=sk-...
OPENAI_CHAT_MODEL=gpt-5.4-mini                 # optional, defaults to gpt-5.4-mini (GPT-5 family runs with low reasoning effort)
CHARACTER_PROMPT_DAYEON=...                     # optional override for the built-in Dayeon persona
CHARACTER_PROMPT_DEFAULT=...                    # optional override for the default (no character) persona
CHAT_MONTHLY_LIMIT_FREE=0                       # optional monthly AI request cap for the free plan (0/unset = unlimited)
CHAT_MONTHLY_LIMIT_STUDIO=0                     # same for users whose users/{uid}.plan is 'studio'
CHARACTER_REPORT_HIDE_THRESHOLD=5               # distinct reports before a public character is hidden for review
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXX        # optional GA4 tracking
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=xxxxx     # optional Search Console verification code
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX                 # optional Google Tag Manager container (or set NEXT_PUBLIC_GOOGLE_TAG_ID)
```

> **Tip:** When copying the private key, replace literal newlines with `\n` so that the value stays on one line.

The frontend continues to use the Firebase Web SDK; server routes verify Firebase ID tokens from either the `Authorization: Bearer <token>` header or the `__session` cookie.

## Firebase rules
`firestore.rules` denies all direct client access because every read/write goes through API routes using the Admin SDK. Deploy rules and the composite index for the explore page with:

```
firebase deploy --only firestore:rules,firestore:indexes,storage
```

## Migrating from the Assistants API
Characters no longer create OpenAI Assistants. To keep the original Dayeon prompt, run (while the legacy API still responds):

```
OPENAI_API_KEY=sk-... node scripts/export-assistant-instructions.mjs asst_ED99NuKgahDCWbPaId4kUwq1
```

and store the output in the `CHARACTER_PROMPT_DAYEON` secret/env var.

## Admin: report review
`/admin/reports` lists open character reports and characters hidden by the report threshold, with actions hide / restore / dismiss / unpublish (`POST /api/admin/characters/{id}`). Access is limited to accounts whose **verified** email is listed in `ADMIN_EMAILS` (comma-separated, see `apphosting.yaml`); with no value the admin API answers 403.

## Production smoke tests
`scripts/smoke/api.mjs` and `scripts/smoke/ui.mjs` exercise the deployed site end to end (streaming chat, versions, share pages, dashboard, chat UI) as a dedicated ordinary account, then delete the data they created. No server secrets are needed.

```
SMOKE_EMAIL=... SMOKE_PASSWORD=... npm run smoke:api
SMOKE_EMAIL=... SMOKE_PASSWORD=... npm run smoke:ui   # needs Chrome (CHROME_PATH)
```

`.github/workflows/prod-smoke.yml` runs both daily at 09:00 KST, after each push to `main` (once the new App Hosting build is live) and on demand. Set the repository secrets `SMOKE_EMAIL` / `SMOKE_PASSWORD`; without them the job is skipped.

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
- Body: `{ message: string, threadId?: string, characterId?: string }`
- `threadId` must belong to the caller (404 `THREAD_NOT_FOUND` otherwise); omit it to start a new conversation.
- Response: `{ threadId, messages, reply }`. With `Accept: text/event-stream` the reply is streamed as SSE `delta` events followed by one `done` event carrying the same payload (`lib/chatClient.ts` handles this).
- Rate limited per user (`CHAT_RATE_LIMIT_MAX_REQUESTS` per `CHAT_RATE_LIMIT_WINDOW_MS`).

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
- Lists saved song drafts with metadata, `versionCount` and `shareId`.

### `POST /api/profile/songs`
- Creates a song with its first version. Auto-saves from chat (`metadata.source: 'auto-from-chat'`) with the same `threadId` and title are appended as a new version of the existing song instead.

### `GET | PATCH | DELETE /api/profile/songs/{songId}`
- `GET` returns the song and up to 50 versions (`users/{uid}/songs/{songId}/versions`).
- `PATCH { title?, lyrics?, style? }` saves a new version; `{ restoreVersionId }` restores one; `{ share: true|false }` creates or removes the public page `/s/{shareId}` (`sharedSongs/{shareId}`, kept in sync on every new version, `noindex`).
- `DELETE` removes the song, its versions and its share page.

### Character market
- `GET /api/characters/explore?q=&category=&sort=recent|popular&cursor=` — public characters (prompts are never exposed). Popularity = likes × 3 + chats started.
- `POST | DELETE /api/characters/{id}/like`, `POST /api/characters/{id}/report { reason, detail? }`.
- Public/unlisted characters are screened with the OpenAI moderation API on create/update (`lib/moderation.ts`).

### Usage
- Every successful chat reply increments `users/{uid}/usage/{YYYY-MM}` (KST months) with request and token counts; `GET /api/profile` returns the current month's usage.

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
4. **자동 체크리스트** – `npm run seo:check` 명령으로 robots.txt, sitemap, GA4/GTM, canonical 기본 구성이 유지되는지 즉시 확인하세요.
5. **Sitemap / Robots** – `npm run build` 후 배포 URL(https://novasingerai.com/sitemap.xml)을 Search Console에 제출해 지도가 최신인지 확인하세요.
6. **GA4 / Search Console / GTM** – .env.local에 발급받은 ID를 기입하고 components/SeoMeta.tsx + _document.tsx에서 로드 여부를 점검하세요.
7. **알림** – GA4·Search Console 알림을 Firebase Hosting/Vercel 로그와 함께 모니터링하며 404/500 이벤트를 주기적으로 확인하세요.
