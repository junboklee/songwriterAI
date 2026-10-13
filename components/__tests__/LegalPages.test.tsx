import { render, screen } from '@testing-library/react';

import PrivacyPage from '@/pages/privacy';
import TermsPage from '@/pages/terms';

jest.mock('next/head', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

describe('legal pages', () => {
  it('privacy policy lists the overseas processors actually used', () => {
    render(<PrivacyPage />);
    expect(screen.getByRole('heading', { level: 1, name: '개인정보처리방침' })).toBeTruthy();
    expect(screen.getByText(/OpenAI, L\.L\.C\./)).toBeTruthy();
    expect(screen.getByText(/Google LLC/)).toBeTruthy();
    expect(screen.getByText(/만 14세 미만 아동의 회원가입/)).toBeTruthy();
  });

  it('terms include the AI-generated content notice linked from the chat page', () => {
    const { container } = render(<TermsPage />);
    expect(screen.getByRole('heading', { level: 1, name: '이용약관' })).toBeTruthy();
    expect(container.querySelector('#ai')?.textContent).toContain('AI 생성물');
  });
});
