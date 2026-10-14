import type { NextApiRequest } from 'next';
import { adminAuth } from '@/lib/firebaseAdmin';
import { UnauthorizedError } from '@/lib/errors';

export type AuthenticatedUser = {
  uid: string;
  email?: string;
  displayName?: string;
  name?: string;
  picture?: string;
  emailVerified?: boolean;
};

async function verifyFirebaseIdToken(idToken: string): Promise<AuthenticatedUser> {
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);

    let userRecord:
      | {
          email?: string;
          displayName?: string;
          photoURL?: string;
        }
      | null = null;

    try {
      userRecord = await adminAuth.getUser(decoded.uid);
    } catch {
      userRecord = null;
    }

    return {
      uid: decoded.uid,
      email: decoded.email ?? userRecord?.email ?? undefined,
      displayName: decoded.name ?? userRecord?.displayName ?? undefined,
      name: decoded.name ?? userRecord?.displayName ?? undefined,
      picture: decoded.picture ?? userRecord?.photoURL ?? undefined,
      emailVerified: decoded.email_verified === true
    };
  } catch {
    throw new UnauthorizedError('Firebase ID token is invalid.');
  }
}

function extractIdToken(req: NextApiRequest): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const raw = header.slice('Bearer '.length).trim();
    if (raw) {
      return raw;
    }
  }

  const cookieToken = req.cookies?.__session;
  if (typeof cookieToken === 'string' && cookieToken.trim()) {
    return cookieToken.trim();
  }

  return null;
}

export async function authenticateRequest(
  req: NextApiRequest
): Promise<{ user: AuthenticatedUser; idToken: string }> {
  const idToken = extractIdToken(req);

  if (!idToken) {
    throw new UnauthorizedError('Firebase ID token is required.');
  }

  const user = await verifyFirebaseIdToken(idToken);

  return { user, idToken };
}

// For public endpoints that personalise the response when a valid token is present.
export async function getOptionalUser(req: NextApiRequest): Promise<AuthenticatedUser | null> {
  const idToken = extractIdToken(req);
  if (!idToken) {
    return null;
  }
  try {
    return await verifyFirebaseIdToken(idToken);
  } catch {
    return null;
  }
}

export async function requireUser(req: NextApiRequest): Promise<AuthenticatedUser> {
  const { user } = await authenticateRequest(req);
  return user;
}

export { UnauthorizedError } from '@/lib/errors';
