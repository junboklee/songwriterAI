import { ReactNode } from 'react';

type AppNavProps = {
  actions?: ReactNode;
  showBrand?: boolean;
};

export function AppNav({ actions, showBrand = true }: AppNavProps) {
  return (
    <header className="app-nav">
      <div className="app-nav__logo" aria-hidden={!showBrand}>
        {showBrand ? (
          <>
            <span>Character Studio</span>
          </>
        ) : null}
      </div>
      <div className="app-nav__actions">{actions}</div>
    </header>
  );
}
