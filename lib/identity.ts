// Identity verification (본인인증) through PortOne V2, required before a member's first AI song
// (terms 제4조). The browser opens the verification window; the server then reads the result from
// PortOne, checks the person is 만 19세 or older, and records only:
//  - custom claims identityVerifiedAt (time) and identityKey (keyed hash of the person's CI), and
//  - identityKeys/{identityKey}: which account it was first used for and the free songs used.
// Name, phone number, birth date and CI themselves are never stored.
import { createHmac } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';

import { isAdult, parseBirthDate } from '@/lib/age';
import { AppError, BadRequestError } from '@/lib/errors';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { logInfo, logWarn } from '@/lib/logger';

export const IDENTITY_CLAIM = 'identityVerifiedAt';
export const IDENTITY_KEY_CLAIM = 'identityKey';
const API = 'https://api.portone.io/identity-verifications';

export const portoneConfigured = () => Boolean(process.env.PORTONE_API_SECRET);

// Verification ids are issued by the server as iv-{uid}-{random}, which ties each verification to the
// account that started it: another account cannot submit someone else's result.
export const identityVerificationIdPattern = (uid: string) =>
  new RegExp(`^iv-${uid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-[a-z0-9]{6,24}$`);
export const newIdentityVerificationId = (uid: string) =>
  `iv-${uid}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const identityKeyOf = (value: string) =>
  createHmac('sha256', process.env.IDENTITY_KEY_SECRET ?? process.env.FIREBASE_PRIVATE_KEY ?? 'novasinger-identity')
    .update(value)
    .digest('hex')
    .slice(0, 40);

type VerifiedCustomer = { birthDate?: string; ci?: string; phoneNumber?: string; name?: string };

async function fetchVerification(identityVerificationId: string) {
  const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
  const url = `${API}/${encodeURIComponent(identityVerificationId)}${storeId ? `?storeId=${encodeURIComponent(storeId)}` : ''}`;
  const response = await fetch(url, { headers: { Authorization: `PortOne ${process.env.PORTONE_API_SECRET}` } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    logWarn('identity.lookup_failed', { status: response.status, type: body?.type ?? null });
    throw new AppError('본인인증 결과를 확인하지 못했어요. 다시 시도해 주세요.', { statusCode: 502, code: 'IDENTITY_LOOKUP_FAILED' });
  }
  return body as { status?: string; verifiedCustomer?: VerifiedCustomer };
}

export async function confirmIdentity(uid: string, identityVerificationId: string) {
  if (!portoneConfigured()) {
    throw new AppError('본인인증은 아직 준비 중이에요.', { statusCode: 503, code: 'IDENTITY_UNAVAILABLE' });
  }
  if (!identityVerificationIdPattern(uid).test(identityVerificationId)) {
    throw new BadRequestError('본인인증 정보가 올바르지 않아요.');
  }

  const verification = await fetchVerification(identityVerificationId);
  const customer = verification.verifiedCustomer;
  if (verification.status !== 'VERIFIED' || !customer?.birthDate) {
    throw new AppError('본인인증이 완료되지 않았어요.', { statusCode: 400, code: 'IDENTITY_NOT_VERIFIED' });
  }
  const birth = parseBirthDate(customer.birthDate);
  if (!birth || !isAdult(birth)) {
    logInfo('identity.under_age', { uid });
    throw new AppError('만 19세 이상만 이용할 수 있어요.', { statusCode: 403, code: 'UNDER_AGE' });
  }

  // CI identifies the person across accounts; KG Inicis omits it for some carriers, so the phone
  // number is the fallback. Either way only a keyed hash is kept.
  const source = customer.ci ? `ci:${customer.ci}` : customer.phoneNumber ? `phone:${customer.phoneNumber}` : null;
  if (!source) {
    throw new AppError('본인인증 정보가 부족해요. 다른 방법으로 다시 시도해 주세요.', { statusCode: 400, code: 'IDENTITY_INCOMPLETE' });
  }
  const identityKey = identityKeyOf(source);
  const keyRef = adminDb.collection('identityKeys').doc(identityKey);
  await adminDb.runTransaction(async tx => {
    const existing = await tx.get(keyRef);
    tx.set(
      keyRef,
      existing.exists
        ? { lastUid: uid, updatedAt: FieldValue.serverTimestamp() }
        : { firstUid: uid, lastUid: uid, freeClipsUsed: 0, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
  });

  const record = await adminAuth.getUser(uid);
  await adminAuth.setCustomUserClaims(uid, {
    ...(record.customClaims ?? {}),
    [IDENTITY_CLAIM]: Date.now(),
    [IDENTITY_KEY_CLAIM]: identityKey
  });
  logInfo('identity.verified', { uid });
  return { verified: true };
}
