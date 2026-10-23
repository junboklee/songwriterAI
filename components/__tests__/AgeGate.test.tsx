import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AgeGate, AgeNoticeBanner } from '@/components/AgeGate';
import { I18nProvider } from '@/context/I18nContext';
import { confirmAge } from '@/lib/ageClient';
import { authedJson } from '@/lib/authedFetch';

const mockRefreshAgeGate = jest.fn().mockResolvedValue(undefined);
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, refreshAgeGate: mockRefreshAgeGate })
}));
jest.mock('@/lib/ageClient', () => ({ confirmAge: jest.fn() }));
jest.mock('@/lib/authedFetch', () => ({ authedJson: jest.fn().mockResolvedValue({ success: true }) }));
jest.mock('@/lib/firebase', () => ({ auth: {} }));
jest.mock('firebase/auth', () => ({ signOut: jest.fn().mockResolvedValue(undefined) }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>
}));

const withI18n = (node: React.ReactNode) => <I18nProvider initialLocale="ko">{node}</I18nProvider>;
const enterBirth = (value: string) => {
  fireEvent.change(screen.getByPlaceholderText('예: 19950315'), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: '확인' }));
};

describe('AgeGate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('confirms an adult and reloads the account state', async () => {
    (confirmAge as jest.Mock).mockResolvedValue({ ok: true });
    render(withI18n(<AgeGate />));

    enterBirth('19900115');

    // The page then reloads (jsdom cannot navigate, so only the claim refresh is checked).
    await waitFor(() => expect(mockRefreshAgeGate).toHaveBeenCalled());
    expect(confirmAge).toHaveBeenCalledWith({ uid: 'u1' }, '19900115', expect.any(String));
  });

  it('explains the limit to minors and lets them delete their account after confirming', async () => {
    (confirmAge as jest.Mock).mockResolvedValue({ ok: false, underAge: true, message: '' });
    render(withI18n(<AgeGate />));

    enterBirth('20120101');
    expect(await screen.findByRole('heading', { name: '만 19세부터 이용할 수 있어요' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '계정 삭제' }));
    expect(authedJson).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    await waitFor(() =>
      expect(authedJson).toHaveBeenCalledWith({ uid: 'u1' }, '/api/profile/delete-account', expect.any(String), {
        method: 'DELETE'
      })
    );
  });

  it('shows server errors in the form', async () => {
    (confirmAge as jest.Mock).mockResolvedValue({ ok: false, underAge: false, message: '생년월일 8자리를 정확히 입력해 주세요.' });
    render(withI18n(<AgeGate />));
    enterBirth('19901301');
    expect(await screen.findByText('생년월일 8자리를 정확히 입력해 주세요.')).toBeInTheDocument();
  });
});

describe('AgeNoticeBanner', () => {
  it('announces the deadline and confirms without reloading the page', async () => {
    (confirmAge as jest.Mock).mockResolvedValue({ ok: true });
    render(withI18n(<AgeNoticeBanner />));
    expect(screen.getByText(/2026-11-23부터 NovaSingerAI는 만 19세 이상만/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '생년월일 확인하기' }));
    enterBirth('19900115');
    await waitFor(() => expect(mockRefreshAgeGate).toHaveBeenCalled());
  });
});
