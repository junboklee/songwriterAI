import type { NextRequest } from 'next/server';

import { pageCard } from '@/lib/ogPageCard';
import { renderSongCard } from '@/lib/ogSongCard';

// next/og only runs on the edge runtime in the Pages Router.
export const config = { runtime: 'edge' };

// Link-preview image (1200x630) for the landing page and the /lyrics topic pages.
export default async function handler(req: NextRequest) {
  const slug = new URL(req.url).pathname.split('/').pop() ?? '';
  const card = pageCard(slug);
  if (!card) {
    return new Response(null, { status: 404 });
  }

  try {
    const image = await renderSongCard({ ...card, format: 'wide' });
    // The cards only change on deploy; let crawlers and the CDN keep them for a day.
    image.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    return image;
  } catch (error) {
    console.error('OG page card error:', error);
    return new Response(null, { status: 502 });
  }
}
