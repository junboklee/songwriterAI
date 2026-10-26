import type { NextApiRequest, NextApiResponse } from 'next';

import { AppError } from '@/lib/errors';
import { confirmIdentity, newIdentityVerificationId, portoneConfigured } from '@/lib/identity';
import { logError } from '@/lib/logger';
import { enforceRateLimit } from '@/lib/rateLimiter';
import { requireUser } from '@/lib/serverAuth';

// POST { start: true } -> { identityVerificationId }  id to open the PortOne window with
// POST { identityVerificationId } -> { verified: true }  after the window (or its mobile redirect) finishes
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await requireUser(req);
    await enforceRateLimit(user.uid);
    if (req.body?.start === true) {
      if (!portoneConfigured()) {
        throw new AppError('본인인증은 아직 준비 중이에요.', { statusCode: 503, code: 'IDENTITY_UNAVAILABLE' });
      }
      return res.status(200).json({ identityVerificationId: newIdentityVerificationId(user.uid) });
    }
    const id = typeof req.body?.identityVerificationId === 'string' ? req.body.identityVerificationId : '';
    return res.status(200).json(await confirmIdentity(user.uid, id));
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    logError('identity.unexpected_error', error);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
}
