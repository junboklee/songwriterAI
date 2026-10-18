import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AssistantMessageBody } from '@/components/AssistantMessageBody';
import { AuthNotice } from '@/components/AuthNotice';
import { SongEditor } from '@/components/SongEditor';
import { I18nProvider } from '@/context/I18nContext';
import { isAiAssisted } from '@/lib/aiDisclosure';
import SharedSongPage from '@/pages/s/[shareId]';

jest.mock('next/head', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>
}));

jest.mock('@/lib/analytics', () => ({ trackEvent: jest.fn() }));

describe('isAiAssisted', () => {
  it('is true for chat songs and songs with a saved AI rewrite only', () => {
    expect(isAiAssisted({ threadId: 't1' })).toBe(true);
    expect(isAiAssisted({ metadata: { source: 'auto-from-chat' } })).toBe(true);
    expect(isAiAssisted({ aiAssisted: true })).toBe(true);
    expect(isAiAssisted({ threadId: null, metadata: {} })).toBe(false);
  });
});

describe('AI disclosure in the UI', () => {
  it('tells users before sign-up that the service uses generative AI', () => {
    render(<AuthNotice />);
    expect(screen.getByText(/OpenAI의 생성형 AI 모델로/)).toBeInTheDocument();
    // The terms links live in AuthLayout; the notice must not repeat them.
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('labels lyrics in a chat reply as AI-generated', () => {
    render(<AssistantMessageBody content={'좋아!\n<lyrics title="밤">\n[Verse]\n별\n</lyrics>'} />);
    expect(screen.getByText('AI 생성 가사')).toBeInTheDocument();
    render(<AssistantMessageBody content="안녕! 오늘 어땠어?" />);
    expect(screen.getAllByText('AI 생성 가사')).toHaveLength(1);
  });

  it('labels a shared AI song visibly and machine-readably, but not a hand-written one', () => {
    const props = { shareId: 's1', title: '밤', lyrics: '[Verse]\n별', style: null };
    const { container, unmount } = render(<SharedSongPage {...props} aiAssisted />);
    expect(screen.getByText('AI 생성 · 생성형 AI와 함께 쓴 가사')).toBeInTheDocument();
    expect(container.querySelector('meta[name="ai-generated"]')).toHaveAttribute('content', 'true');
    unmount();

    const human = render(<SharedSongPage {...props} aiAssisted={false} />);
    expect(screen.getByText('NovaSingerAI에서 공유한 가사')).toBeInTheDocument();
    expect(human.container.querySelector('meta[name="ai-generated"]')).toBeNull();
  });
});

describe('SongEditor', () => {
  it('marks the save as AI-assisted after an AI rewrite was applied', async () => {
    const calls: Array<{ url: string; body?: Record<string, unknown> }> = [];
    global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url, body });
      const payload = url === '/api/lyrics/rewrite' ? { replacement: '삼월의 바람이 불어' } : { versions: [] };
      return { ok: true, json: async () => payload } as Response;
    }) as unknown as typeof fetch;
    const song = {
      id: 's1',
      title: '봄',
      lyrics: '[Verse]\n3월의 바람이 불어\n너를 다시 생각해',
      prompt: null,
      characterId: null,
      threadId: null,
      metadata: {},
      createdAt: null,
      updatedAt: null
    };

    render(
      <I18nProvider initialLocale="ko">
        <SongEditor song={song} getIdToken={async () => 'token'} onClose={jest.fn()} onSaved={jest.fn()} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: '고치기' }));
    fireEvent.click(screen.getByRole('button', { name: '다시 쓰기' }));
    fireEvent.click(await screen.findByRole('button', { name: '적용' }));
    fireEvent.click(screen.getByRole('button', { name: '새 버전으로 저장' }));

    const isSave = (call: { url: string; body?: Record<string, unknown> }) =>
      call.url === '/api/profile/songs/s1' && Boolean(call.body?.lyrics);
    await waitFor(() => expect(calls.some(isSave)).toBe(true));
    const save = calls.find(isSave);
    expect(save?.body).toMatchObject({ lyrics: '[Verse]\n삼월의 바람이 불어\n너를 다시 생각해', aiAssisted: true });
  });
});
