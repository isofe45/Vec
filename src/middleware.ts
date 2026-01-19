import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COOKIE_NAME = 'cinevault_session'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // protect lists pages
  if (pathname.startsWith('/lists')) {
    const token = req.cookies.get(COOKIE_NAME)?.value
    if (!token) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('e', 'auth')
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/lists/:path*'],
}
