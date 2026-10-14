import type { NextRequest } from 'next/server';

import { renderSongCard } from '@/lib/ogSongCard';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://novasingerai.com').replace(/\/$/, '');

// next/og only runs on the edge runtime in the Pages Router.
export const config = { runtime: 'edge' };

// Share-card image for /s/{shareId}. Data comes from /api/share/{id} on every request, so an
// un-shared or deleted song stops producing an image straight away.
export default async function handler(req: NextRequest) {
  const shareId = new URL(req.url).pathname.split('/').pop();
  if (!shareId) {
    return new Response(null, { status: 400 });
  }

  try {
    // Use the public site URL, not the request origin: behind App Hosting the request reaches the
    // container as https://*.run.app while the server itself speaks plain http, so fetching the
    // request origin fails with a TLS "wrong version number" error.
    const share = await fetch(`${SITE_URL}/api/share/${encodeURIComponent(shareId)}`, { cache: 'no-store' });
    if (!share.ok) {
      return new Response(null, { status: share.status === 404 ? 404 : 502 });
    }

    const { title, lyrics } = (await share.json()) as { title: string | null; lyrics: string };
    const image = await renderSongCard({ title, lyrics });
    image.headers.set('Cache-Control', 'private, no-store');
    return image;
  } catch (error) {
    console.error('OG song card error:', error);
    return new Response(null, { status: 502 });
  }
}
