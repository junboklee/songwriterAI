import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

type ServiceAccountEnv = {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
};

const normalizeStorageBucket = (bucket: string | undefined, projectId?: string) => {
  const trimmed = bucket?.trim();

  if (trimmed) {
    return trimmed;
  }

  if (projectId) {
    return `${projectId}.appspot.com`;
  }

  return null;
};

function getServiceAccountFromEnv(): (ServiceAccountEnv & { storageBucket: string }) | null {
  const projectId =
    process.env.SECRETS_PROJECT_ID ?? // Changed for Firebase deployment
    process.env.FIREBASE_ADMIN_PROJECT_ID ??
    process.env.FIREBASE_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail =
    process.env.SECRETS_CLIENT_EMAIL ?? // Changed for Firebase deployment
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey =
    process.env.SECRETS_PRIVATE_KEY ?? // Changed for Firebase deployment
    process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  const storageBucket = normalizeStorageBucket(
    process.env.FIREBASE_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    projectId
  );

  return {
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
    storageBucket,
  };
}

function initFirebaseAdmin() {
  if (getApps().length) {
    return getApps()[0];
  }

  const serviceAccount = getServiceAccountFromEnv();

  if (!serviceAccount) {
    throw new Error(
      'Firebase Admin credentials are missing. Configure FIREBASE_ADMIN_* env vars.'
    );
  }

  if (!serviceAccount.storageBucket) {
    throw new Error(
      'Firebase Storage bucket is missing. Configure FIREBASE_STORAGE_BUCKET or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET env var.'
    );
  }

  return initializeApp({
    credential: cert(serviceAccount),
    storageBucket: serviceAccount.storageBucket,
  });
}

const adminApp = initFirebaseAdmin();
const adminDb = getFirestore(adminApp);
const adminAuth = getAuth(adminApp);
const adminStorage = getStorage(adminApp);

export { adminApp, adminDb, adminAuth, adminStorage };
