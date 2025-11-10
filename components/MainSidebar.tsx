import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

import { useTranslation } from '@/context/I18nContext';

type MainSidebarProps = {
  active: 'chat' | 'history' | 'suno';
  children?: ReactNode;
};

const NAV_CONFIG: Array<{
  key: MainSidebarProps['active'];
  href: string;
}> = [
  { key: 'chat', href: '/chat' },
  { key: 'history', href: '/history' },
  { key: 'suno', href: '/suno' }
];

export function MainSidebar({ active, children }: MainSidebarProps) {
  const { t } = useTranslation('sidebar');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = useMemo(
    () =>
      NAV_CONFIG.map(item => ({
        ...item,
        label: t(`nav.${item.key}.label`),
        description: t(`nav.${item.key}.description`)
      })),
    [t]
  );

  return (
    <div className={`main-sidebar${isCollapsed ? ' main-sidebar--collapsed' : ''}`}>
      <button
        className="main-sidebar__toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? '▼' : '▲'}
      </button>
      <nav className="main-sidebar__nav">
        {navItems.map(item => {
          const isActive = item.key === active;

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`main-sidebar__nav-item${isActive ? ' main-sidebar__nav-item--active' : ''}`}
            >
              <span className="main-sidebar__nav-label">{item.label}</span>
              <span className="main-sidebar__nav-description">{item.description}</span>
            </Link>
          );
        })}
      </nav>

      {!isCollapsed && children ? <div className="main-sidebar__body">{children}</div> : null}
    </div>
  );
}

