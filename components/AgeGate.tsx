import { signOut } from 'firebase/auth';
import Link from 'next/link';
import { FormEvent, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/I18nContext';
import { EXISTING_MEMBER_DEADLINE } from '@/lib/age';
import { confirmAge } from '@/lib/ageClient';
import { authedJson } from '@/lib/authedFetch';
import { auth } from '@/lib/firebase';

// Birth-date form shared by the blocking gate and the reminder banner.
function AgeConfirmForm({ onUnderAge, onConfirmed }: { onUnderAge: () => void; onConfirmed: () => Promise<void> }) {
  const { t } = useTranslation('ageGate');
  const { user } = useAuth();
  const [birthDate, setBirthDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      return;
    }
    setBusy(true);
    setError(null);
    const result = await confirmAge(user, birthDate, t('error'));
    if (result.ok) {
      await onConfirmed().catch(() => setError(t('error')));
    } else if (result.underAge) {
      onUnderAge();
    } else {
      setError(result.message);
    }
    setBusy(false);
  };

  return (
    <form className="age-gate__form" onSubmit={submit}>
      <label className="age-gate__field">
        <span>{t('birthLabel')}</span>
        <input
          className="auth-form__input"
          inputMode="numeric"
          autoComplete="bday"
          maxLength={10}
          placeholder={t('birthPlaceholder')}
          value={birthDate}
          onChange={event => setBirthDate(event.target.value)}
          disabled={busy}
        />
      </label>
      <button type="submit" className="btn btn--primary" disabled={busy || birthDate.replace(/\D/g, '').length !== 8}>
        {busy ? t('checking') : t('submit')}
      </button>
      {error ? <p className="age-gate__error">{error}</p> : null}
      <p className="age-gate__hint">{t('privacyHint')}</p>
    </form>
  );
}

// Shown instead of a protected page when the account must confirm it is 만 19세 or older.
export function AgeGate() {
  const { t } = useTranslation('ageGate');
  const { user, refreshAgeGate } = useAuth();
  const [underAge, setUnderAge] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteAccount = async () => {
    setDeleting(true);
    setError(null);
    try {
      await authedJson(user, '/api/profile/delete-account', t('deleteError'), { method: 'DELETE' });
      await signOut(auth);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t('deleteError'));
      setDeleting(false);
    }
  };

  return (
    <div className="age-gate" role="dialog" aria-modal="true" aria-labelledby="age-gate-title">
      <div className="age-gate__card">
        <h1 id="age-gate-title">{underAge ? t('underAgeTitle') : t('title')}</h1>
        {underAge ? (
          <>
            <p>{t('underAgeBody')}</p>
            {confirmDelete ? (
              <div className="age-gate__actions">
                <p className="age-gate__error">{t('deleteConfirm')}</p>
                <button type="button" className="btn btn--danger" disabled={deleting} onClick={() => void deleteAccount()}>
                  {deleting ? t('deleting') : t('deleteYes')}
                </button>
                <button type="button" className="btn btn--ghost" disabled={deleting} onClick={() => setConfirmDelete(false)}>
                  {t('cancel')}
                </button>
              </div>
            ) : (
              <div className="age-gate__actions">
                <button type="button" className="btn btn--ghost" onClick={() => setConfirmDelete(true)}>
                  {t('deleteAccount')}
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => setUnderAge(false)}>
                  {t('retry')}
                </button>
              </div>
            )}
            {error ? <p className="age-gate__error">{error}</p> : null}
          </>
        ) : (
          <>
            <p>{t('body')}</p>
            <AgeConfirmForm
              onUnderAge={() => setUnderAge(true)}
              // The page's data requests were refused while the gate was up, so load it afresh.
              onConfirmed={async () => {
                await refreshAgeGate();
                window.location.reload();
              }}
            />
          </>
        )}
        <div className="age-gate__footer">
          <Link href="/terms">{t('terms')}</Link>
          <button type="button" className="age-gate__link" onClick={() => void signOut(auth)}>
            {t('logout')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Reminder for members who joined before the policy; they may keep using the service until the deadline.
export function AgeNoticeBanner() {
  const { t } = useTranslation('ageGate');
  const { refreshAgeGate } = useAuth();
  const [open, setOpen] = useState(false);
  const [underAge, setUnderAge] = useState(false);

  return (
    <aside className="age-notice" aria-label={t('noticeLabel')}>
      <p>{t('notice', { replacements: { date: EXISTING_MEMBER_DEADLINE } })}</p>
      {open ? (
        underAge ? (
          <p className="age-gate__error">{t('underAgeNotice', { replacements: { date: EXISTING_MEMBER_DEADLINE } })}</p>
        ) : (
          <AgeConfirmForm onUnderAge={() => setUnderAge(true)} onConfirmed={refreshAgeGate} />
        )
      ) : (
        <button type="button" className="btn btn--primary" onClick={() => setOpen(true)}>
          {t('noticeAction')}
        </button>
      )}
    </aside>
  );
}
