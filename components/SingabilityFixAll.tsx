import { useEffect, useMemo, useState } from 'react';

import { useTranslation } from '@/context/I18nContext';
import { trackEvent } from '@/lib/analytics';
import { requestRewrite } from '@/lib/lyricsRewrite';
import { diffLines } from '@/lib/lyricsTools';
import { checkSingability } from '@/lib/singability';
import { planFixes, runFixes, type FixAllResult, type FixTarget } from '@/lib/singabilityFix';

type SingabilityFixAllProps = {
  lyrics: string;
  style: string;
  getIdToken: () => Promise<string>;
  onApply: (lyrics: string, aiLines: string[]) => void;
};

type Review = FixAllResult & { base: string; before: number; after: number };

// Rewrites every flagged line in one go and shows the whole change for review before applying it.
export function SingabilityFixAll({ lyrics, style, getIdToken, onApply }: SingabilityFixAllProps) {
  const { t } = useTranslation('songEditor');
  const issues = useMemo(() => checkSingability(lyrics), [lyrics]);
  const plan = useMemo(() => planFixes(issues), [issues]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [review, setReview] = useState<Review | null>(null);

  // A review made from older lyrics would overwrite the user's edits, so drop it when they change.
  useEffect(() => {
    setReview(current => (current && current.base !== lyrics ? null : current));
  }, [lyrics]);

  // One request per line, combining what each of its issues asks for (each kind once).
  const requestFor = (target: FixTarget) =>
    target.issues
      .filter((issue, index) => target.issues.findIndex(item => item.kind === issue.kind) === index)
      .map(issue =>
        t(`singabilityRequest.${issue.kind}`, {
          replacements: { syllables: issue.syllables ?? 0, target: issue.target ?? 0 }
        })
      )
      .join(' ');

  const run = async () => {
    const base = lyrics;
    setReview(null);
    setProgress({ done: 0, total: plan.targets.length });
    trackEvent('singability_fix_all', { lines: plan.targets.length });
    const result = await runFixes({
      lyrics: base,
      targets: plan.targets,
      requestFor,
      rewrite: (context, selection, instruction) =>
        requestRewrite(getIdToken, { lyrics: context, selection, instruction, style }, t('error')),
      onProgress: done => setProgress({ done, total: plan.targets.length })
    });
    setProgress(null);
    setReview({ ...result, base, before: issues.length, after: checkSingability(result.lyrics).length });
  };

  if (progress) {
    return (
      <p className="singability__fix-all-status" role="status">
        {t('fixAllRunning', { replacements: { done: progress.done, total: progress.total } })}
      </p>
    );
  }

  if (review) {
    return (
      <div className="singability__fix-all-review">
        {review.fixed > 0 ? (
          <>
            <strong>
              {t('fixAllReview', { replacements: { count: review.fixed, before: review.before, after: review.after } })}
            </strong>
            <div className="song-editor__diff">
              {diffLines(review.base, review.lyrics)
                .filter(line => line.type !== 'same')
                .map((line, index) => (
                  <div key={index} className={`song-editor__diff-line song-editor__diff-line--${line.type}`}>
                    <span>{line.type === 'added' ? '+' : '−'}</span>
                    {line.text || ' '}
                  </div>
                ))}
            </div>
          </>
        ) : null}
        {review.failed > 0 ? (
          <p className="lyrics-rewrite__error">
            {review.error ?? t('fixAllPartial', { replacements: { count: review.failed } })}
          </p>
        ) : null}
        <div className="song-editor__actions">
          {review.fixed > 0 ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                trackEvent('singability_fix_all_applied', { lines: review.fixed });
                onApply(review.lyrics, review.aiLines);
                setReview(null);
              }}
            >
              {t('fixAllApply')}
            </button>
          ) : null}
          <button type="button" className="btn btn--ghost" onClick={() => setReview(null)}>
            {t('fixAllCancel')}
          </button>
        </div>
        {review.fixed > 0 ? <p className="song-editor__hint">{t('rewriteHint')}</p> : null}
      </div>
    );
  }

  // One flagged line is handled by its own "Fix" button.
  if (plan.targets.length < 2) {
    return null;
  }

  return (
    <div className="singability__fix-all">
      <button type="button" className="btn btn--primary" onClick={() => void run()}>
        {t('fixAll', { replacements: { count: plan.targets.length } })}
      </button>
      <span className="song-editor__hint">
        {t('fixAllHint', { replacements: { count: plan.targets.length } })}
        {plan.skipped > 0 ? ` ${t('fixAllLimit', { replacements: { count: plan.targets.length } })}` : ''}
      </span>
    </div>
  );
}
