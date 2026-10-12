import { useEffect, type FormEvent, type ReactNode } from 'react';

import type { DashboardText } from '@/hooks/useDashboardText';

function DialogFrame({
  labelledBy,
  zIndex,
  backdropOpacity,
  onDismiss,
  children
}: {
  labelledBy: string;
  zIndex: number;
  backdropOpacity: number;
  onDismiss: () => void;
  children: ReactNode;
}) {
  return (
    <div
      role="presentation"
      onClick={onDismiss}
      style={{
        position: 'fixed',
        inset: 0,
        background: `rgba(0,0,0,${backdropOpacity})`,
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={event => event.stopPropagation()}
        style={{
          width: 'min(420px, 92vw)',
          background: 'rgba(20,20,20,0.96)',
          borderRadius: 18,
          padding: 28,
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.45)',
          display: 'grid',
          gap: 18
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function NicknameModal({
  text,
  value,
  error,
  saving,
  onChange,
  onClose,
  onSubmit
}: {
  text: DashboardText;
  value: string;
  error: string | null;
  saving: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  // Escape closes the dialog (unless saving) and the page behind it must not scroll.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const { style } = document.body;
    const previousOverflow = style.overflow;
    style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      style.overflow = previousOverflow;
    };
  }, [saving, onClose]);

  return (
    <DialogFrame labelledBy="nickname-modal-title" zIndex={120} backdropOpacity={0.55} onDismiss={onClose}>
      <div>
        <h2 id="nickname-modal-title" style={{ margin: 0, fontSize: '1.4rem' }}>
          {text.nicknameModalTitle}
        </h2>
        <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
          {text.nicknameModalDescription}
        </p>
      </div>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
        <label style={{ display: 'grid', gap: 8 }}>
          <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>{text.nicknameLabel}</span>
          <input
            type="text"
            value={value}
            onChange={event => onChange(event.target.value)}
            placeholder={text.nicknamePlaceholder}
            disabled={saving}
            autoFocus
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              fontSize: '0.95rem'
            }}
          />
        </label>

        {error ? <p style={{ margin: 0, color: '#fca5a5', fontSize: '0.85rem' }}>{error}</p> : null}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
            {text.nicknameCancel}
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? text.nicknameSaving : text.nicknameSave}
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}

export function DeleteAccountDialog({
  text,
  deleting,
  onCancel,
  onConfirm
}: {
  text: DashboardText;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <DialogFrame labelledBy="delete-confirm-title" zIndex={130} backdropOpacity={0.6} onDismiss={onCancel}>
      <div>
        <h2 id="delete-confirm-title" style={{ margin: 0, fontSize: '1.35rem', color: '#f87171' }}>
          {text.profileMenuDeleteAccount}
        </h2>
        <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
          {text.deleteAccountConfirm}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={deleting}>
          {text.nicknameCancel}
        </button>
        <button type="button" className="btn btn--danger" onClick={onConfirm} disabled={deleting}>
          {deleting ? text.deleteAccountInProgress : text.profileMenuDeleteAccount}
        </button>
      </div>
    </DialogFrame>
  );
}
