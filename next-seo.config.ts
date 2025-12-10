const title = 'SongwriterAI';
const description =
  'AI 작사가와 실시간으로 협업하며 가사를 만들고 버전 관리까지 할 수 있는 SongwriterAI 플랫폼입니다.';
const url = 'https://novasingerai.com';

const config = {
  defaultTitle: title,
  titleTemplate: '%s | SongwriterAI',
  description,
  canonical: url,
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url,
    siteName: title,
    description
  },
  twitter: {
    handle: '@songwriterai',
    site: '@songwriterai',
    cardType: 'summary_large_image'
  }
};

export default config;
