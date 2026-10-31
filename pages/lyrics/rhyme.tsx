import Link from 'next/link';
import { useMemo, useState } from 'react';

import { TopicLayout } from '@/components/TopicLayout';
import { copyText } from '@/lib/clipboard';
import { findRhymes } from '@/lib/rhyme';

// Free, no-signup rhyme finder. Everything runs in the browser against a built-in word bank; picked
// words can be handed to the trial chat to get a verse that uses them.

const MAX_QUERY = 20;
const MAX_PICKS = 8;
// The one-syllable group can hold over a hundred words; show the strongest first.
const SHORT_GROUP_LIMIT = 40;
const EXAMPLES = ['사랑', '눈물', '하늘', '기억', '꿈', '너와 나'];

const GROUP_NAME: Record<number, string> = {
  3: '끝 세 글자 라임',
  2: '끝 두 글자 라임',
  1: '끝 글자 라임'
};

const faqs = [
  {
    q: '한국어 라임은 어떻게 맞추나요?',
    a: '한국어 랩과 노래는 주로 모음으로 라임을 맞춰요. "사랑"과 "마당"처럼 끝 글자들의 모음(ㅏ-ㅏ)이 같으면 귀에 라임으로 들려요. 받침까지 같으면 더 또렷하게 맞아요.'
  },
  {
    q: '두 글자, 세 글자 라임은 무엇인가요?',
    a: '끝 한 글자만 모음이 같으면 가벼운 라임, 끝 두세 글자의 모음이 모두 같으면 다음절 라임(멀티 라임)이에요. 글자 수가 많이 맞을수록 랩에서 더 잘 들려요.'
  },
  {
    q: '야와 아, 워와 어도 라임이 되나요?',
    a: '네. 부를 때 남는 소리가 같아서 라임으로 쳐요. 이 도구는 "야/아", "워/어", "위/이"처럼 소리가 비슷한 모음과, 소리가 같은 "애/에"를 같은 라임으로 찾아 줘요.'
  },
  {
    q: '찾은 단어로 가사까지 쓸 수 있나요?',
    a: '마음에 드는 단어를 눌러 모은 뒤 "다연에게 가사 받기"를 누르면, AI 싱어송라이터 다연이 그 단어들로 라임을 맞춘 가사를 써 줘요. 가입 없이 체험할 수 있어요.'
  }
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: '라임 찾기 · 한국어 각운 사전',
      url: 'https://novasingerai.com/lyrics/rhyme',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web',
      inLanguage: 'ko',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }
    },
    {
      '@type': 'FAQPage',
      mainEntity: faqs.map(item => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a }
      }))
    }
  ]
};

const lyricsHref = (query: string, picks: string[]) => {
  const prompt = `"${query}"와 라임이 맞는 단어로 가사를 써 줘.\n넣을 단어: ${picks.join(', ')}`;
  return `/try?from=rhyme&prompt=${encodeURIComponent(prompt)}`;
};

export default function RhymeFinderPage() {
  const [query, setQuery] = useState('');
  const [picks, setPicks] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');
  const trimmed = query.trim();
  const result = useMemo(() => (trimmed ? findRhymes(trimmed) : null), [trimmed]);

  const search = (value: string) => {
    setQuery(value);
    setExpanded(false);
  };
  const togglePick = (word: string) => {
    setCopied('idle');
    setPicks(current =>
      current.includes(word) ? current.filter(item => item !== word) : [...current, word].slice(-MAX_PICKS)
    );
  };
  const handleCopy = async () => {
    setCopied((await copyText(picks.join(', '))) ? 'done' : 'failed');
  };

  return (
    <TopicLayout
      title="라임 찾기 · 한국어 각운 사전"
      description="단어를 넣으면 끝 글자 모음이 같은 라임 단어를 찾아 줘요. 두 글자·세 글자 다음절 라임까지 한 번에. 랩 가사, 노래 가사 쓸 때 가입 없이 무료로 써 보세요."
      path="/lyrics/rhyme"
      card="rhyme"
      jsonLd={jsonLd}
    >
      <h1>라임 찾기 · 한국어 각운 사전</h1>
      <p className="topic-lead">
        단어를 넣으면 끝 글자의 모음이 같은 단어를 찾아 줘요. 두 글자, 세 글자까지 맞는 다음절 라임을 먼저 보여
        드려요. 랩 가사와 노래 가사를 쓸 때 가입 없이 무료로 써 보세요.
      </p>

      <div className="rhymer">
        <label htmlFor="rhymer-query" className="rhymer__label">
          라임을 찾을 단어
        </label>
        <input
          id="rhymer-query"
          className="rhymer__input"
          value={query}
          maxLength={MAX_QUERY}
          placeholder="예: 사랑"
          autoComplete="off"
          onChange={event => search(event.target.value)}
        />
        <div className="rhymer__chips" aria-label="예시 단어">
          {EXAMPLES.map(example => (
            <button key={example} type="button" className="rhymer__chip" onClick={() => search(example)}>
              {example}
            </button>
          ))}
        </div>

        <section className="rhymer__result" aria-live="polite" aria-label="찾은 라임">
          {!trimmed ? (
            <p className="rhymer__hint">단어를 넣거나 예시를 눌러 보세요.</p>
          ) : !result ? (
            <p className="rhymer__hint">한글 단어를 넣어 주세요.</p>
          ) : (
            <>
              <p className="rhymer__label">
                「{trimmed}」의 끝 모음 <span className="rhymer__pattern">{result.pattern.join(' - ')}</span>
              </p>
              {result.groups.length ? (
                result.groups.map(group => {
                  const limited = group.length === 1 && !expanded && group.words.length > SHORT_GROUP_LIMIT;
                  const words = limited ? group.words.slice(0, SHORT_GROUP_LIMIT) : group.words;
                  return (
                    <section key={group.length} className="rhymer__group" aria-label={GROUP_NAME[group.length]}>
                      <p className="rhymer__label">
                        {GROUP_NAME[group.length]} <span className="rhymer__hint">· {group.words.length}개</span>
                      </p>
                      <div className="rhymer__chips">
                        {words.map(word => {
                          const picked = picks.includes(word);
                          return (
                            <button
                              key={word}
                              type="button"
                              aria-pressed={picked}
                              className={`rhymer__chip${picked ? ' rhymer__chip--on' : ''}`}
                              onClick={() => togglePick(word)}
                            >
                              {word}
                            </button>
                          );
                        })}
                        {limited ? (
                          <button type="button" className="rhymer__more" onClick={() => setExpanded(true)}>
                            {group.words.length - SHORT_GROUP_LIMIT}개 더 보기
                          </button>
                        ) : null}
                      </div>
                    </section>
                  );
                })
              ) : (
                <p className="rhymer__hint">아직 이 소리로 끝나는 단어가 단어장에 없어요. 다른 단어로 찾아보세요.</p>
              )}
            </>
          )}
        </section>

        {picks.length ? (
          <section className="rhymer__result" aria-label="고른 단어">
            <p className="rhymer__label">
              고른 단어 <span className="rhymer__hint">· {MAX_PICKS}개까지</span>
            </p>
            <p className="rhymer__picks" data-testid="rhyme-picks">
              {picks.join(', ')}
            </p>
            <div className="rhymer__actions">
              {trimmed ? (
                <Link href={lyricsHref(trimmed, picks)} className="btn btn--primary">
                  다연에게 가사 받기
                </Link>
              ) : null}
              <button type="button" className="btn btn--ghost" onClick={handleCopy}>
                {copied === 'done' ? '복사했어요' : '복사하기'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setPicks([])}>
                비우기
              </button>
            </div>
            {copied === 'failed' ? <p className="rhymer__hint">복사하지 못했어요. 글자를 길게 눌러 직접 복사해 주세요.</p> : null}
          </section>
        ) : null}
      </div>

      <h2>라임 잘 쓰는 팁</h2>
      <ul>
        <li>라임은 줄 끝에 두세요. 줄이 끝나는 자리에서 소리가 겹칠 때 가장 잘 들려요.</li>
        <li>한 글자보다 두세 글자 라임이 또렷해요. 같은 소리가 길게 이어지면 랩의 맛이 살아나요.</li>
        <li>같은 단어를 반복하는 건 라임이 아니에요. &quot;사랑&quot;과 &quot;첫사랑&quot;보다 &quot;사랑&quot;과 &quot;마당&quot;이 라임이에요.</li>
        <li>라임 때문에 뜻이 어색해지면 과감히 버리세요. 이야기가 먼저고, 라임은 그다음이에요.</li>
        <li>
          다 쓴 가사는 <Link href="/lyrics/check">가창성 검사기</Link>로 줄마다 음절 수와 각운을 한눈에 확인해 보세요.
        </li>
      </ul>

      <h2>함께 보면 좋은 가이드</h2>
      <ul className="topic-links">
        <li>
          <Link href="/lyrics/rap-lyrics">랩 가사 쓰는 법</Link>
        </li>
        <li>
          <Link href="/lyrics/how-to-write-lyrics">작사하는 법</Link>
        </li>
        <li>
          <Link href="/lyrics/style">Suno 스타일 프롬프트 만들기</Link>
        </li>
        <li>
          <Link href="/lyrics/check">가사 음절 수 세기</Link>
        </li>
      </ul>

      <h2>자주 묻는 질문</h2>
      <dl>
        {faqs.map(item => (
          <div key={item.q}>
            <dt>{item.q}</dt>
            <dd>{item.a}</dd>
          </div>
        ))}
      </dl>

      <div className="topic-cta">
        <Link href="/try?from=rhyme" className="btn btn--primary">
          가입 없이 다연과 가사 써 보기
        </Link>
        <Link href="/lyrics" className="btn btn--ghost">
          주제별 가사 만들기
        </Link>
      </div>

      <style jsx>{`
        .rhymer {
          display: grid;
          gap: 16px;
          margin: 28px 0 8px;
        }
        .rhymer__group {
          display: grid;
          gap: 8px;
        }
        .rhymer__label {
          margin: 0;
          font-weight: 600;
        }
        .rhymer__hint {
          margin: 0;
          font-weight: 400;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .rhymer__pattern {
          margin-left: 6px;
          color: #f472b6;
          letter-spacing: 0.04em;
        }
        .rhymer__chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .rhymer__chip,
        .rhymer__more {
          padding: 7px 14px;
          border-radius: 999px;
          border: 1px solid var(--card-border, var(--divider));
          background: rgba(255, 255, 255, 0.04);
          color: inherit;
          font: inherit;
          font-size: 0.92rem;
          cursor: pointer;
        }
        .rhymer__more {
          border-style: dashed;
          color: var(--text-secondary);
        }
        .rhymer__chip--on {
          border-color: #f472b6;
          background: rgba(244, 114, 182, 0.18);
          font-weight: 600;
        }
        .rhymer__input {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 16px;
          border-radius: 14px;
          border: 1px solid var(--card-border, var(--divider));
          background: rgba(255, 255, 255, 0.04);
          color: inherit;
          font: inherit;
          font-size: 1.05rem;
        }
        .rhymer__result {
          display: grid;
          gap: 14px;
          padding: 18px 20px;
          border-radius: 18px;
          border: 1px solid var(--card-border, var(--divider));
          background: rgba(255, 255, 255, 0.03);
        }
        .rhymer__picks {
          margin: 0;
          line-height: 1.6;
          word-break: keep-all;
        }
        .rhymer__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
      `}</style>
    </TopicLayout>
  );
}
