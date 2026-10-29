import type { IncomingMessage } from 'http';

import { clientIp } from '@/lib/clientIp';

const request = (headers: Record<string, string>, remoteAddress = '10.0.0.1') =>
  ({ headers, socket: { remoteAddress } }) as unknown as IncomingMessage;

describe('clientIp', () => {
  it('uses the App Hosting client IP header first', () => {
    expect(clientIp(request({ 'x-fah-client-ip': '222.0.0.5', 'x-forwarded-for': '1.1.1.1, 222.0.0.5, 66.249.0.1, 66.249.0.2' }))).toBe('222.0.0.5');
  });

  it('ignores addresses the visitor prepended to X-Forwarded-For', () => {
    expect(clientIp(request({ 'x-forwarded-for': '203.0.113.7, 222.0.0.5, 66.249.0.1, 66.249.0.2' }))).toBe('222.0.0.5');
    expect(clientIp(request({ 'x-forwarded-for': '203.0.113.8, 203.0.113.9, 222.0.0.5, 66.249.0.1, 66.249.0.2' }))).toBe('222.0.0.5');
    expect(clientIp(request({ 'x-forwarded-for': '222.0.0.5, 66.249.0.1, 66.249.0.2' }))).toBe('222.0.0.5');
  });

  it('falls back to the socket address without proxy headers', () => {
    expect(clientIp(request({}))).toBe('10.0.0.1');
    expect(clientIp(request({ 'x-forwarded-for': '66.249.0.1, 66.249.0.2' }))).toBe('10.0.0.1');
  });
});
