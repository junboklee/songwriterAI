/** @type {import('next').NextConfig} */
const nextConfig = {
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
  async redirects() {
    // Characters are edited in the dashboard's editor panel; keep old edit links working.
    return [{ source: '/character/edit/:id', destination: '/dashboard', permanent: false }];
  },
};

module.exports = nextConfig;
