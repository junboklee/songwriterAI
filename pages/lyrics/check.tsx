import Link from 'next/link';
import { useMemo, useState } from 'react';

import { TopicLayout } from '@/components/TopicLayout';
import { useTranslation } from '@/context/I18nContext';
import { analyzeLyrics } from '@/lib/lyricsTools';
import { checkSingability, type SingabilityIssue } from '@/lib/singability';

// Free, no-signup checker: the editor's syllable counts, end-rhyme dots and singability check run
// in the browser (no AI call). Each flagged line links to the trial chat with a fix request.

const RHYME_COLORS = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#f87171'];
const MAX_LYRICS = 5000;
// /try keeps the first 500 characters of a prompt.
const MAX_LINE_IN_PROMPT = 200;

// Written for this page with deliberate problems, so the first run shows what the check finds.
const EXAMPLE = `[Verse]
월요일 아침 7시 알람 소리에
눈을 떠
지각할까 봐 급하게 뛰어가다 횡단보도 앞에서 넘어졌지

[Chorus]
Happy day 오늘도 힘내 보자 😊
우리 같이 웃어 보자
내일은 더 좋은 날`;

const faqs = [
  {
    q: '음절 수는 어떻게 세나요?',
    a: '한글은 한 글자를 한 음절로 셉니다. 영어 단어는 모음 묶음으로 어림해서 셉니다. [Verse], [Chorus] 같은 구간 표시와 빈 줄은 세지 않아요.'
  },
  {
    q: '왜 줄마다 음절 수를 맞춰야 하나요?',
    a: '같은 멜로디가 반복되는 구간에서 줄 길이가 크게 다르면 노래가 급하게 몰리거나 늘어집니다. 같은 구간의 다른 줄보다 많이 길거나 짧은 줄을 알려 드려요.'
  },
  {
    q: 'Suno에 넣을 가사를 검사할 때 좋은가요?',
    a: '네. 숫자, 영어 섞임, 이모지, 끊기는 받침이 몰린 줄처럼 AI 음악 도구가 한국어를 또렷하게 부르기 어려운 곳을 미리 찾아 줘요.'
  },
  {
    q: '입력한 가사가 저장되나요?',
    a: '아니요. 검사는 브라우저 안에서만 이루어지고, 가사는 서버로 보내지지 않아요.'
  }
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: '가사 음절 수 세기 · 가창성 검사기',
      url: 'https://novasingerai.com/lyrics/check',
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

const fixHref = (line: string, request: string) => {
  const prompt = `가사 한 줄을 부르기 쉽게 고쳐 줘.\n"${line.trim().slice(0, MAX_LINE_IN_PROMPT)}"\n${request}`;
  return `/try?from=checker&prompt=${encodeURIComponent(prompt)}`;
};

export default function LyricsCheckPage() {
  const { t } = useTranslation('songEditor');
  const [lyrics, setLyrics] = useState('');
  const analysis = useMemo(() => analyzeLyrics(lyrics), [lyrics]);
  const issues = useMemo(() => checkSingability(lyrics), [lyrics]);

  const issuesByLine = useMemo(() => {
    const map = new Map<number, SingabilityIssue[]>();
    issues.forEach(issue => {
      if (issue.line !== null) {
        map.set(issue.line, [...(map.get(issue.line) ?? []), issue]);
      }
    });
    return map;
  }, [issues]);
  const wholeIssues = issues.filter(issue => issue.line === null);
  const lyricLines = analysis.filter(line => !line.isSection && !line.isBlank);
  const message = (issue: SingabilityIssue) =>
    t(`singability.${issue.kind}`, { replacements: { syllables: issue.syllables ?? 0, target: issue.target ?? 0 } });
  const request = (issue: SingabilityIssue) =>
    t(`singabilityRequest.${issue.kind}`, { replacements: { syllables: issue.syllables ?? 0, target: issue.target ?? 0 } });

  return (
    <TopicLayout
      title="가사 음절 수 세기 · 가창성 검사기"
      description="가사를 붙여 넣으면 줄마다 음절 수를 세고, 각운과 부르기 어려운 줄(숫자, 영어 섞임, 끊기는 받침, 너무 긴 줄)을 찾아 줘요. 가입 없이 무료로 써 보세요."
      path="/lyrics/check"
      card="check"
      jsonLd={jsonLd}
    >
      <h1>가사 음절 수 세기 · 가창성 검사기</h1>
      <p className="topic-lead">
        가사를 붙여 넣으면 줄마다 음절 수를 세고, 같은 모음으로 끝나는 줄(각운)을 색으로 묶어 보여 줘요. Suno 같은
        AI 음악 도구가 한국어를 또렷하게 부르기 어려운 곳도 함께 찾아요. 가입 없이 무료이고, 가사는 저장되지 않아요.
      </p>

      <div className="checker">
        <label htmlFor="checker-input" className="checker__label">
          검사할 가사
        </label>
        <textarea
          id="checker-input"
          className="checker__input"
          value={lyrics}
          maxLength={MAX_LYRICS}
          rows={12}
          placeholder={'[Verse]\n여기에 가사를 붙여 넣으세요\n\n[Chorus]\n구간 표시는 있어도 없어도 돼요'}
          onChange={event => setLyrics(event.target.value)}
        />
        <div className="checker__actions">
          <button type="button" className="btn btn--ghost" onClick={() => setLyrics(EXAMPLE)}>
            예시 가사 넣기
          </button>
          {lyrics ? (
            <button type="button" className="btn btn--ghost" onClick={() => setLyrics('')}>
              지우기
            </button>
          ) : null}
        </div>

        {lyricLines.length ? (
          <section className="checker__result" aria-live="polite">
            <p className="checker__summary">
              {lyricLines.length}줄 · 확인할 곳 {issues.length}개
              {issues.length === 0 ? ' · 부르기 어려운 곳을 찾지 못했어요.' : ''}
            </p>
            <p className="topic-lead">{t('analysisHint')}</p>
            {wholeIssues.map(issue => (
              <p key={issue.kind} className="checker__note">
                {message(issue)}
              </p>
            ))}
            <div className="checker__lines">
              {analysis.map((line, index) =>
                line.isBlank ? (
                  <div key={index} className="song-editor__line song-editor__line--blank" />
                ) : (
                  <div key={index}>
                    <div className={`song-editor__line${line.isSection ? ' song-editor__line--section' : ''}`}>
                      <span className="song-editor__count">{line.isSection ? '' : line.syllables}</span>
                      <span className="song-editor__text">{line.text}</span>
                      {line.rhymeGroup !== null ? (
                        <span
                          className="song-editor__rhyme"
                          style={{ background: RHYME_COLORS[line.rhymeGroup % RHYME_COLORS.length] }}
                        />
                      ) : (
                        <span />
                      )}
                    </div>
                    {(issuesByLine.get(index) ?? []).map(issue => (
                      <div key={issue.kind} className={`checker__issue checker__issue--${issue.severity}`}>
                        <span>{message(issue)}</span>
                        <Link href={fixHref(line.text, request(issue))}>다연에게 고쳐 달라고 하기</Link>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </section>
        ) : null}
      </div>

      <h2>무엇을 검사하나요?</h2>
      <ul>
        <li>줄마다 음절 수. 같은 구간에서 다른 줄보다 많이 길거나 짧은 줄을 알려 줘요.</li>
        <li>한 호흡에 부르기 긴 줄(스무 음절 넘게).</li>
        <li>숫자. 「7시」는 「칠 시」인지 「일곱 시」인지 AI가 헷갈려서 한글로 쓰는 게 좋아요.</li>
        <li>한 줄 안에 한국어와 영어가 섞인 곳, 이모지와 특수문자.</li>
        <li>ㄱ·ㄷ·ㅂ·ㅅ처럼 소리가 끊기는 받침이 연달아 있어 발음이 뭉개지기 쉬운 곳.</li>
        <li>같은 모음으로 끝나는 줄(각운). 같은 색 점이 붙은 줄끼리 소리가 이어져요.</li>
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
        <Link href="/try?from=checker" className="btn btn--primary">
          가입 없이 다연과 가사 써 보기
        </Link>
        <Link href="/lyrics/how-to-write-lyrics" className="btn btn--ghost">
          작사하는 법 보기
        </Link>
      </div>

      <style jsx>{`
        .checker {
          display: grid;
          gap: 12px;
          margin: 28px 0 8px;
        }
        .checker__label {
          font-weight: 600;
        }
        .checker__input {
          width: 100%;
          box-sizing: border-box;
          padding: 14px 16px;
          border-radius: 14px;
          border: 1px solid var(--card-border, var(--divider));
          background: rgba(255, 255, 255, 0.04);
          color: inherit;
          font: inherit;
          line-height: 1.7;
          resize: vertical;
        }
        .checker__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .checker__result {
          display: grid;
          gap: 8px;
          padding: 18px 20px;
          border-radius: 18px;
          border: 1px solid var(--card-border, var(--divider));
          background: rgba(255, 255, 255, 0.03);
        }
        .checker__summary {
          margin: 0;
          font-weight: 700;
        }
        .checker__note {
          margin: 0;
          color: var(--text-secondary);
        }
        .checker__lines {
          display: grid;
          gap: 6px;
        }
        .checker__issue {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 12px;
          margin: 2px 0 6px calc(2.2em + 8px);
          font-size: 0.88rem;
          line-height: 1.6;
        }
        .checker__issue--warn {
          color: #fbbf24;
        }
        .checker__issue--info {
          color: var(--text-secondary);
        }
      `}</style>
    </TopicLayout>
  );
}
