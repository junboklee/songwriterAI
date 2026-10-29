import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length) {
  throw new Error(
    `Missing Firebase config values: ${missingKeys.join(
      ', '
    )}. Update .env.local with NEXT_PUBLIC_FIREBASE_* variables.`
  );
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

// Sign in with Apple needs the Apple team ID, key ID and private key in the Firebase console
// (otherwise every attempt fails with "Code flow is not enabled for Apple"). Show the button only
// once that is done and NEXT_PUBLIC_APPLE_SIGN_IN=true is set in apphosting.yaml.
const appleSignInEnabled = process.env.NEXT_PUBLIC_APPLE_SIGN_IN === 'true';

export { auth, provider, appleProvider, appleSignInEnabled };
