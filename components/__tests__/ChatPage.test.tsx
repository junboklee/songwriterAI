import { act, fireEvent, render, screen } from '@testing-library/react';

import ChatPage from '@/pages/chat';

const mockSend = jest.fn();
let mockAiAvailable: boolean | null = null;
let mockSessionOptions: { onReply?: (reply: unknown) => void } = {};
jest.mock('@/hooks/useAiAvailable', () => ({ useAiAvailable: () => mockAiAvailable }));
jest.mock('next/router', () => ({ useRouter: () => ({ query: {}, push: jest.fn() }) }));
jest.mock('next/image', () => ({ __esModule: true, default: () => null }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>
}));
jest.mock('@/components/AppNav', () => ({ AppNav: () => null }));
jest.mock('@/components/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('@/components/RequireAuth', () => ({ RequireAuth: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('@/components/chat/ChatMessageList', () => ({ ChatMessageList: () => null }));
jest.mock('@/components/chat/ChatSidebar', () => ({ ChatSidebar: () => null }));
jest.mock('@/components/chat/ChatVideoPanel', () => ({ ChatVideoPanel: () => null }));
jest.mock('@/components/chat/ChatComposer', () => ({
  ChatComposer: ({ value, onChange, onSend }: { value: string; onChange: (text: string) => void; onSend: (text: string) => void }) => (
    <>
      <textarea aria-label="메시지" value={value} onChange={event => onChange(event.target.value)} />
      <button onClick={() => onSend(value)}>보내기</button>
    </>
  )
}));
jest.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'u1' } }) }));
jest.mock('@/context/I18nContext', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@/hooks/useLyricsAutoSave', () => ({ useLyricsAutoSave: () => ({ enabled: true, toggle: jest.fn(), handleReply: jest.fn() }) }));
jest.mock('@/hooks/useChatSession', () => ({
  useChatSession: (_user: unknown, _characterId: unknown, options: typeof mockSessionOptions) => {
    mockSessionOptions = options;
    return {
    character: { id: '1', name: '다연', avatar: '/a.png', description: '', availability: '' },
    characterId: '1',
    isLoading: false,
    messages: [],
    threadId: null,
    streamingText: null,
    quota: null,
    error: null,
    conversations: [],
    conversationsLoading: false,
    conversationsError: null,
    resolveCharacterMeta: jest.fn(),
    send: mockSend
    };
  }
}));

const sendText = async (text: string) => {
  fireEvent.change(screen.getByLabelText('메시지'), { target: { value: text } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: '보내기' }));
  });
};

describe('chat page draft', () => {
  beforeEach(() => {
    mockAiAvailable = null;
  });

  it('says up front when the AI is down, until a reply arrives', () => {
    mockAiAvailable = false;
    render(<ChatPage />);
    expect(screen.getByRole('status')).toHaveTextContent('지금은 AI가 잠시 답하지 못하고 있어요.');
    expect(screen.getByRole('link', { name: '이름 넣어 가사 만들기' })).toHaveAttribute('href', '/lyrics/maker');

    act(() => mockSessionOptions.onReply?.({ reply: '안녕!' }));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows no notice while the AI is answering', () => {
    mockAiAvailable = true;
    render(<ChatPage />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('gives the text back when the message got no reply', async () => {
    mockSend.mockResolvedValue(false);
    render(<ChatPage />);
    await sendText('엄마 생신 노래');
    expect(mockSend).toHaveBeenCalledWith('엄마 생신 노래');
    expect(screen.getByLabelText('메시지')).toHaveValue('엄마 생신 노래');
  });

  it('keeps the box empty after a reply', async () => {
    mockSend.mockResolvedValue(true);
    render(<ChatPage />);
    await sendText('안녕');
    expect(screen.getByLabelText('메시지')).toHaveValue('');
  });
});
