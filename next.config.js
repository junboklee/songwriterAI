// No script allow-list in the CSP: analytics, Kakao, Firebase and PortOne load their own scripts,
// and a wrong list breaks sign-in or payment without any server error.
const securityHeaders = [
  // No includeSubDomains or preload: those are hard to take back and subdomains aren't all ours to decide yet.
  { key: 'Strict-Transport-Security', value: 'max-age=15552000' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: "base-uri 'self'; object-src 'none'; frame-ancestors 'self'" }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async redirects() {
    // Characters are edited in the dashboard's editor panel; keep old edit links working.
    return [{ source: '/character/edit/:id', destination: '/dashboard', permanent: false }];
  },
};

module.exports = nextConfig;
