import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { TopicLayout } from '@/components/TopicLayout';
import { copyText } from '@/lib/clipboard';
import { countSyllables } from '@/lib/lyricsTools';
import { saveLyricsDraft } from '@/lib/lyricsDraft';
import { getLyricsTopic } from '@/lib/lyricsTopics';
import {
  applyPreset,
  buildStructuredLyrics,
  canRepeat,
  createSection,
  hasWrittenText,
  loadStructureDraft,
  MAX_LINES,
  MAX_SECTION_TEXT,
  MAX_SECTIONS,
  moveSection,
  removeSection,
  saveStructureDraft,
  SECTION_INFO,
  SECTION_KINDS,
  sectionLabels,
  STRUCTURE_PRESETS,
  structureSummary,
  type StructureSection
} from '@/lib/songStructure';

// Free, no-signup builder for song structure: pick a layout, write lines under each section and copy
// the tagged lyrics into Suno's lyrics field. Everything runs in the browser; nothing is sent anywhere.

const MAX_STORY = 200;

const faqs = [
  {
    q: '[Verse], [Chorus] 같은 태그는 왜 넣나요?',
    a: 'Suno 같은 AI 음악 도구는 대괄호 태그를 보고 어디가 절이고 어디가 후렴인지 나눠요. 태그가 있으면 후렴에서 멜로디가 반복되고 노래가 또렷하게 짜여요.'
  },
  {
    q: '후렴은 매번 다시 써야 하나요?',
    a: '같은 후렴을 반복하는 게 보통이에요. 두 번째 후렴부터 "앞 후렴과 같은 가사"를 켜 두면 처음 쓴 후렴이 그대로 다시 들어가요. 마지막 후렴만 한 줄 바꾸고 싶다면 꺼서 따로 쓰면 돼요.'
  },
  {
    q: '노래 길이는 구조로 정해지나요?',
    a: '대략 정해져요. 벌스와 후렴 한 번씩이면 1분 안팎, 벌스·후렴을 두 번 돌고 브릿지를 넣으면 3분 안팎이에요. 정확한 길이는 빠르기와 도구에 따라 달라져요.'
  },
  {
    q: '입력한 가사가 저장되나요?',
    a: '서버로는 보내지 않아요. 새로고침해도 이어 쓸 수 있게 지금 쓰는 브라우저에만 임시로 남겨 두고, "가사 지우기"를 누르면 함께 지워져요. 여럿이 함께 쓰는 컴퓨터라면 다 쓴 뒤 지워 주세요.'
  }
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: '노래 구조 짜기 · Suno 가사 태그 만들기',
      url: 'https://novasingerai.com/lyrics/structure',
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

const lyricsHref = (summary: string, story: string) => {
  const about = story.trim().slice(0, MAX_STORY);
  const prompt = `이 구조로 노래 가사를 써 줘.\n구조: ${summary}${about ? `\n노래 이야기: ${about}` : ''}`;
  return `/try?from=structure&prompt=${encodeURIComponent(prompt)}`;
};

// 후렴과 / 프리코러스와: the particle depends on whether the last syllable has a final consonant.
const withParticle = (word: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return `${word}${code >= 0 && code < 11172 && code % 28 ? '과' : '와'}`;
};

const lineCounts = (text: string) =>
  text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(countSyllables);

export default function SongStructurePage() {
  const [sections, setSections] = useState<StructureSection[]>(() => applyPreset(STRUCTURE_PRESETS[0]));
  const [story, setStory] = useState('');
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');
  const [restored, setRestored] = useState(false);
  const draftChecked = useRef(false);
  const labels = useMemo(() => sectionLabels(sections), [sections]);
  const output = useMemo(() => buildStructuredLyrics(sections), [sections]);
  const summary = useMemo(() => structureSummary(sections), [sections]);
  const written = hasWrittenText(sections);

  // Read after mount, since the server has no storage. The first save is skipped so the empty
  // starting layout can't overwrite the draft before it comes back.
  useEffect(() => {
    const draft = loadStructureDraft();
    if (draft) {
      setSections(draft);
      setRestored(true);
    }
  }, []);
  useEffect(() => {
    if (draftChecked.current) {
      saveStructureDraft(sections);
    }
    draftChecked.current = true;
  }, [sections]);

  const update = (next: StructureSection[]) => {
    setSections(next);
    setCopied('idle');
  };
  const patch = (index: number, change: Partial<StructureSection>) =>
    update(sections.map((item, i) => (i === index ? { ...item, ...change } : item)));
  const handleCopy = async () => {
    setCopied((await copyText(output)) ? 'done' : 'failed');
  };

  return (
    <TopicLayout
      title="노래 구조 짜기 · Suno 가사 태그 만들기"
      description="인트로, 벌스, 후렴, 브릿지 순서를 고르고 구간마다 가사를 쓰면 [Verse 1], [Chorus] 태그가 붙은 가사로 정리해 줘요. 발라드·축가·트로트·랩 구조 예시도 있어요. 가입 없이 무료."
      path="/lyrics/structure"
      card="structure"
      jsonLd={jsonLd}
    >
      <h1>노래 구조 짜기 · Suno 가사 태그 만들기</h1>
      <p className="topic-lead">
        노래의 순서를 고르고 구간마다 가사를 쓰면, Suno 같은 AI 음악 도구의 가사 칸에 바로 넣을 수 있게 [Verse 1],
        [Chorus] 태그를 붙여 정리해 줘요. 가입 없이 무료이고, 가사는 서버로 보내지 않아요.
      </p>

      <div className="structurer">
        <section className="structurer__group" aria-label="구조 예시">
          <p className="structurer__label">구조 예시로 시작하기</p>
          <div className="structurer__chips">
            {STRUCTURE_PRESETS.map(preset => (
              <button
                key={preset.name}
                type="button"
                className="structurer__chip"
                onClick={() => update(applyPreset(preset, sections))}
              >
                {preset.name}
              </button>
            ))}
          </div>
          <p className="structurer__hint">예시를 바꿔도 이미 쓴 가사는 같은 구간으로 옮겨져요.</p>
          {restored && written ? <p className="structurer__hint">이 브라우저에 남아 있던 가사를 불러왔어요.</p> : null}
        </section>

        <ol className="structurer__list">
          {sections.map((section, index) => {
            const info = SECTION_INFO[section.kind];
            const label = labels[index];
            const repeatable = canRepeat(sections, index);
            const counts = section.repeat || info.noLyrics ? [] : lineCounts(section.text);
            return (
              <li key={section.id} className="structurer__section" aria-label={`${label} 구간`}>
                <div className="structurer__head">
                  <p className="structurer__tag">
                    [{label}] <span className="structurer__name">{info.name}</span>
                  </p>
                  <div className="structurer__tools">
                    <button
                      type="button"
                      aria-label={`${label} 위로`}
                      disabled={index === 0}
                      onClick={() => update(moveSection(sections, index, -1))}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`${label} 아래로`}
                      disabled={index === sections.length - 1}
                      onClick={() => update(moveSection(sections, index, 1))}
                    >
                      ↓
                    </button>
                    <button type="button" aria-label={`${label} 삭제`} onClick={() => update(removeSection(sections, index))}>
                      ✕
                    </button>
                  </div>
                </div>
                <p className="structurer__hint">{info.hint}</p>

                {repeatable ? (
                  <label className="structurer__check">
                    <input
                      type="checkbox"
                      checked={section.repeat}
                      onChange={event => patch(index, { repeat: event.target.checked })}
                    />
                    앞 {withParticle(info.name)} 같은 가사
                  </label>
                ) : null}

                {!info.noLyrics && !section.repeat ? (
                  <>
                    <div className="structurer__lines">
                      <span>줄 수</span>
                      <button
                        type="button"
                        aria-label={`${label} 줄 수 줄이기`}
                        disabled={section.lines <= 0}
                        onClick={() => patch(index, { lines: section.lines - 1 })}
                      >
                        −
                      </button>
                      <strong>{section.lines}</strong>
                      <button
                        type="button"
                        aria-label={`${label} 줄 수 늘리기`}
                        disabled={section.lines >= MAX_LINES}
                        onClick={() => patch(index, { lines: section.lines + 1 })}
                      >
                        +
                      </button>
                    </div>
                    <textarea
                      className="structurer__input"
                      aria-label={`${label} 가사`}
                      rows={Math.min(Math.max(section.lines, 2), 8)}
                      maxLength={MAX_SECTION_TEXT}
                      value={section.text}
                      placeholder={section.lines ? `${section.lines}줄 정도 · 비워 두면 태그만 들어가요` : '비워 두면 연주만 나와요'}
                      onChange={event => patch(index, { text: event.target.value })}
                    />
                    {counts.length ? <p className="structurer__hint">줄마다 음절 수: {counts.join(' · ')}</p> : null}
                  </>
                ) : null}
              </li>
            );
          })}
        </ol>

        <section className="structurer__group" aria-label="구간 추가">
          <p className="structurer__label">
            구간 추가
            <span className="structurer__hint">
              {' '}
              · {sections.length}/{MAX_SECTIONS}
            </span>
          </p>
          <div className="structurer__chips">
            {SECTION_KINDS.map(kind => (
              <button
                key={kind}
                type="button"
                className="structurer__chip"
                disabled={sections.length >= MAX_SECTIONS}
                onClick={() => update([...sections, createSection(kind, sections)])}
              >
                + {SECTION_INFO[kind].name}
              </button>
            ))}
          </div>
        </section>

        <section className="structurer__result" aria-live="polite">
          <p className="structurer__label">완성된 가사</p>
          <p className="structurer__hint">{summary || '구간을 추가해 보세요.'}</p>
          {sections.length ? (
            <pre className="structurer__output" data-testid="structure-output">
              {output}
            </pre>
          ) : null}
          <div className="structurer__actions">
            <button type="button" className="btn btn--primary" disabled={!sections.length} onClick={handleCopy}>
              {copied === 'done' ? '복사했어요' : '복사하기'}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={!written}
              onClick={() => update(sections.map(item => ({ ...item, text: '' })))}
            >
              가사 지우기
            </button>
            {written ? (
              <Link href="/lyrics/check" target="_blank" rel="noopener" className="btn btn--ghost" onClick={() => saveLyricsDraft(output)}>
                가창성 검사하기
              </Link>
            ) : null}
          </div>
          {copied === 'failed' ? <p className="structurer__hint">복사하지 못했어요. 글자를 길게 눌러 직접 복사해 주세요.</p> : null}
        </section>

        {sections.length ? (
          <section className="structurer__result">
            <label htmlFor="structurer-story" className="structurer__label">
              이 구조로 가사를 받아 볼까요?
            </label>
            <input
              id="structurer-story"
              className="structurer__input"
              value={story}
              maxLength={MAX_STORY}
              placeholder="예: 친구 결혼식에서 부를 축가"
              onChange={event => setStory(event.target.value)}
            />
            <div className="structurer__actions">
              <Link href={lyricsHref(summary, story)} className="btn btn--primary">
                다연에게 가사 받기
              </Link>
            </div>
          </section>
        ) : null}
      </div>

      <h2>구간별로 이렇게 써 보세요</h2>
      <ul>
        <li>
          <strong>벌스</strong>: 언제, 어디서, 누구와 있었는지 장면부터 보여 주세요. 두 번째 벌스는 시간이 흐른 뒤나
          다른 장면으로 이어 가면 좋아요.
        </li>
        <li>
          <strong>프리코러스</strong>: 짧게 두 줄 정도로 감정을 끌어올려 후렴으로 넘겨 주세요.
        </li>
        <li>
          <strong>후렴</strong>: 노래 제목이 되는 한 줄을 넣고, 같은 줄을 한 번 더 반복해도 좋아요. 자세한 방법은{' '}
          <Link href="/lyrics/chorus-writing">후렴 쓰는 법</Link>에 있어요.
        </li>
        <li>
          <strong>브릿지</strong>: 지금까지와 다른 시점이나 고백을 넣어 마지막 후렴을 더 크게 들리게 해요.
        </li>
        <li>
          같은 구간끼리는 줄마다 음절 수를 비슷하게 맞춰야 멜로디가 반복돼요. 다 쓰면{' '}
          <Link href="/lyrics/check">가창성 검사기</Link>로 확인하고, 스타일은{' '}
          <Link href="/lyrics/style">Suno 스타일 프롬프트 만들기</Link>에서 골라 보세요.
        </li>
      </ul>

      <h2>상황별 가이드</h2>
      <ul className="topic-links">
        {STRUCTURE_PRESETS.map(preset => (
          <li key={preset.topic}>
            <Link href={`/lyrics/${preset.topic}`}>{getLyricsTopic(preset.topic)?.title ?? preset.name}</Link>
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
        <Link href="/try?from=structure" className="btn btn--primary">
          가입 없이 다연과 가사 써 보기
        </Link>
        <Link href="/lyrics" className="btn btn--ghost">
          주제별 가사 만들기
        </Link>
      </div>

      <style jsx>{`
        .structurer {
          display: grid;
          gap: 16px;
          margin: 28px 0 8px;
        }
        .structurer__group {
          display: grid;
          gap: 8px;
        }
        .structurer__label {
          margin: 0;
          font-weight: 600;
        }
        .structurer__hint {
          margin: 0;
          font-weight: 400;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .structurer__chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .structurer__chip {
          padding: 7px 14px;
          border-radius: 999px;
          border: 1px solid var(--card-border, var(--divider));
          background: rgba(255, 255, 255, 0.04);
          color: inherit;
          font: inherit;
          font-size: 0.92rem;
          cursor: pointer;
        }
        .structurer__chip:disabled {
          opacity: 0.5;
          cursor: default;
        }
        .structurer__list {
          display: grid;
          gap: 12px;
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .structurer__section {
          display: grid;
          gap: 8px;
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid var(--card-border, var(--divider));
          background: rgba(255, 255, 255, 0.03);
        }
        .structurer__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .structurer__tag {
          margin: 0;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-weight: 600;
        }
        .structurer__name {
          font-family: inherit;
          font-weight: 400;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .structurer__tools {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }
        .structurer__tools button,
        .structurer__lines button {
          min-width: 32px;
          height: 32px;
          border-radius: 10px;
          border: 1px solid var(--card-border, var(--divider));
          background: rgba(255, 255, 255, 0.04);
          color: inherit;
          font: inherit;
          cursor: pointer;
        }
        .structurer__tools button:disabled,
        .structurer__lines button:disabled {
          opacity: 0.35;
          cursor: default;
        }
        .structurer__check {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.95rem;
        }
        .structurer__lines {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.92rem;
        }
        .structurer__input {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 16px;
          border-radius: 14px;
          border: 1px solid var(--card-border, var(--divider));
          background: rgba(255, 255, 255, 0.04);
          color: inherit;
          font: inherit;
          line-height: 1.6;
          resize: vertical;
        }
        .structurer__result {
          display: grid;
          gap: 10px;
          padding: 18px 20px;
          border-radius: 18px;
          border: 1px solid var(--card-border, var(--divider));
          background: rgba(255, 255, 255, 0.03);
        }
        .structurer__output {
          margin: 0;
          max-height: 420px;
          overflow: auto;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .structurer__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
      `}</style>
    </TopicLayout>
  );
}
