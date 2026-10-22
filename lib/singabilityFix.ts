// "Fix all" for the singability check: rewrites every flagged line with the existing line rewrite,
// one request per line, and returns the result for the user to review before it is applied.

import type { SingabilityIssue } from '@/lib/singability';

// Each line is one AI request; the chat rate limit allows 20 a minute.
export const MAX_FIX_ALL_LINES = 8;

export type FixTarget = {
  line: number;
  issues: SingabilityIssue[];
};

// Groups line issues by line, bottom line first. Rewriting from the bottom up keeps the indices of
// the lines still to do valid even when a long line is split in two.
export function planFixes(issues: SingabilityIssue[], maxLines = MAX_FIX_ALL_LINES) {
  const byLine: FixTarget[] = [];
  issues.forEach(issue => {
    if (issue.line === null) {
      return;
    }
    const existing = byLine.find(target => target.line === issue.line);
    if (existing) {
      existing.issues.push(issue);
    } else {
      byLine.push({ line: issue.line, issues: [issue] });
    }
  });
  const targets = byLine.sort((a, b) => a.line - b.line).slice(0, maxLines);
  return { targets: targets.reverse(), skipped: Math.max(0, byLine.length - maxLines) };
}

export type FixAllResult = {
  lyrics: string;
  fixed: number;
  failed: number;
  // Lines the AI wrote, for the authorship record.
  aiLines: string[];
  // Set when a request failed in a way that stops the run (quota, rate limit, network).
  error: string | null;
};

type RunFixesOptions = {
  lyrics: string;
  targets: FixTarget[];
  requestFor: (target: FixTarget) => string;
  rewrite: (context: string, selection: string, instruction: string) => Promise<string>;
  onProgress?: (done: number) => void;
};

export async function runFixes({ lyrics, targets, requestFor, rewrite, onProgress }: RunFixesOptions) {
  const lines = lyrics.split('\n');
  const result: FixAllResult = { lyrics, fixed: 0, failed: 0, aiLines: [], error: null };

  for (let done = 0; done < targets.length; done += 1) {
    const target = targets[done];
    const original = lines[target.line];
    if (original === undefined || !original.trim()) {
      result.failed += 1;
      continue;
    }
    try {
      const replacement = (await rewrite(lines.join('\n'), original, requestFor(target))).trim();
      if (replacement && replacement !== original.trim()) {
        const replaced = replacement.split('\n');
        lines.splice(target.line, 1, ...replaced);
        result.aiLines.push(...replaced.map(line => line.trim()).filter(Boolean));
        result.fixed += 1;
      } else {
        result.failed += 1;
      }
    } catch (error) {
      result.failed += targets.length - done;
      result.error = error instanceof Error && error.message ? error.message : 'error';
      break;
    } finally {
      onProgress?.(done + 1);
    }
  }

  result.lyrics = lines.join('\n');
  return result;
}
