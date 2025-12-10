import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMemo } from 'react';

import { useTranslation } from '@/context/I18nContext';

type MainSidebarProps = {
  active: 'chat' | 'history' | 'suno' | 'dashboard';
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

  const navItems = useMemo(() => {
    const base = NAV_CONFIG.map(item => ({
      ...item,
      label: t(`nav.${item.key}.label`),
      description: t(`nav.${item.key}.description`)
    }));

    base.push({
      key: 'dashboard' as MainSidebarProps['active'],
      href: '/dashboard',
      label: t('nav.dashboard.label'),
      description: t('nav.dashboard.description')
    });

    return base;
  }, [t]);

  return (
    <div className="main-sidebar">
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

      {children ? <div className="main-sidebar__body">{children}</div> : null}
    </div>
  );
}
