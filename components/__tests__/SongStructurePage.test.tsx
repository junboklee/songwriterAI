import { fireEvent, render, screen, within } from '@testing-library/react';

import SongStructurePage from '@/pages/lyrics/structure';

jest.mock('next/head', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>
}));

describe('song structure page', () => {
  it('builds tagged lyrics and hands the layout to the trial chat', () => {
    render(<SongStructurePage />);
    fireEvent.click(screen.getByRole('button', { name: '생일 노래 (1분)' }));
    fireEvent.change(screen.getByLabelText('Verse 가사'), { target: { value: '촛불 하나 켜고\n소원을 빌어' } });
    fireEvent.change(screen.getByLabelText('Chorus 가사'), { target: { value: '생일 축하해' } });
    expect(screen.getByText('줄마다 음절 수: 6 · 5')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '+ 후렴' }));
    const repeat = within(screen.getAllByRole('listitem', { name: 'Chorus 구간' })[1]);
    expect(repeat.getByRole('checkbox', { name: '앞 후렴과 같은 가사' })).toBeChecked();
    expect(screen.getByTestId('structure-output').textContent).toBe(
      '[Intro]\n\n[Verse]\n촛불 하나 켜고\n소원을 빌어\n\n[Chorus]\n생일 축하해\n\n[Outro]\n\n[Chorus]\n생일 축하해'
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Outro 아래로' })[0]);
    expect(screen.getByTestId('structure-output').textContent?.endsWith('[Outro]')).toBe(true);

    fireEvent.change(screen.getByLabelText('이 구조로 가사를 받아 볼까요?'), { target: { value: '엄마 생신' } });
    const href = screen.getByRole('link', { name: '다연에게 가사 받기' }).getAttribute('href') ?? '';
    expect(href.startsWith('/try?from=structure&prompt=')).toBe(true);
    const prompt = decodeURIComponent(href.split('prompt=')[1]);
    expect(prompt).toContain('구조: Intro → Verse (4줄) → Chorus (4줄) → Chorus (반복) → Outro (2줄)');
    expect(prompt).toContain('노래 이야기: 엄마 생신');
  });

  it('removes sections and clears written lines', () => {
    render(<SongStructurePage />);
    fireEvent.change(screen.getByLabelText('Bridge 가사'), { target: { value: '다른 장면' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bridge 삭제' }));
    expect(screen.getByTestId('structure-output').textContent).not.toContain('Bridge');
    fireEvent.change(screen.getByLabelText('Verse 1 가사'), { target: { value: '첫 줄' } });
    fireEvent.click(screen.getByRole('button', { name: '가사 지우기' }));
    expect(screen.getByLabelText('Verse 1 가사')).toHaveValue('');
  });
});
