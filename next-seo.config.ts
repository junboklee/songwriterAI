const title = 'NovaSingerAI';
const description =
  'AI 싱어송라이터 캐릭터와 대화하며 오늘의 이야기를 노래 가사로 만들고, Suno 같은 AI 음악 도구에 바로 쓸 수 있게 다듬는 서비스입니다.';
const siteUrl = 'https://novasingerai.com';

const config = {
  defaultTitle: title,
  titleTemplate: '%s | NovaSingerAI',
  description,
  siteUrl,
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: title,
    description
  },
  twitter: {
    cardType: 'summary_large_image'
  }
};

export default config;
