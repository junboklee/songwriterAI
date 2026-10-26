import type { NextApiRequest } from 'next';
import { ageGateState, type AgeGateState } from '@/lib/age';
import { adminAuth } from '@/lib/firebaseAdmin';
import { AgeConfirmationRequiredError, UnauthorizedError } from '@/lib/errors';
import { logWarn } from '@/lib/logger';

export type AuthenticatedUser = {
  uid: string;
  email?: string;
  displayName?: string;
  name?: string;
  picture?: string;
  emailVerified?: boolean;
  // Adult-only policy (lib/age.ts); null when the account record could not be read.
  ageGate?: AgeGateState | null;
  // Identity verification (lib/identity.ts): the keyed hash of the verified person, if verified.
  identityKey?: string | null;
};

// Custom claim set by POST /api/profile/age once the member confirms they are 만 19세 or older.
export const ADULT_CLAIM = 'adultConfirmedAt';

async function verifyFirebaseIdToken(idToken: string): Promise<AuthenticatedUser> {
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);

    let userRecord:
      | {
          email?: string;
          displayName?: string;
          photoURL?: string;
          customClaims?: Record<string, unknown>;
          metadata?: { creationTime?: string };
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
      emailVerified: decoded.email_verified === true,
      // Read from the account record rather than the token, so a confirmation counts immediately.
      ageGate: userRecord
        ? ageGateState({
            confirmed: Boolean(userRecord.customClaims?.[ADULT_CLAIM]),
            createdAt: userRecord.metadata?.creationTime ? new Date(userRecord.metadata.creationTime) : null
          })
        : null,
      identityKey:
        typeof userRecord?.customClaims?.identityKey === 'string' ? (userRecord.customClaims.identityKey as string) : null
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

type AuthOptions = { allowUnconfirmedAge?: boolean };

// Rejects accounts that must confirm their age first. Only the endpoints an unconfirmed member
// still needs (confirming the age, deleting the account) pass `allowUnconfirmedAge`.
export async function authenticateRequest(
  req: NextApiRequest,
  { allowUnconfirmedAge = false }: AuthOptions = {}
): Promise<{ user: AuthenticatedUser; idToken: string }> {
  const idToken = extractIdToken(req);

  if (!idToken) {
    throw new UnauthorizedError('Firebase ID token is required.');
  }

  const user = await verifyFirebaseIdToken(idToken);

  if (user.ageGate === null) {
    // A failed account lookup should not lock everyone out; the next request checks again.
    logWarn('auth.age_gate_unknown', { uid: user.uid });
  } else if (user.ageGate === 'required' && !allowUnconfirmedAge) {
    throw new AgeConfirmationRequiredError();
  }

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

export async function requireUser(req: NextApiRequest, options: AuthOptions = {}): Promise<AuthenticatedUser> {
  const { user } = await authenticateRequest(req, options);
  return user;
}

export { UnauthorizedError } from '@/lib/errors';
