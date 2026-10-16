import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { NewSongForm } from '@/components/suno/NewSongForm';
import { SongCard, songDetails } from '@/components/suno/SongCard';
import { copyText } from '@/lib/clipboard';
import type { SongEntry } from '@/types/suno';

jest.mock('@/context/I18nContext', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@/lib/clipboard', () => ({ copyText: jest.fn() }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: { pathname: string; query: Record<string, string> } }) => (
    <a href={`${href.pathname}?${new URLSearchParams(href.query).toString()}`}>{children}</a>
  )
}));

const song: SongEntry = {
  id: 's1',
  title: '비 오는 밤',
  lyrics: '[Verse 1]\n빗소리',
  prompt: null,
  characterId: '1',
  threadId: 'thread-1',
  metadata: { source: 'auto-from-chat', characterName: 'Dayeon', style: '어쿠스틱 발라드', storedAt: '2026-10-16T00:00:00Z' },
  createdAt: '2026-10-16T00:00:00Z',
  updatedAt: null
};

describe('songDetails', () => {
  it('picks the user-facing metadata only', () => {
    expect(songDetails(song)).toEqual({ style: '어쿠스틱 발라드', characterName: 'Dayeon', fromChat: true });
    expect(songDetails({ ...song, metadata: {} })).toEqual({ style: null, characterName: null, fromChat: false });
  });
});

describe('SongCard', () => {
  it('shows the character name, style and a link to the chat instead of raw metadata', () => {
    render(<SongCard song={song} selected={false} onToggleSelect={jest.fn()} onEdit={jest.fn()} />);
    expect(screen.getByText('Dayeon')).toBeInTheDocument();
    expect(screen.getByText('어쿠스틱 발라드')).toBeInTheDocument();
    expect(screen.queryByText('storedAt')).toBeNull();
    expect(screen.queryByText(/auto-from-chat/)).toBeNull();
    expect(screen.getByRole('link', { name: 'card.openChat' })).toHaveAttribute(
      'href',
      '/chat?threadId=thread-1&characterId=1'
    );
  });

  it('copies the title and lyrics and reports a failure', async () => {
    const copyMock = copyText as jest.Mock;
    copyMock.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    render(<SongCard song={song} selected={false} onToggleSelect={jest.fn()} onEdit={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'card.copy' }));
    await screen.findByRole('button', { name: 'card.copied' });
    expect(copyMock).toHaveBeenCalledWith('비 오는 밤\n\n[Verse 1]\n빗소리');

    fireEvent.click(screen.getByRole('button', { name: 'card.copied' }));
    await screen.findByRole('button', { name: 'card.copyFailed' });
  });
});

describe('NewSongForm', () => {
  const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

  it('requires lyrics', async () => {
    const onCreate = jest.fn();
    render(<NewSongForm onCreate={onCreate} />);
    fireEvent.submit(screen.getByRole('button', { name: 'form.save' }).closest('form')!);
    expect(await screen.findByRole('status')).toHaveTextContent('form.lyricsRequired');
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('saves trimmed fields and clears the form', async () => {
    const onCreate = jest.fn().mockResolvedValue(undefined);
    render(<NewSongForm onCreate={onCreate} />);
    fill('form.titleLabel', '  새벽  ');
    fill('form.lyricsLabel', '  첫 줄  ');
    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: 'form.save' }).closest('form')!);
    });

    expect(onCreate).toHaveBeenCalledWith({ title: '새벽', prompt: null, lyrics: '첫 줄' });
    expect(screen.getByRole('status')).toHaveTextContent('form.success');
    expect(screen.getByLabelText('form.lyricsLabel')).toHaveValue('');
  });

  it('keeps the input and shows the error when saving fails', async () => {
    render(<NewSongForm onCreate={jest.fn().mockRejectedValue(new Error('저장 실패'))} />);
    fill('form.lyricsLabel', '가사');
    fireEvent.submit(screen.getByRole('button', { name: 'form.save' }).closest('form')!);

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('저장 실패'));
    expect(screen.getByLabelText('form.lyricsLabel')).toHaveValue('가사');
  });
});
