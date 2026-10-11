import { fireEvent, render, screen } from '@testing-library/react';

import { ChatSidebar } from '@/components/chat/ChatSidebar';

jest.mock('@/components/MainSidebar', () => ({
  MainSidebar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt: string }) => <span data-testid="avatar">{props.alt}</span>
}));

const conversation = {
  id: 't1',
  threadId: 'thread-1',
  title: null,
  lastMessagePreview: '마지막 메시지',
  updatedAt: null,
  characterId: 'c1'
};

describe('ChatSidebar', () => {
  it('renders status icons as emoji rather than escape sequences', () => {
    const { container } = render(
      <ChatSidebar
        conversations={[]}
        loading={false}
        error={null}
        resolveCharacterMeta={() => null}
        onSelectConversation={jest.fn()}
        onSelectPrompt={jest.fn()}
      />
    );
    expect(container.textContent).toContain('💬');
    expect(container.textContent).not.toMatch(/\u[0-9A-F]{4}/i);
  });

  it('opens a conversation and selects role-play prompts', () => {
    const onSelectConversation = jest.fn();
    const onSelectPrompt = jest.fn();
    render(
      <ChatSidebar
        conversations={[conversation]}
        loading={false}
        error={null}
        resolveCharacterMeta={() => ({ id: 'c1', name: 'Muse', avatar: '/a.png', description: 'd' })}
        onSelectConversation={onSelectConversation}
        onSelectPrompt={onSelectPrompt}
      />
    );

    fireEvent.click(screen.getByText('Muse'));
    expect(onSelectConversation).toHaveBeenCalledWith(conversation);

    fireEvent.click(screen.getByText(/동창회 재회/));
    expect(onSelectPrompt).toHaveBeenCalledWith(expect.stringContaining('동창회'));
  });
});
