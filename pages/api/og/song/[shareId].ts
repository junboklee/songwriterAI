import type { NextRequest } from 'next/server';

import { renderSongCard } from '@/lib/ogSongCard';

// next/og only runs on the edge runtime in the Pages Router.
export const config = { runtime: 'edge' };

// Share-card image for /s/{shareId}. Data comes from /api/share/{id} on every request, so an
// un-shared or deleted song stops producing an image straight away.
export default async function handler(req: NextRequest) {
  const shareId = new URL(req.url).pathname.split('/').pop();
  if (!shareId) {
    return new Response(null, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const share = await fetch(`${origin}/api/share/${encodeURIComponent(shareId)}`, { cache: 'no-store' });
  if (!share.ok) {
    return new Response(null, { status: share.status === 404 ? 404 : 502 });
  }

  const { title, lyrics } = (await share.json()) as { title: string | null; lyrics: string };
  const image = await renderSongCard({ title, lyrics });
  image.headers.set('Cache-Control', 'private, no-store');
  return image;
}
