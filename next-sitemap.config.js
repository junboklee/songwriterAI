/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://www.songwriterai.app',
  generateRobotsTxt: true,
  changefreq: 'weekly',
  priority: 0.7,
  exclude: ['/auth/*', '/dashboard/*', '/chat/*', '/settings/*', '/history/*'],
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/' },
      { userAgent: '*', disallow: ['/auth', '/chat', '/dashboard', '/history', '/settings'] }
    ]
  }
};
