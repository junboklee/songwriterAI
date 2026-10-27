import { ReactNode, useState } from 'react';

type AppShellProps = {
  sidebar?: ReactNode;
  children: ReactNode;
};

export function AppShell({ sidebar, children }: AppShellProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const hasSidebar = Boolean(sidebar);
  const closeSidebar = () => setIsMobileSidebarOpen(false);

  return (
    <div className={`app-shell${hasSidebar ? ' app-shell--with-sidebar' : ''}${isMobileSidebarOpen ? ' app-shell--sidebar-open' : ''}`}>
      {hasSidebar ? (
        <>
          <button
            type="button"
            className="app-shell__mobile-toggle"
            aria-label="메뉴 열기"
            onClick={() => setIsMobileSidebarOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
          <aside className="app-shell__sidebar">
            <div className="app-shell__sidebar-inner">
              <button
                type="button"
                className="app-shell__sidebar-close"
                aria-label="메뉴 닫기"
                onClick={closeSidebar}
              >
                ×
              </button>
              {sidebar}
            </div>
          </aside>
          {isMobileSidebarOpen ? (
            <button
              type="button"
              className="app-shell__sidebar-backdrop"
              aria-label="메뉴 닫기"
              onClick={closeSidebar}
            />
          ) : null}
        </>
      ) : null}
      <main className="app-shell__content">{children}</main>
    </div>
  );
}
