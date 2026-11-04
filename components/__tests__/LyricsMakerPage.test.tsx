import { fireEvent, render, screen } from '@testing-library/react';

import { trackEvent } from '@/lib/analytics';
import { copyText } from '@/lib/clipboard';
import LyricsMakerPage from '@/pages/lyrics/maker';

jest.mock('next/head', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, onClick }: { children: React.ReactNode; href: string; onClick?: () => void }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  )
}));
jest.mock('@/lib/analytics', () => ({ trackEvent: jest.fn() }));
jest.mock('@/lib/clipboard', () => ({ copyText: jest.fn().mockResolvedValue(true) }));

const lyrics = () => screen.getByTestId('maker-lyrics').textContent ?? '';

describe('/lyrics/maker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    window.history.replaceState({}, '', '/lyrics/maker');
  });

  it('opens with the occasion a topic page asked for', () => {
    window.history.replaceState({}, '', '/lyrics/maker?for=wedding');
    render(<LyricsMakerPage />);
    expect(screen.getByRole('button', { name: '결혼 축가' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('신부 이름')).toBeInTheDocument();
  });

  it('fills the lyrics as the visitor types and copies them with the title', async () => {
    render(<LyricsMakerPage />);
    expect(lyrics()).toContain('친구야 생일 축하해');

    fireEvent.change(screen.getByLabelText('받는 사람 이름'), { target: { value: '지민' } });
    fireEvent.change(screen.getByLabelText(/함께한 추억의 장소/), { target: { value: '한강' } });
    fireEvent.click(screen.getByRole('button', { name: '가을' }));
    expect(lyrics()).toContain('한강에서 함께 웃던 날\n낙엽 밟는 소리마저 좋던 날');
    expect(lyrics()).toContain('지민아 생일 축하해');
    expect(screen.getByRole('button', { name: '가을' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: '가사 복사하기' }));
    expect(await screen.findByRole('button', { name: '가사를 복사했어요' })).toBeInTheDocument();
    expect((copyText as jest.Mock).mock.calls[0][0]).toMatch(/^지민의 날\n\n\[Verse 1\]/);
    // The event carries the choices only, never the name or place typed in.
    expect(trackEvent).toHaveBeenCalledWith('maker_copied', { what: 'lyrics', occasion: 'birthday', mood: 'bright' });
    expect(JSON.stringify((trackEvent as jest.Mock).mock.calls)).not.toMatch(/지민|한강/);
  });

  it('switches the fields for parents and weddings', () => {
    render(<LyricsMakerPage />);
    fireEvent.click(screen.getByRole('button', { name: '부모님께 감사' }));
    expect(screen.queryByLabelText('받는 사람 이름')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '아빠' }));
    expect(lyrics()).toContain('사랑해요 나의 아빠');

    fireEvent.click(screen.getByRole('button', { name: '결혼 축가' }));
    fireEvent.change(screen.getByLabelText('신랑 이름'), { target: { value: '민준' } });
    fireEvent.change(screen.getByLabelText('신부 이름'), { target: { value: '서연' } });
    fireEvent.click(screen.getByRole('button', { name: '잔잔하게' }));
    expect(lyrics()).toContain('민준과 서연 결혼 축하해요');
    expect(screen.getByTestId('maker-style')).toHaveTextContent('romantic piano ballad');
  });

  it('hands the lyrics to the checker and the details to Dayeon', () => {
    render(<LyricsMakerPage />);
    fireEvent.change(screen.getByLabelText('받는 사람 이름'), { target: { value: '수아' } });
    fireEvent.click(screen.getByRole('link', { name: '가창성 검사하기' }));
    expect(JSON.parse(window.localStorage.getItem('novasinger.lyricsDraft') ?? '{}').text).toContain('수아야 생일 축하해');

    const href = screen.getByRole('link', { name: '다연에게 새 가사 받기' }).getAttribute('href') ?? '';
    expect(href.startsWith('/try?from=maker&prompt=')).toBe(true);
    expect(decodeURIComponent(href.split('prompt=')[1])).toContain('수아의 생일 축하 노래 가사를 새로 써 줘.');
  });
});
