import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent, KeyboardEvent, useEffect, useState } from 'react';

import { AssistantMessageBody } from '@/components/AssistantMessageBody';
import { CrisisHelpBanner } from '@/components/chat/CrisisHelpBanner';
import { useAuth } from '@/context/AuthContext';
import { AI_OUTPUT_CAVEAT, AI_SERVICE_NOTICE } from '@/lib/aiDisclosure';
import { trackEvent } from '@/lib/analytics';
import { CHARACTER_PROFILES } from '@/lib/chat/model';
import { extractLyrics } from '@/lib/lyricsFormat';
import { saveTrialLyrics } from '@/lib/trialHandoff';

type Turn = { role: 'user' | 'assistant'; content: string };

const DAYEON = CHARACTER_PROFILES['1'];
const MAX_MESSAGE = 1000;
const REGISTER_HREF = `/auth/register?redirect=${encodeURIComponent('/suno')}`;

// No-signup trial with Dayeon (POST /api/trial/chat). Nothing is saved on the server; the latest
// lyrics are kept in this browser so they can be saved to the library right after sign-up.
export default function TryPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [adult, setAdult] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [showCrisis, setShowCrisis] = useState(false);

  const prompt = typeof router.query.prompt === 'string' ? router.query.prompt.slice(0, 500) : '';

  // Members go straight to the full chat with the same starting prompt.
  useEffect(() => {
    if (!loading && user) {
      void router.replace(`/chat?characterId=1${prompt ? `&prompt=${encodeURIComponent(prompt)}` : ''}`);
    }
  }, [loading, prompt, router, user]);

  useEffect(() => {
    if (prompt) {
      setInput(prompt);
    }
  }, [prompt]);

  const lyrics = [...turns].reverse().map(turn => (turn.role === 'assistant' ? extractLyrics(turn.content) : null)).find(Boolean) ?? null;
  const canSend = adult && input.trim().length > 0 && !busy && !limitReached;

  const send = async () => {
    const text = input.trim();
    if (!canSend) {
      return;
    }
    setBusy(true);
    setError(null);
    setTurns(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    trackEvent('trial_message', { turn: turns.filter(turn => turn.role === 'user').length + 1 });
    try {
      const response = await fetch('/api/trial/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: turns, adult: true })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (payload.code === 'TRIAL_LIMIT' || payload.code === 'TRIAL_CLOSED') {
          setLimitReached(true);
        }
        throw new Error(typeof payload.error === 'string' ? payload.error : '잠시 후 다시 시도해 주세요.');
      }
      setTurns(prev => [...prev, { role: 'assistant', content: payload.reply }]);
      setRemaining(typeof payload.remaining === 'number' ? payload.remaining : null);
      setLimitReached(payload.remaining === 0);
      setShowCrisis(Boolean(payload.crisis));
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : '잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void send();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter breaks the line; ignore Enter while a Korean IME is composing.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  };

  const goRegister = () => {
    if (lyrics) {
      saveTrialLyrics(lyrics);
    }
    trackEvent('trial_signup_click', { hasLyrics: Boolean(lyrics) });
    void router.push(REGISTER_HREF);
  };

  return (
    <>
      <Head>
        <title>가입 없이 다연과 가사 써 보기 | NovaSingerAI</title>
        <meta key="description" name="description" content="가입 없이 AI 싱어송라이터 다연과 한국어 가사를 써 보세요." />
        <meta name="robots" content="noindex" />
      </Head>
      <main className="trial">
        <header className="trial__header">
          <Link href="/">← NovaSingerAI</Link>
          <h1>가입 없이 다연과 가사 써 보기</h1>
          <p>
            하루 3번까지 메시지를 보낼 수 있어요. 체험 대화는 저장되지 않고, 가입하면 마지막 가사를 보관함에 옮겨 드려요.
          </p>
        </header>

        <section className="trial__chat" aria-live="polite">
          <div className="trial__message trial__message--assistant">
            <strong>{DAYEON.name}</strong>
            <span>{DAYEON.greeting}</span>
          </div>
          {turns.map((turn, index) => (
            <div key={index} className={`trial__message trial__message--${turn.role}`}>
              {turn.role === 'assistant' ? (
                <>
                  <strong>{DAYEON.name}</strong>
                  <AssistantMessageBody content={turn.content} showComingSoon={false} />
                </>
              ) : (
                <span>{turn.content}</span>
              )}
            </div>
          ))}
          {busy ? <p className="trial__typing">다연이 쓰는 중...</p> : null}
        </section>

        {showCrisis ? <CrisisHelpBanner onClose={() => setShowCrisis(false)} /> : null}

        {lyrics || limitReached ? (
          <div className="trial__cta">
            <p>{lyrics ? '이 가사를 보관함에 저장하고 계속 다듬어 보세요.' : '가입하면 다연과 이어서 쓸 수 있어요.'}</p>
            <button type="button" className="btn btn--primary" onClick={goRegister}>
              {lyrics ? '무료로 가입하고 가사 저장하기' : '무료로 가입하기'}
            </button>
          </div>
        ) : null}

        <form className="trial__form" onSubmit={handleSubmit}>
          <label className="trial__adult">
            <input type="checkbox" checked={adult} onChange={event => setAdult(event.target.checked)} />
            <span>만 19세 이상입니다 (필수)</span>
          </label>
          <textarea
            value={input}
            maxLength={MAX_MESSAGE}
            rows={3}
            placeholder="오늘 있었던 일이나 쓰고 싶은 노래를 말해 주세요."
            onChange={event => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={busy || limitReached}
          />
          <div className="trial__actions">
            <span className="trial__remaining">
              {remaining !== null ? `오늘 남은 체험 ${remaining}회` : '오늘 체험 3회'}
            </span>
            <button type="submit" className="btn btn--primary" disabled={!canSend}>
              {busy ? '보내는 중...' : '보내기'}
            </button>
          </div>
          {error ? <p className="trial__error">{error}</p> : null}
          <p className="trial__notice">
            {AI_SERVICE_NOTICE} {AI_OUTPUT_CAVEAT} 체험을 시작하면 <Link href="/terms">이용약관</Link>과{' '}
            <Link href="/privacy">개인정보처리방침</Link>에 동의하는 것으로 봅니다.
          </p>
        </form>
      </main>
    </>
  );
}
