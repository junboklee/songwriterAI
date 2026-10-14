// Operator details shown in /terms and /privacy (source: 사업자등록증, 2023-04-27 발급).
// The privacy policy must name a reachable privacy officer (개인정보 보호법 제30조, 제31조).

export const LEGAL_PLACEHOLDER = '[작성 필요]';

export const OPERATOR = {
  serviceName: 'NovaSingerAI',
  companyName: '주식회사 콜드브러시',
  representative: '이준복',
  businessNumber: '699-88-00924',
  address: '경기도 성남시 분당구 대왕판교로645번길 12, 9층 에스39호(삼평동, 경기창조경제혁신센터)',
  contactEmail: 'screechaicreator@gmail.com',
  privacyOfficer: {
    name: '이준복',
    title: '대표이사',
    email: 'screechaicreator@gmail.com'
  }
};

// Effective dates of the current versions (YYYY-MM-DD).
export const TERMS_EFFECTIVE_DATE = '2026-10-14';
export const PRIVACY_EFFECTIVE_DATE = '2026-10-14';

export const hasUnfilledLegalInfo = () =>
  JSON.stringify(OPERATOR).includes(LEGAL_PLACEHOLDER);
