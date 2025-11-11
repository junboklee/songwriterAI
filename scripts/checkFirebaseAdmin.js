const fs = require('fs');
const path = require('path');

function loadEnv(filePath) {
  const env = {};
  const content = fs.readFileSync(filePath, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    if (!rawLine || rawLine.trim().startsWith('#')) {
      continue;
    }

    const idx = rawLine.indexOf('=');

    if (idx === -1) {
      continue;
    }

    const key = rawLine.slice(0, idx).trim();
    let value = rawLine.slice(idx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

async function main() {
  const envPath = path.join(process.cwd(), '.env.local');
  const env = loadEnv(envPath);

  const projectId = env.FIREBASE_ADMIN_PROJECT_ID || env.FIREBASE_PROJECT_ID;
  const clientEmail = env.FIREBASE_ADMIN_CLIENT_EMAIL || env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = env.FIREBASE_ADMIN_PRIVATE_KEY || env.FIREBASE_PRIVATE_KEY || '';
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  console.log('projectId:', projectId);
  console.log('clientEmail:', clientEmail);
  console.log('privateKey length:', privateKey.length);

  const admin = require('firebase-admin');

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
      })
    });

    console.log('Firebase Admin initialized.');

    const db = admin.firestore();
    const snapshot = await db.collection('users').limit(1).get();
    console.log('Firestore request ok. documents:', snapshot.size);
  } catch (error) {
    console.error('Firebase Admin init failed:');
    console.error('  name:', error.name);
    console.error('  code:', error.code);
    console.error('  details:', error.details);

    if (error.metadata) {
      try {
        const wwwAuth = error.metadata.get('www-authenticate');
        const tracking = error.metadata.get('x-debug-tracking-id');
        console.error('  metadata.www-authenticate:', wwwAuth);
        console.error('  metadata.x-debug-tracking-id:', tracking);
      } catch {
        // ignore metadata access errors
      }
    }

    console.error('  stack:', error.stack);
    process.exitCode = 1;
  }
}

main();
