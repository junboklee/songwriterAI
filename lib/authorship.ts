// "창작 기록": which lines of the latest lyrics the AI wrote and which a person wrote, traced
// through the saved versions, plus a plain-text export shaped after KOMCA's AI declaration items
// (AI 사용 영역·도구·방식·본인 창작 내용). It describes the record only; it promises nothing about
// copyright registration or protection.

import { diffLines } from '@/lib/lyricsTools';
import type { SongVersion } from '@/types/suno';

export type LineOrigin = 'ai' | 'aiRewrite' | 'human' | 'unknown';

export type AuthorshipLine = { text: string; origin: LineOrigin };

export type AuthorshipStep = {
  createdAt: string | null;
  label: string;
  added: number;
  removed: number;
};

export type Authorship = {
  lines: AuthorshipLine[];
  counts: Record<LineOrigin, number>;
  steps: AuthorshipStep[];
};

const SECTION_TAG = /^\[[^\]]*\]$/;

const lyricLines = (lyrics: string) =>
  lyrics
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !SECTION_TAG.test(line));

const STEP_LABELS: Record<SongVersion['source'], string> = {
  initial: '처음 저장',
  'auto-from-chat': 'AI 초안 (대화)',
  manual: '직접 수정',
  restore: '이전 버전으로 복원'
};

function originOf(version: SongVersion, line: string, initialFromAi: boolean): LineOrigin {
  switch (version.source) {
    case 'auto-from-chat':
      return 'ai';
    case 'initial':
      return initialFromAi ? 'ai' : 'human';
    case 'manual':
      return version.aiLines?.includes(line) ? 'aiRewrite' : 'human';
    default:
      // A restore brings back lines from a version that may have been pruned.
      return 'unknown';
  }
}

// `versions` in any order; `initialFromAi` says whether the song's first content came from a chat.
export function buildAuthorship(versions: SongVersion[], initialFromAi: boolean): Authorship {
  const ordered = [...versions].sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
  const firstSeen = new Map<string, LineOrigin>();
  const steps: AuthorshipStep[] = [];

  ordered.forEach((version, index) => {
    lyricLines(version.lyrics).forEach(line => {
      if (!firstSeen.has(line)) {
        firstSeen.set(line, originOf(version, line, initialFromAi));
      }
    });
    const diff = index === 0 ? null : diffLines(ordered[index - 1].lyrics, version.lyrics);
    const changed = (type: 'added' | 'removed') =>
      diff ? diff.filter(item => item.type === type && item.text.trim()).length : lyricLines(version.lyrics).length;
    const aiRewrite = version.source === 'manual' && (version.aiLines?.length ?? 0) > 0;
    steps.push({
      createdAt: version.createdAt,
      label: aiRewrite ? '직접 수정 + AI 다시 쓰기' : STEP_LABELS[version.source],
      added: changed('added'),
      removed: index === 0 ? 0 : changed('removed')
    });
  });

  const latest = ordered[ordered.length - 1];
  const lines = latest ? lyricLines(latest.lyrics).map(text => ({ text, origin: firstSeen.get(text) ?? 'unknown' })) : [];
  const counts: Record<LineOrigin, number> = { ai: 0, aiRewrite: 0, human: 0, unknown: 0 };
  lines.forEach(line => {
    counts[line.origin] += 1;
  });

  return { lines, counts, steps };
}

export const ORIGIN_LABELS: Record<LineOrigin, string> = {
  ai: 'AI',
  aiRewrite: 'AI 다시 쓰기',
  human: '사람',
  unknown: '확인 불가'
};

const formatDate = (iso: string | null) => (iso ? iso.replace('T', ' ').slice(0, 16) : '날짜 없음');

export function authorshipReport(title: string | null, authorship: Authorship, generatedAt = new Date()) {
  const { counts, lines, steps } = authorship;
  const usedRewrite = counts.aiRewrite > 0;
  return [
    `창작 과정 기록 — ${title?.trim() || '제목 없는 노래'}`,
    `기록 생성: ${formatDate(generatedAt.toISOString())} (UTC) · NovaSingerAI에 저장된 버전을 바탕으로 자동 작성`,
    '',
    '[요약]',
    `최종 가사 ${lines.length}줄 중 사람이 쓴 줄 ${counts.human}줄, AI가 쓴 줄 ${counts.ai}줄, AI 다시 쓰기로 바꾼 줄 ${counts.aiRewrite}줄${
      counts.unknown ? `, 확인할 수 없는 줄 ${counts.unknown}줄` : ''
    }`,
    '',
    '[AI 사용 내역]',
    '- 사용 도구: NovaSingerAI (OpenAI의 생성형 AI 모델 사용)',
    `- 사용 방식: ${[counts.ai ? '대화로 가사 초안 생성' : null, usedRewrite ? '선택한 줄을 AI로 다시 쓰기' : null].filter(Boolean).join(', ') || '사용 기록 없음'}`,
    '- AI 사용 영역: 아래 [최종 가사]에서 [AI], [AI 다시 쓰기]로 표시한 줄',
    '- 본인 창작 내용: 아래 [최종 가사]에서 [사람]으로 표시한 줄',
    '',
    '[버전 기록]',
    ...steps.map(step => `- ${formatDate(step.createdAt)} · ${step.label} · +${step.added}줄 / -${step.removed}줄`),
    '',
    '[최종 가사]',
    ...lines.map(line => `[${ORIGIN_LABELS[line.origin]}] ${line.text}`),
    '',
    '참고: 이 기록은 서비스에 저장된 버전만으로 만든 것이며, 서비스 밖에서 고친 내용은 반영되지 않습니다.',
    '저작권 등록이나 보호 여부를 보장하지 않으며, 신고·등록 시에는 해당 기관의 기준을 직접 확인하세요.'
  ].join('\n');
}
