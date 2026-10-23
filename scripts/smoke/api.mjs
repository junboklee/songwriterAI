// API smoke test against a deployed environment. Usage: npm run smoke:api
import { BASE_URL, check, cleanupTestData, finish, getIdToken } from './common.mjs';

const extractLyrics = text => {
  const matches = [...text.matchAll(/<lyrics(?:\s+title\s*=\s*"([^"]*)")?\s*>([\s\S]*?)<\/lyrics>/gi)];
  const last = matches.at(-1);
  if (!last) return null;
  return {
    title: last[1]?.trim() || null,
    body: last[2].trim(),
    style: text.match(/<style>([\s\S]*?)<\/style>/i)?.[1]?.trim() ?? null
  };
};

const idToken = await getIdToken();
const auth = { Authorization: `Bearer ${idToken}` };
const json = { ...auth, 'Content-Type': 'application/json' };

try {
  // Adult-only policy: minors are refused, and the smoke account stays confirmed (idempotent).
  const ageCall = birthDate =>
    fetch(`${BASE_URL}/api/profile/age`, { method: 'POST', headers: json, body: JSON.stringify({ birthDate }) }).then(
      async r => ({ status: r.status, data: await r.json().catch(() => ({})) })
    );
  const minor = await ageCall(`${new Date().getFullYear() - 15}0101`);
  check('age: under 19 is refused', minor.status === 403 && minor.data.code === 'UNDER_AGE', String(minor.status));
  const adult = await ageCall('19900101');
  check('age: adult confirmation', adult.status === 200 && adult.data.confirmed === true, String(adult.status));

  // Streaming chat in a new conversation.
  const stream = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { ...json, Accept: 'text/event-stream' },
    body: JSON.stringify({ message: '비 오는 밤에 어울리는 짧은 발라드 가사를 써줘. 1절과 후렴만.' })
  });
  const raw = await stream.text();
  const deltaCount = (raw.match(/^event: delta$/gm) ?? []).length;
  const doneData = raw.split('event: done\ndata: ')[1]?.split('\n\n')[0];
  const done = doneData ? JSON.parse(doneData) : null;
  check('chat: SSE stream with deltas and done event', stream.ok && deltaCount > 3 && !!done, `${deltaCount} deltas`);
  const lyrics = extractLyrics(done?.reply?.content ?? '');
  check('chat: reply contains a <lyrics> block', !!lyrics, lyrics?.title ?? done?.reply?.content);
  const threadId = done?.threadId;

  // Follow-up uses stored history.
  const follow = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ message: '방금 쓴 가사의 제목만 한 줄로 말해줘.', threadId })
  });
  const followData = await follow.json();
  check('chat: follow-up in the same thread', follow.ok && followData.messages?.length >= 4, followData.reply?.content);

  const foreign = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ message: 'hi', threadId: 'thread_not_mine' })
  });
  check('chat: unknown threadId is rejected (404)', foreign.status === 404);

  // Auto-save twice with the same title -> one song with two versions.
  const save = body =>
    fetch(`${BASE_URL}/api/profile/songs`, { method: 'POST', headers: json, body: JSON.stringify(body) }).then(
      async r => ({ status: r.status, data: await r.json() })
    );
  const base = {
    title: lyrics?.title ?? '스모크 테스트',
    threadId,
    metadata: { source: 'auto-from-chat', style: lyrics?.style ?? null }
  };
  const first = await save({ ...base, lyrics: lyrics?.body ?? '[Verse 1]\n테스트' });
  const second = await save({ ...base, lyrics: `${lyrics?.body ?? '[Verse 1]\n테스트'}\n[Outro]\n빗소리만 남아` });
  const songId = first.data.song?.id;
  check('songs: auto-save creates a song', first.status === 201 && !!songId);
  check('songs: repeated auto-save becomes a version', second.data.revised === true && second.data.song?.id === songId);

  // Share, edit sync, unshare.
  const songUrl = `${BASE_URL}/api/profile/songs/${songId}`;
  const shared = await fetch(songUrl, { method: 'PATCH', headers: json, body: JSON.stringify({ share: true }) }).then(r => r.json());
  const shareId = shared.song?.shareId;
  const page = await fetch(`${BASE_URL}/s/${shareId}`);
  const html = await page.text();
  check('share: public page renders (noindex, no CDN cache)', page.ok && html.includes('noindex') && /no-store/.test(page.headers.get('cache-control') ?? ''));
  const card = await fetch(`${BASE_URL}/api/og/song/${shareId}`);
  check('share: preview image renders', card.ok && (card.headers.get('content-type') ?? '').includes('image/png'));
  await fetch(songUrl, { method: 'PATCH', headers: json, body: JSON.stringify({ lyrics: '[Chorus]\n스모크 수정 후렴' }) });
  check('share: edits appear immediately', (await (await fetch(`${BASE_URL}/s/${shareId}`)).text()).includes('스모크 수정 후렴'));
  await fetch(songUrl, { method: 'PATCH', headers: json, body: JSON.stringify({ share: false }) });
  check('share: unsharing removes the page', (await fetch(`${BASE_URL}/s/${shareId}`)).status === 404);
  check('share: unsharing removes the preview image', (await fetch(`${BASE_URL}/api/og/song/${shareId}`)).status === 404);

  // Public catalogue never leaks prompts; usage is recorded.
  const explore = await fetch(`${BASE_URL}/api/characters/explore?sort=popular&limit=5`);
  const exploreData = await explore.json();
  const leaked = (exploreData.characters ?? []).some(item => 'instructions' in item || 'creatorId' in item);
  check('explore: public list without prompts', explore.ok && !leaked, `${exploreData.characters?.length} items`);
  const profile = await fetch(`${BASE_URL}/api/profile`, { headers: auth }).then(r => r.json());
  check('usage: monthly counter present', typeof profile.usage?.chatRequests === 'number' && profile.usage.chatRequests >= 2);
} catch (error) {
  check('api smoke run', false, error.message);
} finally {
  check('cleanup: test data removed', await cleanupTestData(idToken).catch(() => false));
  finish();
}
