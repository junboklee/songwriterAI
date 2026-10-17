import { useMemo } from 'react';

import { useTranslation } from '@/context/I18nContext';
import { checkSingability, type SingabilityIssue } from '@/lib/singability';

type SingabilityPanelProps = {
  lyrics: string;
  // Opens the line rewrite for `line` with a prefilled request.
  onFix: (line: number, request: string) => void;
};

const replacementsOf = (issue: SingabilityIssue) => ({
  syllables: issue.syllables ?? 0,
  target: issue.target ?? 0
});

// Lists what may be hard for AI music tools to sing, each with a one-click line rewrite.
export function SingabilityPanel({ lyrics, onFix }: SingabilityPanelProps) {
  const { t } = useTranslation('songEditor');
  const issues = useMemo(() => checkSingability(lyrics), [lyrics]);
  const lines = lyrics.split('\n');

  return (
    <section className="singability" aria-label={t('singabilityTitle')}>
      <div className="singability__header">
        <strong>{t('singabilityTitle')}</strong>
        <span className={`singability__badge${issues.length ? '' : ' singability__badge--ok'}`}>
          {issues.length ? t('singabilityCount', { replacements: { count: issues.length } }) : '✓'}
        </span>
      </div>
      <p className="song-editor__hint">{t('singabilityHint')}</p>
      {issues.length === 0 ? <p className="singability__ok">{t('singabilityOk')}</p> : null}
      <ul className="singability__list">
        {issues.map(issue => (
          <li key={`${issue.kind}-${issue.line}`} className={`singability__item singability__item--${issue.severity}`}>
            <div className="singability__text">
              {issue.line !== null ? (
                <span className="singability__line">
                  {t('singabilityLine', { replacements: { line: issue.line + 1 } })} · {lines[issue.line]?.trim()}
                </span>
              ) : null}
              <span>{t(`singability.${issue.kind}`, { replacements: replacementsOf(issue) })}</span>
            </div>
            {issue.line !== null ? (
              <button
                type="button"
                className="btn btn--ghost singability__fix"
                onClick={() =>
                  onFix(issue.line as number, t(`singabilityRequest.${issue.kind}`, { replacements: replacementsOf(issue) }))
                }
              >
                {t('singabilityFix')}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
