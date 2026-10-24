import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createUserWithEmailAndPassword } from 'firebase/auth';

import { CrisisHelpBanner } from '@/components/chat/CrisisHelpBanner';
import { confirmAge } from '@/lib/ageClient';
import RegisterPage from '@/pages/auth/register';
import SafetyPage from '@/pages/safety';

jest.mock('next/head', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>
}));
jest.mock('next/image', () => ({ __esModule: true, default: () => null }));
jest.mock('next/router', () => ({ useRouter: () => ({ query: {}, push: jest.fn() }) }));
jest.mock('@/lib/firebase', () => ({ auth: {}, provider: {}, appleProvider: {} }));
jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithPopup: jest.fn(),
  updateProfile: jest.fn()
}));
jest.mock('@/lib/analyticsAuth', () => ({ trackAuth: jest.fn() }));
jest.mock('@/lib/ageClient', () => ({ confirmAge: jest.fn().mockResolvedValue({ ok: true }) }));
const mockRefreshAgeGate = jest.fn().mockResolvedValue(undefined);
jest.mock('@/context/AuthContext', () => ({ useAuth: () => ({ refreshAgeGate: mockRefreshAgeGate }) }));
jest.mock('@/context/I18nContext', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('CrisisHelpBanner', () => {
  it('lists the Korean crisis lines as tappable numbers', () => {
    const onClose = jest.fn();
    render(<CrisisHelpBanner onClose={onClose} />);
    expect(screen.getByRole('link', { name: '109' })).toHaveAttribute('href', 'tel:109');
    expect(screen.getByRole('link', { name: '1577-0199' })).toHaveAttribute('href', 'tel:1577-0199');
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('sign-up age check', () => {
  const buttons = () => [
    screen.getByRole('button', { name: /googleContinue/ }),
    screen.getByRole('button', { name: /appleContinue/ }),
    screen.getByRole('button', { name: 'emailContinue' })
  ];
  const birthInput = () => screen.getByPlaceholderText('birthPlaceholder');

  it('keeps every sign-up button disabled until an adult birth date is entered', () => {
    render(<RegisterPage />);
    buttons().forEach(button => expect(button).toBeDisabled());

    fireEvent.change(birthInput(), { target: { value: `${new Date().getFullYear() - 10}0101` } });
    expect(screen.getByText('underAge')).toBeInTheDocument();
    buttons().forEach(button => expect(button).toBeDisabled());

    fireEvent.change(birthInput(), { target: { value: '19990231' } });
    expect(screen.getByText('birthInvalid')).toBeInTheDocument();

    fireEvent.change(birthInput(), { target: { value: '19900115' } });
    buttons().forEach(button => expect(button).toBeEnabled());
  });

  it('records the confirmation on the new account', async () => {
    const user = { uid: 'u1' };
    (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({ user });
    render(<RegisterPage />);
    fireEvent.change(birthInput(), { target: { value: '1990-01-15' } });
    fireEvent.change(screen.getByLabelText('emailLabel'), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText('passwordLabel', { exact: false }), { target: { value: 'secret12' } });
    fireEvent.click(screen.getByRole('button', { name: 'emailContinue' }));

    await waitFor(() => expect(confirmAge).toHaveBeenCalledWith(user, '1990-01-15', ''));
    expect(mockRefreshAgeGate).toHaveBeenCalled();
  });

  it('saves lyrics written in the no-signup trial to the new library', async () => {
    const user = { uid: 'u1', getIdToken: jest.fn().mockResolvedValue('token') };
    (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({ user });
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;
    window.localStorage.setItem(
      'novasinger.trialLyrics',
      JSON.stringify({ title: '너의 봄', body: '[Verse]\n봄날 같은 너', style: 'ballad', savedAt: Date.now() })
    );
    render(<RegisterPage />);
    fireEvent.change(birthInput(), { target: { value: '19900115' } });
    fireEvent.change(screen.getByLabelText('emailLabel'), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText('passwordLabel', { exact: false }), { target: { value: 'secret12' } });
    fireEvent.click(screen.getByRole('button', { name: 'emailContinue' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/profile/songs');
    expect(JSON.parse(init.body)).toEqual({
      title: '너의 봄',
      lyrics: '[Verse]\n봄날 같은 너',
      characterId: '1',
      metadata: { source: 'trial', style: 'ballad' }
    });
    expect(window.localStorage.getItem('novasinger.trialLyrics')).toBeNull();
  });
});

describe('safety policy page', () => {
  it('documents the crisis protocol and banned characters', () => {
    render(<SafetyPage />);
    expect(screen.getByRole('heading', { name: '1. 위기 상황 대응' })).toBeInTheDocument();
    expect(screen.getByText(/실존 인물\(가수, 연예인, 공인, 주변 사람\)을 사칭/)).toBeInTheDocument();
  });
});
