import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { AppNav } from '@/components/AppNav';
import { RequireAuth } from '@/components/RequireAuth';

const mockHistory = [
  {
    id: '1',
    title: 'Evening reflection with Dayeon',
    summary: 'Talked about winding down routines and gratitude journaling.',
    timestamp: 'Oct 13 · 9:12 PM'
  },
  {
    id: '2',
    title: 'Poetry brainstorming with Junho',
    summary: 'Collected imagery for autumn inspired haiku after work.',
    timestamp: 'Oct 10 · 2:33 PM'
  }
];

export default function ChatHistory() {
  return (
    <RequireAuth>
      <AppShell
        sidebar={
          <div>
            <p className="section-title">Shortcuts</p>
            <div className="sidebar-list" style={{ marginTop: 14 }}>
              <Link href="/dashboard" className="sidebar-item">
                <span className="sidebar-item__icon">🏠</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>Back to dashboard</p>
                  <p
                    style={{
                      margin: '4px 0 0',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem'
                    }}
                  >
                    Discover new AI companions
                  </p>
                </div>
              </Link>
              <Link href="/chat" className="sidebar-item">
                <span className="sidebar-item__icon">💬</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>Open active chat</p>
                  <p
                    style={{
                      margin: '4px 0 0',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem'
                    }}
                  >
                    Continue the latest conversation
                  </p>
                </div>
              </Link>
            </div>
          </div>
        }
      >
        <AppNav
          actions={
            <>
              <Link href="/chat" className="btn btn--ghost">
                Current chat
              </Link>
              <Link href="/dashboard" className="btn btn--primary">
                Start new chat
              </Link>
            </>
          }
        />

        <section className="glass-panel" style={{ padding: 28 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18
            }}
          >
            <div>
              <h1 style={{ margin: 0, fontSize: '1.4rem' }}>Conversation history</h1>
              <p
                style={{
                  margin: '6px 0 0',
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem'
                }}
              >
                Revisit and resume memorable chats with your characters.
              </p>
            </div>
            <Link href="/dashboard" className="btn btn--ghost">
              Browse characters
            </Link>
          </div>

          <div className="sidebar-list">
            {mockHistory.map(chat => (
              <Link
                key={chat.id}
                href={{ pathname: '/chat', query: { characterId: chat.id } }}
                className="sidebar-item"
              >
                <span className="sidebar-item__icon">🗂️</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{chat.title}</p>
                  <p
                    style={{
                      margin: '4px 0',
                      color: 'var(--text-secondary)',
                      fontSize: '0.82rem'
                    }}
                  >
                    {chat.summary}
                  </p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {chat.timestamp}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </AppShell>
    </RequireAuth>
  );
}
