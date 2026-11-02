// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextConfig = require('../next.config.js');

describe('security headers', () => {
  it('apply to every path and hide the framework', async () => {
    const [rule] = await nextConfig.headers();
    expect(rule.source).toBe('/:path*');
    const keys = rule.headers.map((header: { key: string }) => header.key);
    expect(keys).toEqual(
      expect.arrayContaining(['Strict-Transport-Security', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy'])
    );
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it('keep the CSP free of script rules that could break sign-in or payment', async () => {
    const [rule] = await nextConfig.headers();
    const csp = rule.headers.find((header: { key: string }) => header.key === 'Content-Security-Policy').value;
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).not.toMatch(/script-src|default-src|connect-src/);
  });
});
