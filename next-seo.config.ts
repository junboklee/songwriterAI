const title = 'SongwriterAI';
const description =
  'AI 작사가와 실시간으로 대화하며 가사를 쓰고 버전을 관리할 수 있는 SongwriterAI 플랫폼';
const url = 'https://www.novasingerai.com';

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
