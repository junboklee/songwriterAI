const fs = require('fs');
const path = require('path');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const env = {};
  const content = fs.readFileSync(filePath, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    if (!rawLine || rawLine.trim().startsWith('#')) {
      continue;
    }

    const separatorIndex = rawLine.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = rawLine.slice(0, separatorIndex).trim();
    let value = rawLine.slice(separatorIndex + 1).trim();

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

async function verifyFirebaseAdmin(env) {
  const projectId = env.FIREBASE_ADMIN_PROJECT_ID || env.FIREBASE_PROJECT_ID;
  const clientEmail = env.FIREBASE_ADMIN_CLIENT_EMAIL || env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = env.FIREBASE_ADMIN_PRIVATE_KEY || env.FIREBASE_PRIVATE_KEY || '';
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin credentials are incomplete. Provide FIREBASE_ADMIN_* or FIREBASE_* variables.'
    );
  }

  const admin = require('firebase-admin');

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
      })
    });
  }

  const db = admin.firestore();
  const snapshot = await db.collection('users').limit(1).get();

  console.log(
    `Firebase Admin connected. Sample query returned ${snapshot.size} document(s).`
  );
}

async function verifyOpenAI(env) {
  const apiKey = env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing.');
  }

  const { OpenAI } = require('openai');
  const client = new OpenAI({
    apiKey,
    maxRetries: 0
  });

  const response = await client.models.list({
    limit: 1
  });

  const model = response.data[0]?.id ?? 'unknown';
  console.log(`OpenAI connection successful. Example model id: ${model}`);
}

async function main() {
  const envFilePath = path.join(process.cwd(), '.env.local');
  const fileEnv = loadEnv(envFilePath);
  const mergedEnv = {
    ...fileEnv,
    ...process.env
  };

  let failures = 0;

  try {
    await verifyFirebaseAdmin(mergedEnv);
  } catch (error) {
    failures += 1;
    console.error('Firebase Admin check failed:');
    console.error(error);
  }

  try {
    await verifyOpenAI(mergedEnv);
  } catch (error) {
    failures += 1;
    console.error('OpenAI check failed:');
    console.error(error);
  }

  if (failures > 0) {
    process.exitCode = 1;
  } else {
    console.log('Environment checks completed successfully.');
  }
}

main().catch(error => {
  console.error('Unexpected error while running environment checks:');
  console.error(error);
  process.exitCode = 1;
});
