import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const start = Date.now();
  
  console.log(`[MIDDLEWARE] ${request.method} ${request.url}`);
  console.log(`[MIDDLEWARE] Headers:`, Object.fromEntries(request.headers));
  console.log(`[MIDDLEWARE] User Agent: ${request.headers.get('user-agent')}`);
  
  const response = NextResponse.next();
  
  response.headers.set('X-Response-Time', `${Date.now() - start}ms`);
  response.headers.set('X-Processed-By', 'Garcia-Coelho-Frontend');
  
  console.log(`[MIDDLEWARE] Response status: ${response.status}`);
  console.log(`[MIDDLEWARE] Response headers:`, Object.fromEntries(response.headers));
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 