import { ReactNode } from 'react';

type AppShellProps = {
  sidebar?: ReactNode;
  children: ReactNode;
};

export function AppShell({ sidebar, children }: AppShellProps) {
  return (
    <div className="app-shell">
      {sidebar ? <aside className="app-shell__sidebar">{sidebar}</aside> : null}
      <main className="app-shell__content">{children}</main>
    </div>
  );
}
