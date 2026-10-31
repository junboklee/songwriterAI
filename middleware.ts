import { NextResponse, type NextRequest } from 'next/server';

// Next 14 loops ("Attempted to handle request too many times") and answers 500 when a crawler asks
// for a dynamic route's literal file name, e.g. /lyrics/%5Bslug%5D. No real topic has brackets in
// its slug, so answer those with a plain 404 before routing.
const LITERAL_SEGMENT = /\[|\]|%5b|%5d/i;

export function middleware(request: NextRequest) {
  if (LITERAL_SEGMENT.test(request.nextUrl.pathname)) {
    return new NextResponse('Not Found', { status: 404 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/lyrics/:path*'
};
