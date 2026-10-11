// URL helpers for the chat page's music-video panel.

export const DIRECT_VIDEO_FILE_PATTERN = /\.(mp4|webm|ogg)(\?.*)?$/i;

export const CHAT_VIDEO_FALLBACKS = [
  'https://www.youtube.com/embed/tOihHKzR5M0',
  'https://www.youtube.com/embed/aH46U7nV6Fs',
  'https://www.youtube.com/embed/x4qlgpwIaQk',
  'https://youtube.com/shorts/eQ49JMHQBhs',
  'https://youtube.com/shorts/puhfko17-1M',
  'https://youtu.be/gcq4B9b-pbs',
  'https://youtu.be/S0cQj30xYrE',
  'https://youtu.be/RNdr6vSw_es',
  'https://youtube.com/shorts/6MBgpCGZDjU'
];

export const extractYouTubeVideoId = (rawUrl: string): string | null => {
  if (!rawUrl) {
    return null;
  }

  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      return url.pathname.replace('/', '') || null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (url.pathname.startsWith('/shorts/')) {
        const [, maybeId] = url.pathname.split('/shorts/');
        return maybeId ? maybeId.replace('/', '') || null : null;
      }

      if (url.pathname.startsWith('/embed/')) {
        const parts = url.pathname.split('/');
        return parts[2] ?? null;
      }

      if (url.pathname === '/watch') {
        return url.searchParams.get('v');
      }
    }
  } catch {
    return null;
  }

  return null;
};

export const ensureMutedYouTubeUrl = (rawUrl: string) => {
  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.set('mute', '1');
    if (!parsed.searchParams.has('playsinline')) {
      parsed.searchParams.set('playsinline', '1');
    }
    if (!parsed.searchParams.has('rel')) {
      parsed.searchParams.set('rel', '0');
    }
    if (!parsed.searchParams.has('modestbranding')) {
      parsed.searchParams.set('modestbranding', '1');
    }
    return parsed.toString();
  } catch {
    const separator = rawUrl.includes('?') ? '&' : '?';
    return `${rawUrl}${separator}mute=1`;
  }
};

const buildYouTubeEmbedUrl = (videoId: string) =>
  ensureMutedYouTubeUrl(
    `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`
  );

export const normaliseYouTubeEmbedUrl = (rawUrl: string) => {
  const extracted = extractYouTubeVideoId(rawUrl);
  if (extracted) {
    return buildYouTubeEmbedUrl(extracted);
  }

  if (rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be')) {
    return ensureMutedYouTubeUrl(rawUrl);
  }

  return rawUrl;
};

export const pickRandomItem = <T,>(items: T[], exclude?: T | null): T | null => {
  if (items.length === 0) {
    return null;
  }

  const filtered = exclude ? items.filter(item => item !== exclude) : items;
  const pool = filtered.length > 0 ? filtered : items;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? null;
};
