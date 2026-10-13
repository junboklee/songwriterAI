// Operator details shown in /terms and /privacy. Fill in every '[작성 필요]' value before publishing:
// the privacy policy must name a reachable privacy officer (개인정보 보호법 제30조, 제31조).

export const LEGAL_PLACEHOLDER = '[작성 필요]';

export const OPERATOR = {
  serviceName: 'NovaSingerAI',
  companyName: LEGAL_PLACEHOLDER,
  representative: LEGAL_PLACEHOLDER,
  businessNumber: LEGAL_PLACEHOLDER,
  address: LEGAL_PLACEHOLDER,
  contactEmail: LEGAL_PLACEHOLDER,
  privacyOfficer: {
    name: LEGAL_PLACEHOLDER,
    title: LEGAL_PLACEHOLDER,
    email: LEGAL_PLACEHOLDER
  }
};

// Effective dates of the current versions (YYYY-MM-DD).
export const TERMS_EFFECTIVE_DATE = '2026-10-13';
export const PRIVACY_EFFECTIVE_DATE = '2026-10-13';

export const hasUnfilledLegalInfo = () =>
  JSON.stringify(OPERATOR).includes(LEGAL_PLACEHOLDER);
