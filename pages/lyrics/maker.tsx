import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { TopicLayout } from '@/components/TopicLayout';
import { copyText } from '@/lib/clipboard';
import { saveLyricsDraft } from '@/lib/lyricsDraft';
import {
  MAX_NAME,
  MAX_PLACE,
  OCCASIONS,
  PARENTS,
  SEASONS,
  makeLyrics,
  makerPrompt,
  parseOccasion,
  type MakerInput,
  type Mood,
  type Vocal
} from '@/lib/lyricsTemplates';

// Free, no-signup lyrics maker: fills our own lyric templates with a name, a place and a season.
// Everything runs in the browser with no AI call, so it works even while the AI can't answer.

const MOODS: { id: Mood; label: string }[] = [
  { id: 'bright', label: '밝게' },
  { id: 'calm', label: '잔잔하게' }
];

const VOCALS: { id: Vocal; label: string }[] = [
  { id: 'female', label: '여성 보컬' },
  { id: 'male', label: '남성 보컬' }
];

const TOPIC_LINKS = [
  { href: '/lyrics/birthday-song', label: '생일 축하 노래 가사 만들기' },
  { href: '/lyrics/parents-song', label: '부모님께 드리는 노래 가사' },
  { href: '/lyrics/wedding-song', label: '결혼식 축가 가사 만들기' }
];

const faqs = [
  {
    q: 'AI가 쓰는 건가요?',
    a: '아니요. NovaSingerAI가 직접 쓴 가사 틀에 이름, 장소, 계절을 채워 넣는 방식이라 바로 나와요. 우리만의 이야기를 더 넣은 새 가사를 원하면 아래 버튼으로 다연에게 부탁해 보세요.'
  },
  {
    q: '만든 가사를 선물이나 행사에 써도 되나요?',
    a: '네, 생일이나 결혼식, 가족 행사에 편하게 쓰세요. 같은 틀을 고른 다른 사람과 가사가 비슷할 수 있으니 한두 줄은 직접 바꾸면 더 내 노래가 돼요.'
  },
  {
    q: '노래(음원)는 어떻게 만드나요?',
    a: '복사한 가사를 Suno 같은 AI 음악 도구의 가사 칸에, 스타일 문구를 스타일 칸에 붙여 넣으면 노래로 만들어져요.'
  },
  {
    q: '입력한 이름이 저장되나요?',
    a: '아니요. 가사는 브라우저 안에서만 만들어지고, 입력한 내용은 서버로 보내지 않아요.'
  }
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: '이름 넣어 노래 가사 만들기',
      url: 'https://novasingerai.com/lyrics/maker',
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

type Copied = 'idle' | 'lyrics' | 'style' | 'failed';

export default function LyricsMakerPage() {
  const [input, setInput] = useState<MakerInput>({
    occasion: 'birthday',
    name: '',
    partner: '',
    parent: 'mom',
    place: '',
    season: 'spring',
    mood: 'bright',
    vocal: 'female'
  });
  const [copied, setCopied] = useState<Copied>('idle');
  const result = useMemo(() => makeLyrics(input), [input]);

  // Topic pages link here with ?for=parents and the like. Read after mount: the page is static.
  useEffect(() => {
    const occasion = parseOccasion(new URLSearchParams(window.location.search).get('for'));
    if (occasion) {
      setInput(prev => ({ ...prev, occasion }));
    }
  }, []);

  const set = (change: Partial<MakerInput>) => {
    setInput(prev => ({ ...prev, ...change }));
    setCopied('idle');
  };
  const copy = async (what: 'lyrics' | 'style') => {
    const ok = await copyText(what === 'lyrics' ? `${result.title}\n\n${result.lyrics}` : result.style);
    setCopied(ok ? what : 'failed');
  };

  // Rendered outside the style's scope, so the chip classes are styled through :global below.
  const chips = <T extends string>(options: { id: T; label: string }[], value: T, onPick: (id: T) => void) => (
    <div className="maker__chips">
      {options.map(option => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          className={`maker__chip${value === option.id ? ' maker__chip--on' : ''}`}
          onClick={() => onPick(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  return (
    <TopicLayout
      title="이름 넣어 노래 가사 만들기 · 생일·부모님·축가 가사 바로 완성"
      description="이름과 추억의 장소, 계절만 고르면 생일 축하 노래, 부모님 감사 노래, 결혼 축가 가사를 바로 만들어 줘요. Suno 스타일 문구까지 함께. 가입 없이 무료."
      path="/lyrics/maker"
      card="maker"
      jsonLd={jsonLd}
    >
      <h1>이름 넣어 노래 가사 만들기</h1>
      <p className="topic-lead">
        누구를 위한 노래인지 고르고 이름과 추억의 장소, 계절을 넣으면 [Verse], [Chorus] 태그가 붙은 가사와 Suno 스타일
        문구가 바로 나와요. 가입 없이 무료이고, 입력한 내용은 서버로 보내지 않아요.
      </p>

      <div className="maker">
        <section className="maker__group" aria-label="노래 종류">
          <p className="maker__label">어떤 노래인가요?</p>
          {chips(OCCASIONS, input.occasion, occasion => set({ occasion }))}
        </section>

        {input.occasion === 'parents' ? (
          <section className="maker__group" aria-label="받는 분">
            <p className="maker__label">누구에게 드리나요?</p>
            {chips(PARENTS, input.parent, parent => set({ parent }))}
          </section>
        ) : (
          <div className="maker__names">
            <label className="maker__field">
              <span className="maker__label">{input.occasion === 'wedding' ? '신랑 이름' : '받는 사람 이름'}</span>
              <input
                className="maker__input"
                value={input.name}
                maxLength={MAX_NAME}
                placeholder={input.occasion === 'wedding' ? '예: 민준' : '예: 지민'}
                onChange={event => set({ name: event.target.value })}
              />
            </label>
            {input.occasion === 'wedding' ? (
              <label className="maker__field">
                <span className="maker__label">신부 이름</span>
                <input
                  className="maker__input"
                  value={input.partner}
                  maxLength={MAX_NAME}
                  placeholder="예: 서연"
                  onChange={event => set({ partner: event.target.value })}
                />
              </label>
            ) : null}
          </div>
        )}

        <label className="maker__field">
          <span className="maker__label">
            {input.occasion === 'wedding' ? '두 사람이 처음 만난 곳' : '함께한 추억의 장소'}{' '}
            <span className="maker__hint">(선택)</span>
          </span>
          <input
            className="maker__input"
            value={input.place}
            maxLength={MAX_PLACE}
            placeholder={input.occasion === 'wedding' ? '예: 대학교 도서관' : '예: 한강'}
            onChange={event => set({ place: event.target.value })}
          />
        </label>

        <section className="maker__group" aria-label="계절">
          <p className="maker__label">그때 계절은?</p>
          {chips(SEASONS, input.season, season => set({ season }))}
        </section>

        <section className="maker__group" aria-label="분위기와 보컬">
          <p className="maker__label">분위기와 보컬</p>
          {chips(MOODS, input.mood, mood => set({ mood }))}
          {chips(VOCALS, input.vocal, vocal => set({ vocal }))}
        </section>

        <section className="maker__result" aria-live="polite">
          <p className="maker__label">「{result.title}」</p>
          <pre className="maker__output" data-testid="maker-lyrics">
            {result.lyrics}
          </pre>
          <p className="maker__label">Suno 스타일</p>
          <p className="maker__style" data-testid="maker-style">
            {result.style}
          </p>
          <div className="maker__actions">
            <button type="button" className="btn btn--primary" onClick={() => copy('lyrics')}>
              {copied === 'lyrics' ? '가사를 복사했어요' : '가사 복사하기'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => copy('style')}>
              {copied === 'style' ? '스타일을 복사했어요' : '스타일 복사하기'}
            </button>
            <Link
              href="/lyrics/check"
              target="_blank"
              rel="noopener"
              className="btn btn--ghost"
              onClick={() => saveLyricsDraft(result.lyrics)}
            >
              가창성 검사하기
            </Link>
          </div>
          {copied === 'failed' ? <p className="maker__hint">복사하지 못했어요. 글자를 길게 눌러 직접 복사해 주세요.</p> : null}
        </section>

        <section className="maker__result">
          <p className="maker__label">우리만의 이야기로 새로 쓰고 싶다면</p>
          <p className="maker__hint">
            다연이 몇 가지를 물어보고 처음부터 새 가사를 써 줘요. 같이 먹은 음식, 자주 하던 말처럼 작은 장면이 들어갈수록
            더 특별해져요.
          </p>
          <div className="maker__actions">
            <Link href={`/try?from=maker&prompt=${encodeURIComponent(makerPrompt(input))}`} className="btn btn--primary">
              다연에게 새 가사 받기
            </Link>
          </div>
        </section>
      </div>

      <h2>이렇게 쓰면 더 좋아요</h2>
      <ul>
        <li>받침이 있는 이름은 「지민아」, 없는 이름은 「수아야」처럼 부르는 말이 알아서 붙어요.</li>
        <li>장소는 「한강」, 「학교 앞 분식집」처럼 짧은 이름이 노래로 부르기 쉬워요.</li>
        <li>
          가사를 조금 바꿨다면 <Link href="/lyrics/check">가창성 검사기</Link>로 줄마다 음절 수를 확인해 보세요.
        </li>
        <li>
          구간을 더 넣고 싶다면 <Link href="/lyrics/structure">노래 구조 짜기</Link>에 붙여 넣어 순서를 바꿔 보세요.
        </li>
      </ul>

      <h2>상황별 가이드</h2>
      <ul className="topic-links">
        {TOPIC_LINKS.map(link => (
          <li key={link.href}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
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
        <Link href="/try?from=maker" className="btn btn--primary">
          가입 없이 다연과 가사 써 보기
        </Link>
        <Link href="/lyrics" className="btn btn--ghost">
          주제별 가사 만들기
        </Link>
      </div>

      <style jsx>{`
        .maker {
          display: grid;
          gap: 18px;
          margin: 28px 0 8px;
        }
        .maker__group,
        .maker__field {
          display: grid;
          gap: 8px;
        }
        .maker__names {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
          gap: 12px;
        }
        .maker__label {
          margin: 0;
          font-weight: 600;
        }
        .maker__hint {
          margin: 0;
          font-weight: 400;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .maker :global(.maker__chips) {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .maker :global(.maker__chip) {
          padding: 7px 14px;
          border-radius: 999px;
          border: 1px solid var(--card-border, var(--divider));
          background: rgba(255, 255, 255, 0.04);
          color: inherit;
          font: inherit;
          font-size: 0.92rem;
          cursor: pointer;
        }
        .maker :global(.maker__chip--on) {
          border-color: #f472b6;
          background: rgba(244, 114, 182, 0.18);
          font-weight: 600;
        }
        .maker__input {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 16px;
          border-radius: 14px;
          border: 1px solid var(--card-border, var(--divider));
          background: rgba(255, 255, 255, 0.04);
          color: inherit;
          font: inherit;
        }
        .maker__result {
          display: grid;
          gap: 10px;
          padding: 18px 20px;
          border-radius: 18px;
          border: 1px solid var(--card-border, var(--divider));
          background: rgba(255, 255, 255, 0.03);
        }
        .maker__output {
          margin: 0;
          font-family: inherit;
          line-height: 1.7;
          white-space: pre-wrap;
          word-break: keep-all;
        }
        .maker__style {
          margin: 0;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 0.9rem;
          word-break: break-word;
        }
        .maker__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
      `}</style>
    </TopicLayout>
  );
}
