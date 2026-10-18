import { fireEvent, render, screen } from '@testing-library/react';

import { CrisisHelpBanner } from '@/components/chat/CrisisHelpBanner';
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
  it('keeps every sign-up button disabled until the user confirms being 14 or older', () => {
    render(<RegisterPage />);
    const buttons = [
      screen.getByRole('button', { name: /googleContinue/ }),
      screen.getByRole('button', { name: /appleContinue/ }),
      screen.getByRole('button', { name: 'emailContinue' })
    ];
    buttons.forEach(button => expect(button).toBeDisabled());

    fireEvent.click(screen.getByLabelText('만 14세 이상입니다 (필수)'));
    buttons.forEach(button => expect(button).toBeEnabled());
  });
});

describe('safety policy page', () => {
  it('documents the crisis protocol and banned characters', () => {
    render(<SafetyPage />);
    expect(screen.getByRole('heading', { name: '1. 위기 상황 대응' })).toBeInTheDocument();
    expect(screen.getByText(/실존 인물\(가수, 연예인, 공인, 주변 사람\)을 사칭/)).toBeInTheDocument();
  });
});
