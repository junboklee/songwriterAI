import { Component, type ErrorInfo, type ReactNode } from 'react';

import { reportClientError } from '@/lib/errorReporting';

type ErrorBoundaryState = { failed: boolean };

// Keeps a render crash from blanking the whole app: report it and offer a reload.
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const withComponent = new Error(error.message);
    withComponent.stack = `${error.stack ?? ''}\n--- component stack ---${info.componentStack ?? ''}`;
    reportClientError('react', withComponent);
  }

  render() {
    if (!this.state.failed) {
      return this.props.children;
    }
    return (
      <main
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeContent: 'center',
          gap: 16,
          padding: '0 16px',
          textAlign: 'center'
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.4rem' }}>문제가 생겼어요</h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          화면을 그리는 중 오류가 발생했습니다. 오류 내용은 자동으로 전달됐어요.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
            새로고침
          </button>
          {/* Full navigation on purpose: client state may be what crashed. */}
          <button type="button" className="btn btn--ghost" onClick={() => window.location.assign('/dashboard')}>
            대시보드로
          </button>
        </div>
      </main>
    );
  }
}
