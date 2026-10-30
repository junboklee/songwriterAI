import { fireEvent, render, screen, within } from '@testing-library/react';

import SunoStylePage from '@/pages/lyrics/style';

jest.mock('next/head', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>
}));

describe('suno style page', () => {
  it('builds the style from picks and hands it to the trial chat', () => {
    render(<SunoStylePage />);
    expect(screen.queryByRole('link', { name: '다연에게 가사 받기' })).toBeNull();

    fireEvent.click(within(screen.getByRole('region', { name: '예시로 시작하기' })).getByRole('button', { name: '트로트' }));
    expect(screen.getByTestId('style-output')).toHaveTextContent('trot, joyful, nostalgic, 115 bpm, warm male vocal');

    fireEvent.click(within(screen.getByRole('region', { name: '장르' })).getByRole('button', { name: '케이팝' }));
    expect(screen.getByTestId('style-output').textContent).toMatch(/^k-pop, /);

    fireEvent.change(screen.getByLabelText('이 스타일에 맞는 가사도 받아 볼까요?'), { target: { value: '아빠 환갑' } });
    const href = screen.getByRole('link', { name: '다연에게 가사 받기' }).getAttribute('href') ?? '';
    expect(href.startsWith('/try?from=style&prompt=')).toBe(true);
    const prompt = decodeURIComponent(href.split('prompt=')[1]);
    expect(prompt).toContain('스타일: k-pop, joyful');
    expect(prompt).toContain('노래 이야기: 아빠 환갑');
    expect(prompt.length).toBeLessThanOrEqual(500);
  });

  it('marks selected chips and resets', () => {
    render(<SunoStylePage />);
    const piano = screen.getByRole('button', { name: '피아노' });
    fireEvent.click(piano);
    expect(piano).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: '처음부터' }));
    expect(piano).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '복사하기' })).toBeDisabled();
  });
});
