import Link from 'next/link';
import { forwardRef, useState, type FormEvent, type KeyboardEvent } from 'react';

import { SongBriefWizard } from '@/components/chat/SongBriefWizard';
import { useTranslation } from '@/context/I18nContext';
import { AI_OUTPUT_CAVEAT, AI_SERVICE_NOTICE } from '@/lib/aiDisclosure';
import { QUICK_REPLIES } from '@/lib/chat/model';

// Show the remaining monthly AI requests once this few are left.
export const LOW_QUOTA_THRESHOLD = 30;

type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string) => void;
  busy: boolean;
  autoSave: { enabled: boolean; onToggle: () => void };
  quota: { used: number; limit: number | null } | null;
  error: string | null;
};

// Message input with the song brief wizard, quick replies, auto-save toggle and notices.
// The ref points at the textarea so the page can focus it (e.g. after picking a prompt).
export const ChatComposer = forwardRef<HTMLTextAreaElement, ChatComposerProps>(function ChatComposer(
  { value, onChange, onSend, busy, autoSave, quota, error },
  inputRef
) {
  const { t: tChat } = useTranslation('chat');
  const [showBrief, setShowBrief] = useState(false);
  const canSend = value.trim().length > 0 && !busy;

  const focusInput = () => {
    if (inputRef && typeof inputRef !== 'function') {
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canSend) {
      onSend(value.trim());
    }
  };

  // Enter sends, Shift+Enter adds a line break.
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (canSend) {
        onSend(value.trim());
      }
    }
  };

  const remaining = quota?.limit ? Math.max(0, quota.limit - quota.used) : null;

  return (
    <form onSubmit={handleSubmit} className="chat-footer">
      {showBrief ? (
        <SongBriefWizard
          onClose={() => setShowBrief(false)}
          onSubmit={prompt => {
            onChange(prompt);
            setShowBrief(false);
            focusInput();
          }}
        />
      ) : (
        <button type="button" className="chip song-brief__open" onClick={() => setShowBrief(true)}>
          🎼 곡 만들기 마법사
        </button>
      )}
      <details className="chip-accordion">
        <summary>{tChat('quickReplies')}</summary>
        <div className="chip-list chip-list--scroll">
          {QUICK_REPLIES.map(reply => (
            <button key={reply} type="button" className="chip" onClick={() => onChange(reply)}>
              {reply}
            </button>
          ))}
        </div>
      </details>
      <div className="chat-input">
        <textarea
          ref={inputRef}
          value={value}
          onChange={event => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tChat('inputPlaceholder')}
        />
        <button type="submit" disabled={!canSend} className="btn btn--primary" style={{ paddingInline: 24 }}>
          {tChat('send')}
        </button>
      </div>
      <div className="chat-footer__options" style={{ marginTop: 12 }}>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          <input type="checkbox" checked={autoSave.enabled} onChange={autoSave.onToggle} />
          <span>가사 자동 저장</span>
        </label>
        <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
          {AI_SERVICE_NOTICE} {AI_OUTPUT_CAVEAT}{' '}
          <Link href="/terms#ai" style={{ color: 'inherit', textDecoration: 'underline' }}>
            자세히
          </Link>
        </p>
      </div>
      {remaining !== null && remaining <= LOW_QUOTA_THRESHOLD ? (
        <p style={{ marginTop: 10, fontSize: '0.78rem', color: '#fbbf24' }}>
          이번 달 남은 AI 요청: {remaining}회 (매월 1일 초기화)
        </p>
      ) : null}
      {error ? <p style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--danger)' }}>{error}</p> : null}
    </form>
  );
});
