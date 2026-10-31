import { fireEvent, render, screen, within } from '@testing-library/react';

import RhymeFinderPage from '@/pages/lyrics/rhyme';

jest.mock('next/head', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>
}));

describe('rhyme finder page', () => {
  it('finds rhymes, collects picks and hands them to the trial chat', () => {
    render(<RhymeFinderPage />);
    fireEvent.change(screen.getByLabelText('라임을 찾을 단어'), { target: { value: '사랑' } });

    const twoSyllable = screen.getByRole('region', { name: '끝 두 글자 라임' });
    fireEvent.click(within(twoSyllable).getByRole('button', { name: '마당' }));
    fireEvent.click(within(twoSyllable).getByRole('button', { name: '사탕' }));
    expect(within(twoSyllable).getByRole('button', { name: '마당' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('rhyme-picks')).toHaveTextContent('마당, 사탕');

    const href = screen.getByRole('link', { name: '다연에게 가사 받기' }).getAttribute('href') ?? '';
    expect(href.startsWith('/try?from=rhyme&prompt=')).toBe(true);
    const prompt = decodeURIComponent(href.split('prompt=')[1]);
    expect(prompt).toContain('"사랑"');
    expect(prompt).toContain('넣을 단어: 마당, 사탕');

    fireEvent.click(screen.getByRole('button', { name: '비우기' }));
    expect(screen.queryByTestId('rhyme-picks')).toBeNull();
  });

  it('caps the long one-syllable group until asked for more', () => {
    render(<RhymeFinderPage />);
    fireEvent.click(screen.getByRole('button', { name: '사랑' }));
    const oneSyllable = screen.getByRole('region', { name: '끝 글자 라임' });
    const before = within(oneSyllable).getAllByRole('button').length;
    fireEvent.click(within(oneSyllable).getByRole('button', { name: /개 더 보기$/ }));
    expect(within(screen.getByRole('region', { name: '끝 글자 라임' })).getAllByRole('button').length).toBeGreaterThan(before);
  });

  it('asks for Hangul when the query has none', () => {
    render(<RhymeFinderPage />);
    fireEvent.change(screen.getByLabelText('라임을 찾을 단어'), { target: { value: 'love' } });
    expect(screen.getByText('한글 단어를 넣어 주세요.')).toBeInTheDocument();
  });
});
