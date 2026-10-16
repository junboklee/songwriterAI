import { fireEvent, render, screen } from '@testing-library/react';

import { ChatComposer } from '@/components/chat/ChatComposer';

jest.mock('@/context/I18nContext', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>
}));

const setup = (overrides: Partial<React.ComponentProps<typeof ChatComposer>> = {}) => {
  const props = {
    value: '  비 오는 날  ',
    onChange: jest.fn(),
    onSend: jest.fn(),
    busy: false,
    autoSave: { enabled: true, onToggle: jest.fn() },
    quota: null,
    error: null,
    ...overrides
  };
  render(<ChatComposer {...props} />);
  return props;
};

describe('ChatComposer', () => {
  it('sends the trimmed text with Enter but not with Shift+Enter', () => {
    const props = setup();
    const input = screen.getByPlaceholderText('inputPlaceholder');
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(props.onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(props.onSend).toHaveBeenCalledWith('비 오는 날');
  });

  it('ignores Enter while a Korean IME is still composing', () => {
    const props = setup();
    fireEvent.keyDown(screen.getByPlaceholderText('inputPlaceholder'), { key: 'Enter', isComposing: true });
    expect(props.onSend).not.toHaveBeenCalled();
  });

  it('does not send while busy or empty', () => {
    const busy = setup({ busy: true });
    fireEvent.click(screen.getByRole('button', { name: 'send' }));
    expect(busy.onSend).not.toHaveBeenCalled();
  });

  it('fills the input from a quick reply', () => {
    const props = setup({ value: '' });
    expect(screen.getByRole('button', { name: 'send' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '안녕, 반가워' }));
    expect(props.onChange).toHaveBeenCalledWith('안녕, 반가워');
  });

  it('shows the remaining quota only when it is low', () => {
    setup({ quota: { used: 100, limit: 300 } });
    expect(screen.queryByText(/남은 AI 요청/)).toBeNull();
  });

  it('warns about a low quota and shows errors', () => {
    setup({ quota: { used: 290, limit: 300 }, error: '요청 한도 초과' });
    expect(screen.getByText(/남은 AI 요청: 10회/)).toBeInTheDocument();
    expect(screen.getByText('요청 한도 초과')).toBeInTheDocument();
  });
});
