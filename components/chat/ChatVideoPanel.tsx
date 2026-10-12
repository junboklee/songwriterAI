import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  CHAT_VIDEO_FALLBACKS,
  DIRECT_VIDEO_FILE_PATTERN,
  extractYouTubeVideoId,
  normaliseYouTubeEmbedUrl,
  pickRandomItem
} from '@/lib/chat/youtube';

const CHAT_VIDEO_EMBED_URL = process.env.NEXT_PUBLIC_CHAT_VIDEO_URL ?? null;

declare global {
  interface Window {
    YT?: {
      Player: new (element: HTMLElement | string, options: any) => {
        loadVideoById: (id: string) => void;
        playVideo: () => void;
        destroy: () => void;
      };
      PlayerState: {
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type ChatVideoPanelProps = {
  videoUrl: string | null;
  characterName: string;
  characterAvatar: string;
};

// Music-video side panel: plays the character's video, NEXT_PUBLIC_CHAT_VIDEO_URL, or a random
// YouTube fallback playlist, keeping the user's mute/volume choice across videos.
export function ChatVideoPanel({ videoUrl, characterName, characterAvatar }: ChatVideoPanelProps) {
  const fallbackVideoIds = useMemo(
    () =>
      CHAT_VIDEO_FALLBACKS.map(url => extractYouTubeVideoId(url)).filter(
        (id): id is string => typeof id === 'string' && id.length > 0
      ),
    []
  );
  const [activeFallbackId, setActiveFallbackId] = useState<string | null>(null);
  const [isYouTubeApiReady, setIsYouTubeApiReady] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [videoVolume, setVideoVolume] = useState(1);
  const isVideoMutedRef = useRef(isVideoMuted);
  const videoVolumeRef = useRef(videoVolume);
  const youtubePlayerRef = useRef<any>(null);
  const youtubeContainerRef = useRef<HTMLDivElement | null>(null);
  const muteMonitorRef = useRef<number | null>(null);
  const suppressMuteSyncRef = useRef(false);
  const suppressVolumeSyncRef = useRef(false);
  const suppressMuteTimeoutRef = useRef<number | null>(null);
  const suppressVolumeTimeoutRef = useRef<number | null>(null);
  const pendingPlayerSyncRef = useRef(false);
  const pendingVolumeSyncRef = useRef(false);

  const pickNextFallbackId = useCallback(
    (exclude?: string | null) => pickRandomItem(fallbackVideoIds, exclude),
    [fallbackVideoIds]
  );

  const clearMuteSuppressTimeout = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (suppressMuteTimeoutRef.current !== null) {
      window.clearTimeout(suppressMuteTimeoutRef.current);
      suppressMuteTimeoutRef.current = null;
    }
  }, []);

  const clearVolumeSuppressTimeout = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (suppressVolumeTimeoutRef.current !== null) {
      window.clearTimeout(suppressVolumeTimeoutRef.current);
      suppressVolumeTimeoutRef.current = null;
    }
  }, []);

  const applyPlayerMuteState = useCallback(
    (player: any, shouldMute: boolean) => {
      if (!player) {
        return;
      }

      if (typeof window !== 'undefined') {
        suppressMuteSyncRef.current = true;
        clearMuteSuppressTimeout();
        suppressMuteTimeoutRef.current = window.setTimeout(() => {
          suppressMuteSyncRef.current = false;
          suppressMuteTimeoutRef.current = null;
        }, 600);
      }

      if (shouldMute && typeof player.mute === 'function') {
        player.mute();
      } else if (!shouldMute && typeof player.unMute === 'function') {
        player.unMute();
      }
    },
    [clearMuteSuppressTimeout]
  );

  const applyPlayerVolumeState = useCallback(
    (player: any, volume: number) => {
      if (!player || typeof player.setVolume !== 'function') {
        return;
      }
      const clamped = Math.max(0, Math.min(1, volume));
      if (typeof window !== 'undefined') {
        suppressVolumeSyncRef.current = true;
        clearVolumeSuppressTimeout();
        suppressVolumeTimeoutRef.current = window.setTimeout(() => {
          suppressVolumeSyncRef.current = false;
          suppressVolumeTimeoutRef.current = null;
        }, 600);
      }
      player.setVolume(Math.round(clamped * 100));
    },
    [clearVolumeSuppressTimeout]
  );

  const syncMutePreferenceFromPlayer = useCallback(() => {
    const player = youtubePlayerRef.current;
    if (!player) {
      return;
    }

    if (typeof player.isMuted === 'function') {
      const nextMuted = player.isMuted();
      if (!suppressMuteSyncRef.current) {
        setIsVideoMuted(prev => {
          if (prev === nextMuted) {
            return prev;
          }
          pendingPlayerSyncRef.current = true;
          return nextMuted;
        });
      }
    }

    if (typeof player.getVolume === 'function' && !player.isMuted()) {
      const rawVolume = player.getVolume();
      if (typeof rawVolume === 'number' && !Number.isNaN(rawVolume)) {
        const normalized = Math.max(0, Math.min(1, rawVolume / 100));
        if (!suppressVolumeSyncRef.current) {
          setVideoVolume(prev => {
            if (Math.abs(prev - normalized) < 0.01) {
              return prev;
            }
            pendingVolumeSyncRef.current = true;
            return normalized;
          });
        }
      }
    }
  }, []);

  const startMuteMonitor = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (muteMonitorRef.current !== null) {
      return;
    }
    muteMonitorRef.current = window.setInterval(() => {
      syncMutePreferenceFromPlayer();
    }, 500);
  }, [syncMutePreferenceFromPlayer]);

  const stopMuteMonitor = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (muteMonitorRef.current !== null) {
      window.clearInterval(muteMonitorRef.current);
      muteMonitorRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopMuteMonitor();
      clearMuteSuppressTimeout();
      clearVolumeSuppressTimeout();
    };
  }, [stopMuteMonitor, clearMuteSuppressTimeout, clearVolumeSuppressTimeout]);

  const shouldUseFallbackPlaylist = !videoUrl && !CHAT_VIDEO_EMBED_URL && fallbackVideoIds.length > 0;

  useEffect(() => {
    isVideoMutedRef.current = isVideoMuted;
  }, [isVideoMuted]);

  useEffect(() => {
    videoVolumeRef.current = videoVolume;
  }, [videoVolume]);

  useEffect(() => {
    if (!shouldUseFallbackPlaylist) {
      setActiveFallbackId(null);
      return;
    }

    setActiveFallbackId(prev => {
      if (prev && fallbackVideoIds.includes(prev)) {
        return prev;
      }
      return pickNextFallbackId(null);
    });
  }, [shouldUseFallbackPlaylist, fallbackVideoIds, pickNextFallbackId]);

  useEffect(() => {
    if (!shouldUseFallbackPlaylist) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    if (window.YT && typeof window.YT.Player === 'function') {
      setIsYouTubeApiReady(true);
      return;
    }

    const scriptId = 'youtube-iframe-api';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.body.appendChild(script);
    }

    const handleReady = () => {
      setIsYouTubeApiReady(true);
    };

    const previous = window.onYouTubeIframeAPIReady;
    const wrapped = () => {
      previous?.();
      handleReady();
    };
    window.onYouTubeIframeAPIReady = wrapped;

    return () => {
      if (window.onYouTubeIframeAPIReady === wrapped) {
        window.onYouTubeIframeAPIReady = previous;
      }
    };
  }, [shouldUseFallbackPlaylist]);

  useEffect(() => {
    if (!shouldUseFallbackPlaylist) {
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.destroy();
        youtubePlayerRef.current = null;
      }
      stopMuteMonitor();
      return;
    }

    if (
      typeof window === 'undefined' ||
      !isYouTubeApiReady ||
      !youtubeContainerRef.current ||
      !window.YT?.Player
    ) {
      return;
    }

    if (youtubePlayerRef.current) {
      startMuteMonitor();
      return;
    }

    const initialVideoId = activeFallbackId ?? pickNextFallbackId(null);
    if (!initialVideoId) {
      return;
    }

    if (!activeFallbackId) {
      setActiveFallbackId(initialVideoId);
    }

    const player = new window.YT.Player(youtubeContainerRef.current, {
      width: '100%',
      height: '100%',
      videoId: initialVideoId,
      playerVars: {
        autoplay: 1,
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
        controls: 1,
        mute: 1
      },
      events: {
        onReady: (event: any) => {
          applyPlayerMuteState(event?.target, isVideoMutedRef.current);
          applyPlayerVolumeState(event?.target, videoVolumeRef.current);
          if (typeof event?.target?.playVideo === 'function') {
            event.target.playVideo();
          }
          syncMutePreferenceFromPlayer();
          startMuteMonitor();
        },
        onStateChange: (event: any) => {
          syncMutePreferenceFromPlayer();
          if (event?.data === window.YT?.PlayerState?.ENDED) {
            setActiveFallbackId(prev => pickNextFallbackId(prev));
          }
        }
      }
    });

    youtubePlayerRef.current = player;

    return () => {
      stopMuteMonitor();
      player.destroy();
      youtubePlayerRef.current = null;
    };
  }, [
    shouldUseFallbackPlaylist,
    isYouTubeApiReady,
    activeFallbackId,
    pickNextFallbackId,
    startMuteMonitor,
    stopMuteMonitor,
    syncMutePreferenceFromPlayer,
    applyPlayerMuteState,
    applyPlayerVolumeState
  ]);

  useEffect(() => {
    if (!shouldUseFallbackPlaylist || !activeFallbackId) {
      return;
    }

    if (youtubePlayerRef.current && typeof youtubePlayerRef.current.loadVideoById === 'function') {
      youtubePlayerRef.current.loadVideoById(activeFallbackId);
      applyPlayerMuteState(youtubePlayerRef.current, isVideoMutedRef.current);
      applyPlayerVolumeState(youtubePlayerRef.current, videoVolumeRef.current);
    }
  }, [activeFallbackId, shouldUseFallbackPlaylist, applyPlayerMuteState, applyPlayerVolumeState]);

  useEffect(() => {
    if (!shouldUseFallbackPlaylist) {
      return;
    }
    const player = youtubePlayerRef.current;
    if (!player) {
      return;
    }

    if (pendingPlayerSyncRef.current) {
      pendingPlayerSyncRef.current = false;
      return;
    }

    applyPlayerMuteState(player, isVideoMuted);
    if (pendingVolumeSyncRef.current) {
      pendingVolumeSyncRef.current = false;
      return;
    }
    if (!isVideoMuted) {
      applyPlayerVolumeState(player, videoVolume);
    }
  }, [isVideoMuted, videoVolume, shouldUseFallbackPlaylist, applyPlayerMuteState, applyPlayerVolumeState]);

  const videoSourceMeta = useMemo(() => {
    const raw = videoUrl ?? CHAT_VIDEO_EMBED_URL ?? null;

    if (!raw) {
      return {
        url: null as string | null,
        isDirect: false,
        status: shouldUseFallbackPlaylist ? '랜덤 재생 중' : '링크 미설정'
      };
    }

    if (DIRECT_VIDEO_FILE_PATTERN.test(raw)) {
      return {
        url: raw,
        isDirect: true,
        status: '준비 완료'
      };
    }

    return {
      url: normaliseYouTubeEmbedUrl(raw),
      isDirect: false,
      status: '준비 완료'
    };
  }, [videoUrl, shouldUseFallbackPlaylist]);

  const videoPanelUrl = videoSourceMeta.url;
  const isDirectVideoSource = videoSourceMeta.isDirect;
  const iframeVideoUrl = useMemo(() => {
    if (!videoPanelUrl || isDirectVideoSource) {
      return null;
    }
    const separator = videoPanelUrl.includes('?') ? '&' : '?';
    return `${videoPanelUrl}${separator}enablejsapi=1&controls=1&rel=0`;
  }, [videoPanelUrl, isDirectVideoSource]);
  const shouldUseYouTubeLayout =
    !isDirectVideoSource && (shouldUseFallbackPlaylist || Boolean(videoPanelUrl));
  const videoFrameClassName = [
    'chat-video-frame',
    !videoPanelUrl && !shouldUseFallbackPlaylist ? 'chat-video-frame--empty' : '',
    shouldUseYouTubeLayout ? 'chat-video-frame--youtube' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <aside className="chat-stage__video">
      <div className="chat-video-panel">
        <div className="chat-video-panel__header">
          <div>
            <p className="chat-video-panel__title">Music Video</p>
            <span className="chat-video-panel__subtitle">9:16 Vertical</span>
          </div>
          <span className="chat-video-panel__status">{videoSourceMeta.status}</span>
        </div>
        <div className="chat-video-panel__media">
          <div className={videoFrameClassName}>
            {videoPanelUrl ? (
              isDirectVideoSource ? (
                <video
                  key={videoPanelUrl}
                  src={videoPanelUrl}
                  controls
                  playsInline
                  muted={isVideoMuted}
                  preload="metadata"
                  poster={characterAvatar}
                  onLoadedMetadata={event => {
                    event.currentTarget.volume = videoVolumeRef.current;
                  }}
                  onVolumeChange={event => {
                    const target = event.currentTarget;
                    const nextMuted = target.muted;
                    const nextVolume = Math.max(0, Math.min(1, target.volume));
                    setIsVideoMuted(prev => (prev === nextMuted ? prev : nextMuted));
                    setVideoVolume(prev => (Math.abs(prev - nextVolume) < 0.01 ? prev : nextVolume));
                  }}
                />
              ) : (
                <iframe
                  key={iframeVideoUrl ?? videoPanelUrl}
                  src={iframeVideoUrl ?? videoPanelUrl}
                  title={`${characterName} video`}
                  allow="autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  frameBorder="0"
                />
              )
            ) : shouldUseFallbackPlaylist ? (
              <div className="chat-video-frame__youtube">
                <div ref={youtubeContainerRef} className="chat-video-frame__youtube-player" />
                {!isYouTubeApiReady ? (
                  <div className="chat-video-panel__placeholder">
                    <p>영상 로딩 중...</p>
                    <span>잠시만 기다려 주세요.</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="chat-video-panel__placeholder">
                <p>영상이 여기에 표시됩니다</p>
                <span>
                  환경변수 <code>NEXT_PUBLIC_CHAT_VIDEO_URL</code> 로 링크를 지정하세요.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
