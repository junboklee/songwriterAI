import type { SingabilityIssue } from '@/lib/singability';
import { planFixes, runFixes } from '@/lib/singabilityFix';

const issue = (line: number | null, kind: SingabilityIssue['kind'] = 'digits'): SingabilityIssue => ({
  kind,
  line,
  severity: 'warn'
});

describe('planFixes', () => {
  it('groups issues by line, bottom line first, and ignores whole-song issues', () => {
    const { targets, skipped } = planFixes([issue(1), issue(1, 'symbols'), issue(4), issue(null, 'noSections')]);
    expect(targets.map(target => target.line)).toEqual([4, 1]);
    expect(targets[1].issues.map((item: SingabilityIssue) => item.kind)).toEqual(['digits', 'symbols']);
    expect(skipped).toBe(0);
  });

  it('keeps the first lines up to the limit', () => {
    const { targets, skipped } = planFixes([issue(0), issue(2), issue(5)], 2);
    expect(targets.map(target => target.line)).toEqual([2, 0]);
    expect(skipped).toBe(1);
  });
});

describe('runFixes', () => {
  const lyrics = ['[Verse]', '라인 1', '라인 2', '라인 3'].join('\n');

  it('rewrites lines from the bottom up so a split line does not shift the others', async () => {
    const rewrite = jest.fn(async (_context: string, selection: string) =>
      selection === '라인 3' ? '셋째 줄\n넷째 줄' : '첫째 줄'
    );
    const progress: number[] = [];
    const result = await runFixes({
      lyrics,
      targets: planFixes([issue(1), issue(3)]).targets,
      requestFor: () => '고쳐줘',
      rewrite,
      onProgress: done => progress.push(done)
    });

    expect(result.lyrics).toBe(['[Verse]', '첫째 줄', '라인 2', '셋째 줄', '넷째 줄'].join('\n'));
    expect(result.aiLines).toEqual(['셋째 줄', '넷째 줄', '첫째 줄']);
    expect(result).toMatchObject({ fixed: 2, failed: 0, error: null });
    expect(progress).toEqual([1, 2]);
    // The second request sees the first fix in its context.
    expect(rewrite.mock.calls[1][0]).toContain('넷째 줄');
  });

  it('counts unchanged replies as not fixed', async () => {
    const result = await runFixes({
      lyrics,
      targets: planFixes([issue(2)]).targets,
      requestFor: () => '고쳐줘',
      rewrite: async () => '라인 2'
    });
    expect(result).toMatchObject({ lyrics, fixed: 0, failed: 1 });
  });

  it('stops at the first failed request and keeps what was already fixed', async () => {
    const rewrite = jest
      .fn()
      .mockResolvedValueOnce('고친 셋째 줄')
      .mockRejectedValueOnce(new Error('이번 달 사용량을 모두 썼어요.'));
    const result = await runFixes({
      lyrics,
      targets: planFixes([issue(1), issue(2), issue(3)]).targets,
      requestFor: () => '고쳐줘',
      rewrite
    });
    expect(rewrite).toHaveBeenCalledTimes(2);
    expect(result.lyrics).toBe(['[Verse]', '라인 1', '라인 2', '고친 셋째 줄'].join('\n'));
    expect(result).toMatchObject({ fixed: 1, failed: 2, error: '이번 달 사용량을 모두 썼어요.' });
  });
});
