import { authorshipReport, buildAuthorship } from '@/lib/authorship';
import type { SongVersion } from '@/types/suno';

const version = (
  source: SongVersion['source'],
  createdAt: string,
  lyrics: string,
  aiLines: string[] = []
): SongVersion => ({ id: createdAt, title: '봄', lyrics, style: null, source, createdAt, aiLines });

// AI draft from a chat -> person edits line 2 and AI rewrites line 3.
const versions = [
  version('manual', '2026-10-19T03:00:00Z', '[Verse]\n봄바람이 불어와\n내가 고친 둘째 줄\nAI가 바꾼 셋째 줄', ['AI가 바꾼 셋째 줄']),
  version('auto-from-chat', '2026-10-19T01:00:00Z', '[Verse]\n봄바람이 불어와\n처음 둘째 줄\n처음 셋째 줄')
];

describe('buildAuthorship', () => {
  it('traces each final line to the version that first had it', () => {
    const result = buildAuthorship(versions, true);
    expect(result.lines).toEqual([
      { text: '봄바람이 불어와', origin: 'ai' },
      { text: '내가 고친 둘째 줄', origin: 'human' },
      { text: 'AI가 바꾼 셋째 줄', origin: 'aiRewrite' }
    ]);
    expect(result.counts).toEqual({ ai: 1, aiRewrite: 1, human: 1, unknown: 0 });
  });

  it('lists the versions oldest first with line changes', () => {
    expect(buildAuthorship(versions, true).steps).toEqual([
      { createdAt: '2026-10-19T01:00:00Z', label: 'AI 초안 (대화)', added: 3, removed: 0 },
      { createdAt: '2026-10-19T03:00:00Z', label: '직접 수정 + AI 다시 쓰기', added: 2, removed: 2 }
    ]);
  });

  it('treats the first saved content as human-written for songs that did not come from a chat', () => {
    const result = buildAuthorship([version('initial', '2026-10-19T01:00:00Z', '내가 쓴 가사')], false);
    expect(result.lines).toEqual([{ text: '내가 쓴 가사', origin: 'human' }]);
  });
});

describe('authorshipReport', () => {
  it('follows the declaration items and makes no copyright promise', () => {
    const report = authorshipReport('봄', buildAuthorship(versions, true), new Date('2026-10-19T04:00:00Z'));
    expect(report).toContain('최종 가사 3줄 중 사람이 쓴 줄 1줄, AI가 쓴 줄 1줄, AI 다시 쓰기로 바꾼 줄 1줄');
    expect(report).toContain('- 사용 방식: 대화로 가사 초안 생성, 선택한 줄을 AI로 다시 쓰기');
    expect(report).toContain('[사람] 내가 고친 둘째 줄');
    expect(report).toContain('[AI 다시 쓰기] AI가 바꾼 셋째 줄');
    expect(report).toContain('저작권 등록이나 보호 여부를 보장하지 않으며');
  });
});
