// PortOne V2 browser SDK for identity verification (본인인증). Configured by NEXT_PUBLIC_PORTONE_STORE_ID
// and NEXT_PUBLIC_PORTONE_IDENTITY_CHANNEL_KEY (both public, from the PortOne console); the server
// re-checks every result with the secret API key (lib/identity.ts).
const SDK_URL = 'https://cdn.portone.io/v2/browser-sdk.js';

type IdentityResponse = { identityVerificationId?: string; code?: string; message?: string };
type PortOneSdk = {
  requestIdentityVerification: (request: Record<string, unknown>) => Promise<IdentityResponse | undefined>;
};

declare global {
  interface Window {
    PortOne?: PortOneSdk;
  }
}

export const PORTONE_STORE_ID = process.env.NEXT_PUBLIC_PORTONE_STORE_ID ?? '';
const CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_IDENTITY_CHANNEL_KEY ?? '';
export const identityVerificationAvailable = () => Boolean(PORTONE_STORE_ID && CHANNEL_KEY);

let loading: Promise<PortOneSdk> | null = null;
function loadSdk(): Promise<PortOneSdk> {
  if (window.PortOne) {
    return Promise.resolve(window.PortOne);
  }
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => (window.PortOne ? resolve(window.PortOne) : reject(new Error('PortOne SDK missing')));
    script.onerror = () => {
      loading = null;
      reject(new Error('PortOne SDK failed to load'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

async function postIdentity(getIdToken: () => Promise<string>, body: Record<string, unknown>) {
  const response = await fetch('/api/profile/identity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getIdToken()}` },
    body: JSON.stringify(body)
  });
  return { ok: response.ok, payload: await response.json().catch(() => ({})) };
}

// Opens the verification window with an id issued by the server. On mobile PortOne redirects to
// redirectUrl instead of resolving, so /verify/identity finishes the job there.
export async function requestIdentityVerification(getIdToken: () => Promise<string>, redirectUrl: string) {
  const started = await postIdentity(getIdToken, { start: true });
  if (!started.ok || typeof started.payload.identityVerificationId !== 'string') {
    return { ok: false as const, message: started.payload.error ?? '본인인증을 시작하지 못했어요.' };
  }
  const identityVerificationId = started.payload.identityVerificationId as string;
  const sdk = await loadSdk();
  const response = await sdk.requestIdentityVerification({
    storeId: PORTONE_STORE_ID,
    channelKey: CHANNEL_KEY,
    identityVerificationId,
    redirectUrl
  });
  if (!response || response.code) {
    return { ok: false as const, message: response?.message ?? '본인인증을 마치지 못했어요.' };
  }
  return { ok: true as const, identityVerificationId };
}

export async function confirmIdentityOnServer(getIdToken: () => Promise<string>, identityVerificationId: string) {
  const { ok, payload } = await postIdentity(getIdToken, { identityVerificationId });
  return ok
    ? { ok: true as const }
    : { ok: false as const, message: typeof payload.error === 'string' ? payload.error : '본인인증을 확인하지 못했어요.' };
}
