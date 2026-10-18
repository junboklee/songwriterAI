import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { SingabilityPanel } from '@/components/SingabilityPanel';
import { SongEditor } from '@/components/SongEditor';
import { I18nProvider } from '@/context/I18nContext';
import { copyText } from '@/lib/clipboard';
import type { SongEntry } from '@/types/suno';

jest.mock('@/lib/analytics', () => ({ trackEvent: jest.fn() }));
jest.mock('@/lib/clipboard', () => ({ copyText: jest.fn().mockResolvedValue(true) }));

const withI18n = (node: React.ReactNode) => <I18nProvider initialLocale="ko">{node}</I18nProvider>;

const song: SongEntry = {
  id: 's1',
  title: '봄',
  lyrics: '[Verse]\n3월의 바람이 불어\n너를 다시 생각해',
  prompt: null,
  characterId: null,
  threadId: null,
  metadata: { style: 'acoustic ballad' },
  createdAt: null,
  updatedAt: null
};

describe('SingabilityPanel', () => {
  it('explains each issue and sends a prefilled request for its line', () => {
    const onFix = jest.fn();
    render(withI18n(<SingabilityPanel lyrics={song.lyrics} onFix={onFix} />));

    expect(screen.getByText('확인할 곳 1개')).toBeInTheDocument();
    expect(screen.getByText(/2번째 줄 · 3월의 바람이 불어/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '고치기' }));
    expect(onFix).toHaveBeenCalledWith(1, '숫자를 노래로 부르기 좋게 한글로 바꿔줘.');
  });

  it('says so when nothing needs fixing', () => {
    render(withI18n(<SingabilityPanel lyrics={'[Verse]\n너를 다시 생각해'} onFix={jest.fn()} />));
    expect(screen.getByText('부르기 어려운 곳을 찾지 못했어요.')).toBeInTheDocument();
  });
});

describe('SongEditor singability flow', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ versions: [] }) }) as unknown as typeof fetch;
  });

  it('opens the line rewrite with the fix request filled in', async () => {
    render(withI18n(<SongEditor song={song} getIdToken={async () => 'token'} onClose={jest.fn()} onSaved={jest.fn()} />));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: '고치기' }));

    expect(screen.getByText('선택한 1줄 다시 쓰기')).toBeInTheDocument();
    expect(screen.getByDisplayValue('숫자를 노래로 부르기 좋게 한글로 바꿔줘.')).toBeInTheDocument();
  });

  it('copies lyrics and style separately for Suno', async () => {
    render(withI18n(<SongEditor song={song} getIdToken={async () => 'token'} onClose={jest.fn()} onSaved={jest.fn()} />));

    fireEvent.click(screen.getByRole('button', { name: 'Suno 가사 복사' }));
    await waitFor(() => expect(copyText).toHaveBeenCalledWith(song.lyrics));
    fireEvent.click(screen.getByRole('button', { name: '스타일 복사' }));
    await waitFor(() => expect(copyText).toHaveBeenCalledWith('acoustic ballad'));
  });
});
