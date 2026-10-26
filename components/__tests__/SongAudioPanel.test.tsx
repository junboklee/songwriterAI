import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { SongAudioPanel } from '@/components/SongAudioPanel';
import { I18nProvider } from '@/context/I18nContext';

jest.mock('@/lib/analytics', () => ({ trackEvent: jest.fn() }));
const mockPortone = { available: true, request: jest.fn(), confirm: jest.fn() };
jest.mock('@/lib/portone', () => ({
  identityVerificationAvailable: () => mockPortone.available,
  requestIdentityVerification: (...args: unknown[]) => mockPortone.request(...args),
  confirmIdentityOnServer: (...args: unknown[]) => mockPortone.confirm(...args)
}));

const withI18n = (node: React.ReactNode) => <I18nProvider initialLocale="ko">{node}</I18nProvider>;
const getIdToken = jest.fn().mockResolvedValue('token');
const json = (payload: unknown, ok = true) => ({ ok, json: async () => payload, blob: async () => new Blob(['x']) });

beforeAll(() => {
  URL.createObjectURL = jest.fn(() => 'blob:audio');
  URL.revokeObjectURL = jest.fn();
});

describe('SongAudioPanel', () => {
  it('stays hidden for members who cannot generate and have no audio', async () => {
    const fetchMock = jest.fn().mockResolvedValue(json({ access: 'closed', canGenerate: false, items: [] }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const { container } = render(withI18n(<SongAudioPanel songId="s1" getIdToken={getIdToken} dirty={false} />));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('lets admins make a preview and plays it, labelled as AI voice', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(json({ access: 'unlimited', canGenerate: true, items: [] }))
      .mockResolvedValueOnce(json({ item: { id: 'a1', length: 'clip', createdAt: null } }))
      .mockResolvedValueOnce(json({}));
    global.fetch = fetchMock as unknown as typeof fetch;
    render(withI18n(<SongAudioPanel songId="s1" getIdToken={getIdToken} dirty={false} />));

    fireEvent.click(await screen.findByRole('button', { name: '30초 미리듣기 만들기' }));

    await waitFor(() => expect(document.querySelector('audio')).not.toBeNull());
    expect(fetchMock.mock.calls[1][0]).toBe('/api/profile/songs/s1/audio');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ length: 'clip' });
    expect(fetchMock.mock.calls[2][0]).toBe('/api/profile/songs/s1/audio/a1');
    expect(screen.getByText('AI 생성 음성')).toBeInTheDocument();
  });

  it('asks to save first when the lyrics have unsaved edits', async () => {
    global.fetch = jest.fn().mockResolvedValue(json({ access: 'unlimited', canGenerate: true, items: [] })) as unknown as typeof fetch;
    render(withI18n(<SongAudioPanel songId="s1" getIdToken={getIdToken} dirty />));
    expect(await screen.findByRole('button', { name: '30초 미리듣기 만들기' })).toBeDisabled();
    expect(screen.getByText(/먼저 "새 버전으로 저장"을 눌러 주세요/)).toBeInTheDocument();
  });
  it('asks members to verify their identity, then offers the free preview only', async () => {
    mockPortone.request.mockResolvedValue({ ok: true, identityVerificationId: 'iv-u1-abc123' });
    mockPortone.confirm.mockResolvedValue({ ok: true });
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(json({ access: 'needsIdentity', canGenerate: false, items: [] }))
      .mockResolvedValueOnce(json({ access: 'free', canGenerate: true, items: [] }));
    global.fetch = fetchMock as unknown as typeof fetch;
    render(withI18n(<SongAudioPanel songId="s1" getIdToken={getIdToken} dirty={false} />));

    fireEvent.click(await screen.findByRole('button', { name: '본인인증하고 무료로 들어 보기' }));

    expect(await screen.findByRole('button', { name: '30초 미리듣기 만들기' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: '전체 곡 만들기' })).toBeNull();
    expect(mockPortone.request).toHaveBeenCalledWith(getIdToken, expect.stringContaining('/verify/identity'));
    expect(mockPortone.confirm).toHaveBeenCalledWith(getIdToken, 'iv-u1-abc123');
  });

  it('tells members when the free preview is used up', async () => {
    global.fetch = jest.fn().mockResolvedValue(json({ access: 'freeUsed', canGenerate: false, items: [] })) as unknown as typeof fetch;
    render(withI18n(<SongAudioPanel songId="s1" getIdToken={getIdToken} dirty={false} />));
    expect(await screen.findByText(/무료 미리듣기를 사용했어요/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '30초 미리듣기 만들기' })).toBeNull();
  });
});
