import { useCallback, useEffect, useRef, useState } from 'react';

import type { ChatReply } from '@/hooks/useChatSession';
import { trackEvent } from '@/lib/analytics';
import { buildAutoSaveLyricsPayload } from '@/lib/autoSaveLyrics';
import { isLikelyLyrics } from '@/lib/chat/model';
import { extractLyrics } from '@/lib/lyricsFormat';

const STORAGE_KEY = 'songwriter:autoSaveLyrics';

const readStored = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

// "가사 자동 저장" toggle (remembered per browser) and saving lyrics found in assistant replies.
export function useLyricsAutoSave(threadId: string | null, characterId: string) {
  const [enabled, setEnabled] = useState(true);
  const lastSavedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (readStored() === 'off') {
      setEnabled(false);
    }
  }, []);

  useEffect(() => {
    lastSavedIdRef.current = null;
  }, [threadId, characterId]);

  const toggle = useCallback(() => {
    setEnabled(prev => {
      try {
        window.localStorage.setItem(STORAGE_KEY, prev ? 'off' : 'on');
      } catch {
        // Storage can be unavailable (private mode); the toggle still works for this visit.
      }
      return !prev;
    });
  }, []);

  const handleReply = useCallback(
    (reply: ChatReply) => {
      const { content, id } = reply.message;
      const parsed = extractLyrics(content);
      if (parsed) {
        trackEvent('lyrics_generated', { has_style: Boolean(parsed.style) });
      }
      if (!enabled || !(parsed || isLikelyLyrics(content)) || lastSavedIdRef.current === id) {
        return;
      }
      lastSavedIdRef.current = id ?? `lyrics-${Date.now()}`;

      const payload = buildAutoSaveLyricsPayload({
        lyrics: parsed?.body ?? content,
        title: parsed?.title ?? null,
        style: parsed?.style ?? null,
        threadId: reply.threadId,
        characterId: reply.characterId,
        characterName: reply.characterName,
        timestamp: new Date()
      });
      if (!payload) {
        return;
      }

      fetch('/api/profile/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${reply.idToken}` },
        body: JSON.stringify(payload)
      })
        .then(async response => {
          if (response.ok) {
            const saved = (await response.json().catch(() => ({}))) as { revised?: boolean };
            trackEvent('song_saved', { source: 'auto', revised: Boolean(saved.revised) });
          }
        })
        .catch(saveError => console.error('Failed to store lyrics automatically', saveError));
    },
    [enabled]
  );

  return { enabled, toggle, handleReply };
}
