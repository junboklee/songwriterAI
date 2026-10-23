import { render, screen } from '@testing-library/react';

import { hasUnfilledLegalInfo } from '@/lib/legal';
import PrivacyPage from '@/pages/privacy';
import TermsPage from '@/pages/terms';

jest.mock('next/head', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

describe('legal pages', () => {
  it('privacy policy lists the overseas processors actually used', () => {
    render(<PrivacyPage />);
    expect(screen.getByRole('heading', { level: 1, name: '개인정보처리방침' })).toBeTruthy();
    expect(screen.getByText(/OpenAI, L\.L\.C\./)).toBeTruthy();
    expect(screen.getByText(/Google LLC/)).toBeTruthy();
    expect(screen.getByText(/만 19세 미만\(만 14세 미만 아동 포함\)의 회원가입을 받지 않습니다/)).toBeTruthy();
    expect(screen.getByText(/저장하지 않음/)).toBeTruthy();
  });

  it('terms include the AI-generated content notice linked from the chat page', () => {
    const { container } = render(<TermsPage />);
    expect(screen.getByRole('heading', { level: 1, name: '이용약관' })).toBeTruthy();
    expect(container.querySelector('#ai')?.textContent).toContain('AI 생성물');
  });

  it('terms set the adult age and give existing members until the deadline', () => {
    render(<TermsPage />);
    expect(screen.getByText(/만 19세 이상\(생년월일로 계산한 만 나이\)/)).toBeTruthy();
    expect(screen.getByText(/2026-11-23부터 적용합니다/)).toBeTruthy();
  });
});

describe('operator details', () => {
  it('has no unfilled placeholders before publishing', () => {
    expect(hasUnfilledLegalInfo()).toBe(false);
  });
});
