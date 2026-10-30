import Link from 'next/link';
import { useMemo, useState } from 'react';

import { TopicLayout } from '@/components/TopicLayout';
import { copyText } from '@/lib/clipboard';
import { buildStylePrompt, EMPTY_STYLE, STYLE_FIELDS, STYLE_PRESETS, toggleStyle, type StyleChoice } from '@/lib/sunoStyle';

// Free, no-signup builder for the "Style of Music" field of Suno and similar tools. Everything runs
// in the browser; the finished style can be handed to the trial chat to get matching lyrics.

const MAX_EXTRA = 120;
const MAX_STORY = 200;

const faqs = [
  {
    q: 'Suno 스타일 프롬프트는 어디에 넣나요?',
    a: 'Suno의 Custom 모드에서 가사(Lyrics) 칸 옆에 있는 스타일(Style of Music) 칸에 붙여 넣으면 돼요. 가사는 가사 칸에, 장르·분위기·빠르기 같은 소리 설명은 스타일 칸에 나눠 쓰는 게 좋아요.'
  },
  {
    q: '왜 스타일은 영어로 쓰나요?',
    a: 'AI 음악 도구는 영어 스타일 태그를 가장 잘 알아들어요. 가사가 한국어여도 스타일은 영어로 쓰는 게 결과가 안정적이에요. 이 도구는 고른 항목을 영어 태그로 바꿔 줘요.'
  },
  {
    q: '가수나 노래 이름을 넣어도 되나요?',
    a: '권하지 않아요. 실제 가수나 곡 이름은 도구가 막거나 무시하는 경우가 많고, 저작권 문제도 생길 수 있어요. 대신 장르, 분위기, 보컬, 악기로 원하는 소리를 설명해 보세요.'
  },
  {
    q: '태그는 몇 개가 좋나요?',
    a: '장르 하나, 분위기 한두 개, 빠르기, 보컬, 악기 두세 개 정도면 충분해요. 너무 많이 넣으면 서로 부딪혀서 오히려 흐릿한 노래가 나오기 쉬워요.'
  }
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'Suno 스타일 프롬프트 만들기',
      url: 'https://novasingerai.com/lyrics/style',
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

const lyricsHref = (style: string, story: string) => {
  const about = story.trim().slice(0, MAX_STORY);
  const prompt = `이 스타일에 어울리는 노래 가사를 써 줘.\n스타일: ${style}${about ? `\n노래 이야기: ${about}` : ''}`;
  return `/try?from=style&prompt=${encodeURIComponent(prompt)}`;
};

export default function SunoStylePage() {
  const [choice, setChoice] = useState<StyleChoice>(EMPTY_STYLE);
  const [extra, setExtra] = useState('');
  const [story, setStory] = useState('');
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');
  const style = useMemo(() => buildStylePrompt(choice, extra), [choice, extra]);

  const update = (next: StyleChoice) => {
    setChoice(next);
    setCopied('idle');
  };
  const handleCopy = async () => {
    setCopied((await copyText(style)) ? 'done' : 'failed');
  };

  return (
    <TopicLayout
      title="Suno 스타일 프롬프트 만들기"
      description="장르, 분위기, 빠르기, 보컬, 악기를 고르면 Suno 스타일 칸에 바로 붙여 넣을 영어 프롬프트를 만들어 줘요. 생일 노래·축가·트로트 예시도 있어요. 가입 없이 무료."
      path="/lyrics/style"
      card="style"
      jsonLd={jsonLd}
    >
      <h1>Suno 스타일 프롬프트 만들기</h1>
      <p className="topic-lead">
        원하는 소리를 고르면 Suno 같은 AI 음악 도구의 스타일(Style of Music) 칸에 넣을 영어 프롬프트를 만들어 줘요.
        한국어로 고르면 영어 태그로 바꿔 드려요. 가입 없이 무료예요.
      </p>

      <div className="styler">
        <section className="styler__group" aria-label="예시로 시작하기">
          <p className="styler__label">예시로 시작하기</p>
          <div className="styler__chips">
            {STYLE_PRESETS.map(preset => (
              <button key={preset.name} type="button" className="styler__chip" onClick={() => update(preset.choice)}>
                {preset.name}
              </button>
            ))}
          </div>
        </section>

        {STYLE_FIELDS.map(field => (
          <section key={field.id} className="styler__group" aria-label={field.name}>
            <p className="styler__label">
              {field.name}
              {field.max > 1 ? <span className="styler__hint"> · {field.max}개까지</span> : null}
            </p>
            <div className="styler__chips">
              {field.options.map(option => {
                const selected = choice[field.id].includes(option.tag);
                return (
                  <button
                    key={option.tag}
                    type="button"
                    aria-pressed={selected}
                    className={`styler__chip${selected ? ' styler__chip--on' : ''}`}
                    onClick={() => update(toggleStyle(choice, field.id, option.tag))}
                  >
                    {option.name}
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <label htmlFor="styler-extra" className="styler__label">
          더 넣을 태그 (영어, 쉼표로 구분)
        </label>
        <input
          id="styler-extra"
          className="styler__input"
          value={extra}
          maxLength={MAX_EXTRA}
          placeholder="예: rainy night, reverb, slow build"
          onChange={event => {
            setExtra(event.target.value);
            setCopied('idle');
          }}
        />

        <section className="styler__result" aria-live="polite">
          <p className="styler__label">
            완성된 스타일 프롬프트 <span className="styler__hint">· {style.length}자</span>
          </p>
          <p className="styler__output" data-testid="style-output">
            {style || '위에서 장르나 분위기를 골라 보세요.'}
          </p>
          <div className="styler__actions">
            <button type="button" className="btn btn--primary" disabled={!style} onClick={handleCopy}>
              {copied === 'done' ? '복사했어요' : '복사하기'}
            </button>
            <button type="button" className="btn btn--ghost" disabled={!style} onClick={() => {
              update(EMPTY_STYLE);
              setExtra('');
            }}>
              처음부터
            </button>
          </div>
          {copied === 'failed' ? <p className="styler__hint">복사하지 못했어요. 글자를 길게 눌러 직접 복사해 주세요.</p> : null}
        </section>

        {style ? (
          <section className="styler__result">
            <label htmlFor="styler-story" className="styler__label">
              이 스타일에 맞는 가사도 받아 볼까요?
            </label>
            <input
              id="styler-story"
              className="styler__input"
              value={story}
              maxLength={MAX_STORY}
              placeholder="예: 엄마 생신에 들려줄 노래"
              onChange={event => setStory(event.target.value)}
            />
            <div className="styler__actions">
              <Link href={lyricsHref(style, story)} className="btn btn--primary">
                다연에게 가사 받기
              </Link>
            </div>
          </section>
        ) : null}
      </div>

      <h2>잘 쓰는 팁</h2>
      <ul>
        <li>장르를 맨 앞에 두세요. 앞에 있는 태그일수록 결과에 크게 반영돼요.</li>
        <li>빠르기는 숫자(bpm)로 적으면 더 정확해요. 발라드는 65~80, 신나는 노래는 110~130 정도예요.</li>
        <li>슬픈 분위기와 신나는 분위기처럼 서로 반대되는 태그는 함께 넣지 마세요.</li>
        <li>가사에는 [Verse], [Chorus] 같은 구간 표시를 넣고, 스타일 칸에는 소리 설명만 넣으세요.</li>
        <li>
          가사를 다 썼다면 <Link href="/lyrics/check">가창성 검사기</Link>로 숫자, 영어 섞임처럼 AI가 부르기 어려운 곳을
          미리 고쳐 보세요.
        </li>
      </ul>

      <h2>상황별 가이드</h2>
      <ul className="topic-links">
        {STYLE_PRESETS.map(preset => (
          <li key={preset.topic}>
            <Link href={`/lyrics/${preset.topic}`}>{preset.name} 가사 만들기</Link>
          </li>
        ))}
        <li>
          <Link href="/lyrics/suno-korean-lyrics">Suno 한국어 가사</Link>
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
        <Link href="/try?from=style" className="btn btn--primary">
          가입 없이 다연과 가사 써 보기
        </Link>
        <Link href="/lyrics" className="btn btn--ghost">
          주제별 가사 만들기
        </Link>
      </div>

      <style jsx>{`
        .styler {
          display: grid;
          gap: 16px;
          margin: 28px 0 8px;
        }
        .styler__group {
          display: grid;
          gap: 8px;
        }
        .styler__label {
          margin: 0;
          font-weight: 600;
        }
        .styler__hint {
          margin: 0;
          font-weight: 400;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .styler__chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .styler__chip {
          padding: 7px 14px;
          border-radius: 999px;
          border: 1px solid var(--card-border, var(--divider));
          background: rgba(255, 255, 255, 0.04);
          color: inherit;
          font: inherit;
          font-size: 0.92rem;
          cursor: pointer;
        }
        .styler__chip--on {
          border-color: #f472b6;
          background: rgba(244, 114, 182, 0.18);
          font-weight: 600;
        }
        .styler__input {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 16px;
          border-radius: 14px;
          border: 1px solid var(--card-border, var(--divider));
          background: rgba(255, 255, 255, 0.04);
          color: inherit;
          font: inherit;
        }
        .styler__result {
          display: grid;
          gap: 10px;
          padding: 18px 20px;
          border-radius: 18px;
          border: 1px solid var(--card-border, var(--divider));
          background: rgba(255, 255, 255, 0.03);
        }
        .styler__output {
          margin: 0;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          line-height: 1.6;
          word-break: break-word;
        }
        .styler__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
      `}</style>
    </TopicLayout>
  );
}
