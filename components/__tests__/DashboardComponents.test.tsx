import { fireEvent, render, screen } from '@testing-library/react';

import { NicknameModal } from '@/components/dashboard/AccountDialogs';
import { RecentChatsSection } from '@/components/dashboard/DashboardSections';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import type { DashboardText } from '@/hooks/useDashboardText';

jest.mock('next/router', () => ({ useRouter: () => ({ asPath: '/dashboard' }) }));
jest.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>
      {children}
    </a>
  )
}));

// Every label resolves to its own key so assertions stay readable.
const text = new Proxy({} as DashboardText, {
  get: (_target, key: string) =>
    key === 'recentChatsCount' ? (count: number) => `count:${count}` : key === 'welcome' ? () => 'welcome' : key
});

const chat = {
  id: 'c1',
  threadId: 'thread-1',
  title: '새벽 노래',
  lastMessagePreview: '마지막 메시지',
  characterId: null,
  messageCount: 3,
  updatedAt: null
};

describe('DashboardSidebar profile menu', () => {
  const renderSidebar = (overrides: Partial<Parameters<typeof DashboardSidebar>[0]['profile']> = {}) => {
    const profile = {
      displayName: 'Nova',
      email: 'nova@example.com',
      isDeletingAccount: false,
      onNickname: jest.fn(),
      onSignOut: jest.fn(),
      onDeleteAccount: jest.fn(),
      ...overrides
    };
    render(
      <DashboardSidebar
        text={text}
        isOpen={false}
        onClose={jest.fn()}
        searchQuery=""
        onSearchChange={jest.fn()}
        recentChats={{ loading: false, error: null, hasAny: false, noSearchResults: false, items: [], deletingIds: {} }}
        characterNames={{}}
        onContinueChat={jest.fn()}
        profile={profile}
      />
    );
    return profile;
  };

  it('opens the menu, runs the action and closes again', () => {
    const profile = renderSidebar();

    fireEvent.click(screen.getByLabelText('profileMenuLabel'));
    fireEvent.click(screen.getByText('profileMenuNickname'));

    expect(profile.onNickname).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('profileMenuSignOut')).toBeNull();
  });

  it('closes on an outside click', () => {
    renderSidebar();
    fireEvent.click(screen.getByLabelText('profileMenuLabel'));
    expect(screen.getByText('profileMenuSignOut')).toBeTruthy();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('profileMenuSignOut')).toBeNull();
  });
});

describe('NicknameModal', () => {
  const renderModal = (saving: boolean) => {
    const onClose = jest.fn();
    render(
      <NicknameModal
        text={text}
        value="Nova"
        error={null}
        saving={saving}
        onChange={jest.fn()}
        onClose={onClose}
        onSubmit={jest.fn()}
      />
    );
    return onClose;
  };

  it('closes on Escape and locks page scroll while open', () => {
    const onClose = renderModal(false);
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('ignores Escape while saving', () => {
    const onClose = renderModal(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('RecentChatsSection', () => {
  const baseProps = {
    text,
    chats: [chat],
    characterNames: {},
    loading: false,
    error: null,
    hasAny: true,
    noSearchResults: false,
    deletingIds: {},
    isClearing: false,
    onClearAll: jest.fn(),
    onContinue: jest.fn(),
    onDelete: jest.fn()
  };

  it('shows loading before anything else', () => {
    render(<RecentChatsSection {...baseProps} loading error="boom" />);
    expect(screen.getByText('loadingIndicator')).toBeTruthy();
    expect(screen.queryByText('boom')).toBeNull();
  });

  it('renders chats and wires the actions', () => {
    const onContinue = jest.fn();
    const onDelete = jest.fn();
    render(<RecentChatsSection {...baseProps} onContinue={onContinue} onDelete={onDelete} />);

    expect(screen.getByText('count:3')).toBeTruthy();
    fireEvent.click(screen.getByText('continueChat'));
    expect(onContinue).toHaveBeenCalledWith('thread-1', null);
    fireEvent.click(screen.getByText('deleteRecentChat'));
    expect(onDelete).toHaveBeenCalledWith(chat);
  });
});
