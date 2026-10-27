import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

import { AppNav } from '@/components/AppNav';
import { AppShell } from '@/components/AppShell';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut, updateProfile } from 'firebase/auth';

const SUCCESS_MESSAGE =
  '\uD504\uB85C\uD544\uC774 \uC131\uACF5\uC801\uC73C\uB85C \uC5C5\uB370\uC774\uD2B8\uB418\uC5C8\uC2B5\uB2C8\uB2E4.';
const GENERIC_ERROR =
  '\uD504\uB85C\uD544\uC744 \uC5C5\uB370\uC774\uD2B8\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.';
const SESSION_EXPIRED =
  '\uC138\uC158\uC774 \uB9CC\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uB85C\uADF8\uC778\uD574 \uC8FC\uC138\uC694.';

export default function SettingsPage() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [usage, setUsage] = useState<{
    month: string;
    plan: string;
    limit: number | null;
    chatRequests: number;
  } | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }
    let cancelled = false;
    user
      .getIdToken()
      .then(idToken => fetch('/api/profile', { headers: { Authorization: `Bearer ${idToken}` } }))
      .then(response => (response.ok ? response.json() : null))
      .then(payload => {
        if (!cancelled && payload?.usage) {
          setUsage(payload.usage);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth.currentUser || !user) {
      setStatus(SESSION_EXPIRED);
      return;
    }

    setSaving(true);
    setStatus(null);

    try {
      if (displayName && displayName !== auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, { displayName });
      }

      const idToken = await user.getIdToken();
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          displayName: displayName.trim()
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          (payload && typeof payload.error === 'string' && payload.error) || GENERIC_ERROR;
        throw new Error(message);
      }

      setStatus(SUCCESS_MESSAGE);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : GENERIC_ERROR);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <RequireAuth>
      <AppShell
        sidebar={
          <div className="glass-panel" style={{ padding: 24, display: 'grid', gap: 18 }}>
            <div>
              <p className="section-title">계정</p>
              <div className="sidebar-list" style={{ marginTop: 14 }}>
                <div className="sidebar-item">
                  <span className="sidebar-item__icon">{'\uD83D\uDCE7'}</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>이메일</p>
                    <p
                      style={{
                        margin: '4px 0 0',
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem'
                      }}
                    >
                      {user?.email ?? '없음'}
                    </p>
                  </div>
                </div>
                <div className="sidebar-item">
                  <span className="sidebar-item__icon">{'\u2B50'}</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>요금제</p>
                    <p
                      style={{
                        margin: '4px 0 0',
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem'
                      }}
                    >
                      {usage?.plan === 'studio' ? 'Studio' : '베타 (무료)'}
                    </p>
                  </div>
                </div>
                <div className="sidebar-item">
                  <span className="sidebar-item__icon">{'\uD83C\uDFB5'}</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>이번 달 AI 요청</p>
                    <p
                      style={{
                        margin: '4px 0 0',
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem'
                      }}
                    >
                      {usage
                        ? `${usage.chatRequests}${usage.limit ? ` / ${usage.limit}` : ''} (${usage.month})`
                        : '\u2014'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="callout">
              베타 기간에는 모든 기능이 무료예요. 한도가 더 큰 유료 요금제는 출시 전에 요금 안내 페이지에서
              먼저 알려 드려요.
            </div>
            {/* The header actions are hidden on phones, so sign-out also lives in the menu. */}
            <button type="button" onClick={handleSignOut} className="btn btn--ghost">
              로그아웃
            </button>
          </div>
        }
      >
        <AppNav
          actions={
            <>
              <Link href="/dashboard" className="btn btn--ghost">
                대시보드로
              </Link>
              <button type="button" onClick={handleSignOut} className="btn btn--primary">
                로그아웃
              </button>
            </>
          }
        />

        <form
          className="glass-panel"
          style={{ padding: 32, display: 'grid', gap: 24 }}
          onSubmit={handleSave}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem' }}>프로필 설정</h1>
            <p
              style={{
                margin: '8px 0 0',
                color: 'var(--text-secondary)',
                maxWidth: 540,
                lineHeight: 1.6
              }}
            >
              캐릭터를 공유하거나 대화할 때 보이는 이름을 바꿀 수 있어요.
            </p>
          </div>

          <label style={{ display: 'grid', gap: 10 }}>
            <span style={{ fontWeight: 600 }}>표시 이름</span>
            <input
              className="search-input"
              placeholder="다른 사람에게 보일 이름을 입력해 주세요."
              value={displayName}
              onChange={event => setDisplayName(event.target.value)}
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              공개한 캐릭터의 만든 사람 표시와 공유한 대화에 이 이름이 보여요.
            </span>
          </label>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? '저장 중...' : '변경 사항 저장'}
            </button>
          </div>

          {status ? (
            <p
              style={{
                fontSize: '0.82rem',
                color: status === SUCCESS_MESSAGE ? '#6ee7b7' : 'var(--danger)'
              }}
            >
              {status}
            </p>
          ) : null}
        </form>
      </AppShell>
    </RequireAuth>
  );
}
