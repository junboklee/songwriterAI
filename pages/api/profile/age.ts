import type { NextApiRequest, NextApiResponse } from 'next';

import { isAdult, parseBirthDate } from '@/lib/age';
import { AppError, BadRequestError } from '@/lib/errors';
import { adminAuth } from '@/lib/firebaseAdmin';
import { logError, logInfo } from '@/lib/logger';
import { enforceRateLimit } from '@/lib/rateLimiter';
import { ADULT_CLAIM, requireUser } from '@/lib/serverAuth';

// POST { birthDate: "YYYYMMDD" | "YYYY-MM-DD" } -> { confirmed: true }
// The birth date is only used to check 만 19세 and is never stored: the account keeps just the time
// of the confirmation (custom claim), as the privacy policy says.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await requireUser(req, { allowUnconfirmedAge: true });
    await enforceRateLimit(user.uid);

    const raw = (req.body ?? {}) as { birthDate?: unknown };
    const birth = typeof raw.birthDate === 'string' ? parseBirthDate(raw.birthDate) : null;
    if (!birth) {
      throw new BadRequestError('생년월일 8자리를 정확히 입력해 주세요. 예: 19950315');
    }
    if (!isAdult(birth)) {
      logInfo('age.under_age', { uid: user.uid });
      return res.status(403).json({ error: '만 19세 이상만 이용할 수 있어요.', code: 'UNDER_AGE' });
    }

    if (user.ageGate !== 'confirmed') {
      const record = await adminAuth.getUser(user.uid);
      await adminAuth.setCustomUserClaims(user.uid, { ...(record.customClaims ?? {}), [ADULT_CLAIM]: Date.now() });
      logInfo('age.confirmed', { uid: user.uid });
    }
    return res.status(200).json({ confirmed: true });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    logError('age.unexpected_error', error);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
}
