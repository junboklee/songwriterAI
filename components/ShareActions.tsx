import { useEffect, useState } from 'react';

import { trackEvent } from '@/lib/analytics';
import { copyText } from '@/lib/clipboard';
import { KAKAO_JS_KEY, shareToKakao } from '@/lib/kakaoShare';

type ShareActionsProps = {
  shareId: string;
  url: string;
  title: string;
  description: string;
};

type Status = 'idle' | 'copied' | 'saved' | 'failed';

// Ways to pass a shared song on: the device share sheet (KakaoTalk, Instagram… on phones),
// KakaoTalk feed card (when configured), a 9:16 story image, and plain link copy.
export function ShareActions({ shareId, url, title, description }: ShareActionsProps) {
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const storyImageUrl = `/api/og/song/${encodeURIComponent(shareId)}?format=story`;

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  useEffect(() => {
    if (status === 'idle') {
      return undefined;
    }
    const timer = window.setTimeout(() => setStatus('idle'), 2500);
    return () => window.clearTimeout(timer);
  }, [status]);

  const nativeShare = async () => {
    try {
      await navigator.share({ title, text: description, url });
      trackEvent('share_action', { method: 'native' });
    } catch {
      // The user closed the share sheet; nothing to report.
    }
  };

  const kakaoShare = async () => {
    try {
      await shareToKakao({
        title,
        description,
        imageUrl: `${new URL(url).origin}/api/og/song/${encodeURIComponent(shareId)}`,
        url,
        buttonTitle: '가사 보기'
      });
      trackEvent('share_action', { method: 'kakao' });
    } catch {
      setStatus('failed');
    }
  };

  const copyLink = async () => {
    const ok = await copyText(url);
    setStatus(ok ? 'copied' : 'failed');
    if (ok) {
      trackEvent('share_action', { method: 'link' });
    }
  };

  // Phones get the image straight into the share sheet (e.g. to an Instagram story);
  // elsewhere it downloads.
  const storyImage = async () => {
    try {
      const response = await fetch(storyImageUrl);
      if (!response.ok) {
        throw new Error(`story image ${response.status}`);
      }
      const file = new File([await response.blob()], 'novasinger-story.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title });
      } else {
        const href = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = href;
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(href);
        setStatus('saved');
      }
      trackEvent('share_action', { method: 'story_image' });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setStatus('failed');
      }
    }
  };

  return (
    <div className="share-actions">
      {canNativeShare ? (
        <button type="button" className="btn btn--primary" onClick={() => void nativeShare()}>
          공유하기
        </button>
      ) : null}
      {KAKAO_JS_KEY ? (
        <button type="button" className="btn btn--ghost share-actions__kakao" onClick={() => void kakaoShare()}>
          카카오톡 공유
        </button>
      ) : null}
      <button type="button" className="btn btn--ghost" onClick={() => void storyImage()}>
        스토리용 이미지
      </button>
      <button type="button" className="btn btn--ghost" onClick={() => void copyLink()}>
        {status === 'copied' ? '링크 복사됨 ✓' : '링크 복사'}
      </button>
      {status === 'saved' ? <span className="share-actions__status">이미지를 저장했어요.</span> : null}
      {status === 'failed' ? <span className="share-actions__status">공유하지 못했어요. 다시 시도해 주세요.</span> : null}
    </div>
  );
}
