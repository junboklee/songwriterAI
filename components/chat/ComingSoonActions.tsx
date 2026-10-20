import { useState } from 'react';

import { trackEvent } from '@/lib/analytics';

type Feature = 'sing' | 'gift';

const FEATURES: Array<{ id: Feature; label: string }> = [
  { id: 'sing', label: '🎤 다연이 불러 주기' },
  { id: 'gift', label: '🎁 선물로 보내기' }
];

// "Coming soon" buttons under finished lyrics. A click records interest (no payment, no
// notification promise) so we can see which paid feature people want before building it.
export function ComingSoonActions() {
  const [picked, setPicked] = useState<Feature | null>(null);

  const register = async (feature: Feature) => {
    setPicked(feature);
    trackEvent('feature_interest', { feature });
    try {
      // Loaded on click so this component stays light where it is rendered.
      const { auth } = await import('@/lib/firebase');
      const idToken = await auth.currentUser?.getIdToken();
      if (idToken) {
        await fetch('/api/interest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ feature })
        });
      }
    } catch {
      // Interest counting must never get in the way of the chat.
    }
  };

  return (
    <div className="coming-soon">
      {FEATURES.map(item => (
        <button
          key={item.id}
          type="button"
          className="coming-soon__button"
          onClick={() => void register(item.id)}
          aria-pressed={picked === item.id}
        >
          {item.label} <span className="coming-soon__badge">준비 중</span>
        </button>
      ))}
      {picked ? (
        <p className="coming-soon__thanks" role="status">
          {picked === 'sing'
            ? '다연이 직접 불러 주는 기능을 준비하고 있어요. 관심 보내 주셔서 고마워요!'
            : '노래를 선물로 보내는 기능을 준비하고 있어요. 관심 보내 주셔서 고마워요!'}
        </p>
      ) : null}
    </div>
  );
}
