import type { NextApiRequest } from 'next';

import { AppError } from '@/lib/errors';
import { requireUser, type AuthenticatedUser } from '@/lib/serverAuth';

// Admins are listed by email in the ADMIN_EMAILS env var (comma-separated). The email must be
// verified, otherwise anyone could sign up with an unverified copy of an admin's address.
export const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);

export const isAdmin = (user: AuthenticatedUser) =>
  Boolean(user.email && user.emailVerified && adminEmails().includes(user.email.toLowerCase()));

export async function requireAdmin(req: NextApiRequest) {
  const user = await requireUser(req);
  if (!isAdmin(user)) {
    throw new AppError('관리자 권한이 없습니다.', { statusCode: 403, code: 'FORBIDDEN' });
  }
  return user;
}
