import type { IncomingMessage } from 'http';

// Proxies that App Hosting puts in front of the server, each appending one X-Forwarded-For entry
// after the visitor's address (measured in production: "<sent by visitor...>, <visitor>, <google>, <google>").
const TRUSTED_PROXY_HOPS = 2;

const header = (req: IncomingMessage, name: string) => {
  const value = req.headers[name];
  return (Array.isArray(value) ? value.join(',') : value ?? '').trim();
};

// The visitor's IP for rate limits. Anything a visitor sends in X-Forwarded-For lands at the start
// of the list, so the first entry cannot be trusted. App Hosting sets x-fah-client-ip itself
// (a value sent by the visitor is overwritten), so it comes first; then the entry just before
// the trusted proxy hops; then the socket address (local development).
export function clientIp(req: IncomingMessage) {
  const fah = header(req, 'x-fah-client-ip');
  if (fah) {
    return fah;
  }
  const forwarded = header(req, 'x-forwarded-for')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
  if (forwarded.length > TRUSTED_PROXY_HOPS) {
    return forwarded[forwarded.length - 1 - TRUSTED_PROXY_HOPS];
  }
  return req.socket?.remoteAddress || 'unknown';
}
