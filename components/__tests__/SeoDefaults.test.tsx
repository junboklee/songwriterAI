import { render } from '@testing-library/react';

import SeoDefaults from '@/components/SeoDefaults';

let mockAsPath = '/';
jest.mock('next/router', () => ({ useRouter: () => ({ asPath: mockAsPath }) }));
jest.mock('next/head', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const canonicalOf = (path: string) => {
  mockAsPath = path;
  const { container, unmount } = render(<SeoDefaults />);
  const href = container.querySelector('link[rel="canonical"]')?.getAttribute('href');
  const ogUrl = container.querySelector('meta[property="og:url"]')?.getAttribute('content');
  unmount();
  return { href, ogUrl };
};

describe('SeoDefaults', () => {
  it('points the canonical URL at the current page, not the homepage', () => {
    expect(canonicalOf('/explore')).toEqual({
      href: 'https://novasingerai.com/explore',
      ogUrl: 'https://novasingerai.com/explore'
    });
  });

  it('drops the query string and keeps the bare domain for the homepage', () => {
    expect(canonicalOf('/lyrics/birthday-song?utm_source=x#top').href).toBe(
      'https://novasingerai.com/lyrics/birthday-song'
    );
    expect(canonicalOf('/').href).toBe('https://novasingerai.com');
  });

  it('uses the NovaSingerAI name', () => {
    mockAsPath = '/';
    const { container } = render(<SeoDefaults />);
    expect(container.querySelector('meta[property="og:site_name"]')).toHaveAttribute('content', 'NovaSingerAI');
    expect(container.innerHTML).not.toContain('SongwriterAI');
  });
});
