import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { AppNav } from '@/components/AppNav';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/context/AuthContext';
import { signOut, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function SettingsPage() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth.currentUser) {
      return;
    }

    setSaving(true);
    setStatus(null);

    try {
      if (displayName && displayName !== auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, { displayName });
      }
      setStatus('Profile updated successfully.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to update profile.');
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
              <p className="section-title">Account</p>
              <div className="sidebar-list" style={{ marginTop: 14 }}>
                <div className="sidebar-item">
                  <span className="sidebar-item__icon">📧</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>Email</p>
                    <p
                      style={{
                        margin: '4px 0 0',
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem'
                      }}
                    >
                      {user?.email ?? 'Not available'}
                    </p>
                  </div>
                </div>
                <div className="sidebar-item">
                  <span className="sidebar-item__icon">🧾</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>Plan</p>
                    <p
                      style={{
                        margin: '4px 0 0',
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem'
                      }}
                    >
                      Creator (free tier)
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="callout">
              Need higher limits? Connect this UI with your billing portal to manage subscription
              plans and usage quotas.
            </div>
          </div>
        }
      >
        <AppNav
          actions={
            <>
              <Link href="/dashboard" className="btn btn--ghost">
                Back to dashboard
              </Link>
              <button type="button" onClick={handleSignOut} className="btn btn--primary">
                Sign out
              </button>
            </>
          }
        />

        <form className="glass-panel" style={{ padding: 32, display: 'grid', gap: 24 }} onSubmit={handleSave}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Profile settings</h1>
            <p
              style={{
                margin: '8px 0 0',
                color: 'var(--text-secondary)',
                maxWidth: 540,
                lineHeight: 1.6
              }}
            >
              Update how your name appears when sharing characters and chatting across the platform.
            </p>
          </div>

          <label style={{ display: 'grid', gap: 10 }}>
            <span style={{ fontWeight: 600 }}>Display name</span>
            <input
              className="search-input"
              placeholder="How should the community address you?"
              value={displayName}
              onChange={event => setDisplayName(event.target.value)}
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              This name appears in character credits and shared chats.
            </span>
          </label>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>

          {status ? (
            <p style={{ fontSize: '0.82rem', color: status.includes('successfully') ? '#6ee7b7' : 'var(--danger)' }}>
              {status}
            </p>
          ) : null}
        </form>
      </AppShell>
    </RequireAuth>
  );
}
