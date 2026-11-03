import type { NextApiRequest, NextApiResponse } from 'next';

import { aiAvailable } from '@/lib/aiStatus';
import { probeAi } from '@/lib/llm';

// GET -> { available } so the trial page can say up front when the AI can't answer. Cached
// briefly at the edge; the instance probes the provider at most once per ten minutes.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const available = await aiAvailable(probeAi).catch(() => true);
  res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60');
  return res.status(200).json({ available });
}
