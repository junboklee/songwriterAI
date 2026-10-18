// KakaoTalk feed sharing through the Kakao JavaScript SDK. Enabled only when
// NEXT_PUBLIC_KAKAO_JS_KEY is set and the site domain is registered for that app
// (Kakao Developers > 앱 > 플랫폼 > Web 사이트 도메인).

const SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';

type KakaoSdk = {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share: { sendDefault: (options: Record<string, unknown>) => void };
};

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

export const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? '';

let loading: Promise<KakaoSdk> | null = null;

function loadSdk(): Promise<KakaoSdk> {
  if (window.Kakao) {
    return Promise.resolve(window.Kakao);
  }
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => (window.Kakao ? resolve(window.Kakao) : reject(new Error('Kakao SDK missing')));
    script.onerror = () => {
      loading = null;
      reject(new Error('Kakao SDK failed to load'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export type KakaoShareContent = {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
  buttonTitle: string;
};

export async function shareToKakao(content: KakaoShareContent) {
  if (!KAKAO_JS_KEY) {
    throw new Error('Kakao sharing is not configured.');
  }
  const kakao = await loadSdk();
  if (!kakao.isInitialized()) {
    kakao.init(KAKAO_JS_KEY);
  }
  const link = { mobileWebUrl: content.url, webUrl: content.url };
  kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: content.title,
      description: content.description,
      imageUrl: content.imageUrl,
      imageWidth: 1200,
      imageHeight: 630,
      link
    },
    buttons: [{ title: content.buttonTitle, link }]
  });
}
