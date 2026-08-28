import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export const proxy = auth((req) => {
  if (!req.auth) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
});

export const config = {
  // Protect dashboard and chat; leave /login and auth API routes public
  matcher: ['/', '/chat/:path*'],
};
