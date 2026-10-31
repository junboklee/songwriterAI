/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { config, middleware } from '@/middleware';

const run = (path: string) => middleware(new NextRequest(`https://novasingerai.com${path}`));

describe('middleware', () => {
  it('answers 404 for literal dynamic-route names instead of letting Next loop into a 500', () => {
    ['/lyrics/%5Bslug%5D', '/lyrics/%5bslug%5d', '/lyrics/[slug]'].forEach(path => expect(run(path).status).toBe(404));
  });

  it('passes real topic pages through', () => {
    ['/lyrics/birthday-song', '/lyrics/style', '/lyrics'].forEach(path =>
      expect(run(path).headers.get('x-middleware-next')).toBe('1')
    );
  });

  it('only runs on the topic pages', () => {
    expect(config.matcher).toBe('/lyrics/:path*');
  });
});
