import { ReactNode } from 'react';

type AppNavProps = {
  actions?: ReactNode;
};

export function AppNav({ actions }: AppNavProps) {
  return (
    <header className="app-nav">
      <div className="app-nav__logo">
        <span className="app-nav__logo-mark">CAI</span>
        <span>Character Studio</span>
      </div>
      <div className="app-nav__actions">{actions}</div>
    </header>
  );
}
