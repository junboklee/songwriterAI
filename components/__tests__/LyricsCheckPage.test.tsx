import { fireEvent, render, screen } from '@testing-library/react';

import LyricsCheckPage from '@/pages/lyrics/check';

jest.mock('next/head', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>
}));
jest.mock('@/context/I18nContext', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('lyrics checker page', () => {
  it('counts syllables and links each flagged line to a prefilled trial chat', () => {
    render(<LyricsCheckPage />);
    fireEvent.change(screen.getByLabelText('검사할 가사'), {
      target: { value: '[Verse]\n아침 7시 알람 소리\n눈을 뜨면 햇살 가득\n창문 열고 숨을 쉬어' }
    });

    expect(screen.getByText(/3줄 · 확인할 곳 1개/)).toBeInTheDocument();
    expect(screen.getByText('singability.digits')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: '다연에게 고쳐 달라고 하기' });
    const href = link.getAttribute('href') ?? '';
    expect(href.startsWith('/try?from=checker&prompt=')).toBe(true);
    const prompt = decodeURIComponent(href.split('prompt=')[1]);
    expect(prompt).toContain('"아침 7시 알람 소리"');
    expect(prompt).toContain('singabilityRequest.digits');
    expect(prompt.length).toBeLessThanOrEqual(500);
  });

  it('fills in the example and reports what it finds', () => {
    render(<LyricsCheckPage />);
    fireEvent.click(screen.getByRole('button', { name: '예시 가사 넣기' }));
    expect(screen.getAllByRole('link', { name: '다연에게 고쳐 달라고 하기' }).length).toBeGreaterThanOrEqual(4);
  });
});
