import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { trackEvent } from '@/lib/analytics';
import TryPage from '@/pages/try';

const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockQuery: Record<string, string> = {};
let mockUser: { uid: string } | null = null;
jest.mock('next/router', () => ({
  useRouter: () => ({ query: mockQuery, isReady: true, replace: mockReplace, push: mockPush })
}));
jest.mock('next/head', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>
}));
jest.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: mockUser, loading: false }) }));
jest.mock('@/lib/analytics', () => ({ trackEvent: jest.fn() }));

const reply = (payload: unknown, ok = true) => ({ ok, json: async () => payload });

describe('/try', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = {};
    mockUser = null;
    window.localStorage.clear();
  });

  it('needs the adult checkbox before sending', async () => {
    const fetchMock = jest.fn().mockResolvedValue(reply({ reply: '좋아! 어떤 이야기야?', remaining: 2 }));
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<TryPage />);

    fireEvent.change(screen.getByPlaceholderText(/쓰고 싶은 노래/), { target: { value: '안녕' } });
    expect(screen.getByRole('button', { name: '보내기' })).toBeDisabled();

    fireEvent.click(screen.getByLabelText('만 19세 이상입니다 (필수)'));
    fireEvent.click(screen.getByRole('button', { name: '보내기' }));

    expect(await screen.findByText('좋아! 어떤 이야기야?')).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ message: '안녕', history: [], adult: true });
    expect(screen.getByText('오늘 남은 체험 2회')).toBeInTheDocument();
  });

  it('prefills the topic prompt and keeps the lyrics for after sign-up', async () => {
    mockQuery = { prompt: '친구 결혼식 축가 가사를 쓰고 싶어.' };
    global.fetch = jest.fn().mockResolvedValue(
      reply({ reply: '<lyrics title="너의 봄">\n[Verse]\n봄날 같은 너</lyrics>\n<style>ballad</style>', remaining: 1 })
    ) as unknown as typeof fetch;
    render(<TryPage />);
    expect(screen.getByPlaceholderText(/쓰고 싶은 노래/)).toHaveValue('친구 결혼식 축가 가사를 쓰고 싶어.');

    fireEvent.click(screen.getByLabelText('만 19세 이상입니다 (필수)'));
    fireEvent.click(screen.getByRole('button', { name: '보내기' }));
    fireEvent.click(await screen.findByRole('button', { name: '무료로 가입하고 가사 저장하기' }));

    const saved = JSON.parse(window.localStorage.getItem('novasinger.trialLyrics') ?? '{}');
    expect(saved).toMatchObject({ title: '너의 봄', body: '[Verse]\n봄날 같은 너', style: 'ballad' });
    expect(mockPush).toHaveBeenCalledWith('/auth/register?redirect=%2Fsuno');
  });

  it('locks the form at the daily limit and offers sign-up', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      reply({ error: '오늘 체험은 여기까지예요. 가입하면 이어서 쓸 수 있어요.', code: 'TRIAL_LIMIT' }, false)
    ) as unknown as typeof fetch;
    render(<TryPage />);
    fireEvent.click(screen.getByLabelText('만 19세 이상입니다 (필수)'));
    fireEvent.change(screen.getByPlaceholderText(/쓰고 싶은 노래/), { target: { value: '하나 더' } });
    fireEvent.click(screen.getByRole('button', { name: '보내기' }));

    expect(await screen.findByText(/오늘 체험은 여기까지예요/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '무료로 가입하기' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/쓰고 싶은 노래/)).toBeDisabled();
  });

  it('sends members to the full chat', async () => {
    mockUser = { uid: 'u1' };
    mockQuery = { prompt: '축가' };
    render(<TryPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(`/chat?characterId=1&prompt=${encodeURIComponent('축가')}`));
  });
  it('records where the visitor came from', () => {
    mockQuery = { from: 'share' };
    render(<TryPage />);
    expect(trackEvent).toHaveBeenCalledWith('trial_view', { from: 'share' });
  });
});
