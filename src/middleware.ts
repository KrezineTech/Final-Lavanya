import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: any) {
  const { pathname } = req.nextUrl

  // Allow access to login and register pages
  if (pathname === '/login' || pathname === '/register') {
    return NextResponse.next()
  }

  // Allow direct access to uploaded files
  if (pathname.startsWith('/uploads/')) {
    return NextResponse.next()
  }

  // PUBLIC APIs - Accessible without authentication
  // These are endpoints that the frontend needs to fetch data
  const publicApiRoutes = [
    '/api/auth/',           // NextAuth routes
    '/api/frontend/',       // Frontend-specific APIs
    '/api/admin/register',  // Admin registration (needs to be public)
    '/api/category',        // Categories for frontend
    '/api/categories',      // Categories (plural)
    '/api/dynamic-pages',   // Dynamic page content
    '/api/products',        // Product listings
    '/api/collections',     // Product collections
    '/api/collection',      // Collection details
    '/api/search',          // Search functionality
    '/api/contact',         // Contact form
    '/api/reviews',         // Product reviews
    '/api/blogs',           // Blog posts
    '/api/pages',           // Static pages
    '/api/public/',         // Explicitly public APIs
    '/api/uploads',         // File serving (for images/videos)
    '/api/health',          // Health check
    '/api/faqs',   
    '/api/messages',
    '/api/discounts/validate',  // Discount validation for checkout
    '/api/discounts/apply',     // Discount application for checkout
    '/api/orders/sync',         // Order sync from frontend - MUST be public for frontend to sync orders
    '/api/orders',              // Orders endpoint - for testing and frontend access
    '/api/favourites',          // Favourites API - for frontend sync and admin stats
  ]

  // Check if this is a public API route
  const isPublicApi = publicApiRoutes.some(route => pathname.startsWith(route))
  if (isPublicApi) {
    return NextResponse.next()
  }

  // ADMIN APIs - Require authentication
  // All other /api/* routes require admin authentication
  if (pathname.startsWith('/api/')) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: 'next-auth.session-token-admin'
    })

    if (!token) {
      console.log(`[MIDDLEWARE] ❌ NO TOKEN - BLOCKING admin API access to ${pathname}`)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log(`[MIDDLEWARE] ✅ ADMIN API access granted to ${pathname}`)
    const requestHeaders = new Headers(req.headers)

    // Add user information to headers for API routes
    requestHeaders.set('X-User-Id', token.sub || '')
    requestHeaders.set('X-User-Email', token.email || '')
    requestHeaders.set('X-User-Role', token.role || 'ADMIN')

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  // NON-API routes - Require authentication for admin panel
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: 'next-auth.session-token-admin'
  })

  if (!token) {
    console.log(`[MIDDLEWARE] ❌ NO TOKEN - REDIRECTING to login from ${pathname}`)
    return NextResponse.redirect(new URL('/login', req.url))
  }

  console.log(`[MIDDLEWARE] ✅ ACCESS GRANTED to route: ${pathname}`)
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
}