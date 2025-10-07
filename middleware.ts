import {auth} from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req: any) => {
  const { pathname } = req.nextUrl

  // Skip middleware for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return NextResponse.next()
  }

  // Allow access to login and register pages
  if (pathname === '/admin/login' || pathname === '/admin/register') {
    return NextResponse.next()
  }

  // Protect all admin routes - dashboard and all admin pages
  const adminRoutes = [
    '/',
    '/orders',
    '/products',
    '/listings',
    '/message',
    '/discounts',
    '/content',
    '/dynamic-pages',
    '/customers',
    '/reviews',
    '/analytics',
    '/blogs',
    '/pages',
    '/support',
    '/profile'
  ];

  const isAdminRoute = adminRoutes.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  ) || pathname.startsWith('/admin') || pathname.startsWith('/api/admin');

  if (isAdminRoute) {
    // Allow bypassing authentication in development if explicitly enabled
    if (process.env.NODE_ENV === 'development' && process.env.ADMIN_AUTH_BYPASS === 'true') {
      return NextResponse.next()
    }

    // Check authentication
    const session = req.auth

    if (!session || !session.user) {
      // For API routes, return 401 instead of redirect
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        )
      } else {
        // For page routes, redirect to login
        const url = new URL('/login', req.url)
        return NextResponse.redirect(url)
      }
    }

    // Check if user has admin role
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN']
    if (!allowedRoles.includes(session.user.role)) {
      // For API routes, return 403 instead of redirect
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Admin access required' },
          { status: 403 }
        )
      } else {
        // For page routes, return 403
        return NextResponse.json(
          { error: 'Forbidden', message: 'Admin access required' },
          { status: 403 }
        )
      }
    }

    // Check page-level permissions for non-Super Admin users
    // Super Admin (role === 'SUPER_ADMIN') has access to all pages
    if (session.user.role !== 'SUPER_ADMIN') {
      const userAllowedPages = session.user.allowedPages || []
      
      // Extract the base path (first segment after domain)
      let basePath = '/'
      if (pathname !== '/') {
        const pathParts = pathname.split('/').filter(Boolean)
        if (pathParts.length > 0) {
          basePath = `/${pathParts[0]}`
        }
      }

      // Check if user has access to this specific page
      const hasAccess = userAllowedPages.some((allowedPath: string) => {
        // Allow exact match or parent path access
        return pathname === allowedPath || 
               pathname.startsWith(allowedPath + '/') ||
               basePath === allowedPath ||
               allowedPath === '/' // Dashboard access grants access to root
      })

      if (!hasAccess) {
        // For API routes, return 403
        if (pathname.startsWith('/api/admin')) {
          return NextResponse.json(
            { error: 'Forbidden', message: 'You do not have access to this page' },
            { status: 403 }
          )
        } else {
          // For page routes, redirect to dashboard with error
          const url = new URL('/', req.url)
          url.searchParams.set('error', 'access_denied')
          return NextResponse.redirect(url)
        }
      }
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - /uploads (uploaded files)
     * - /placeholder.svg (placeholder image)
     * - /api/uploads (upload API routes)
     * - /api/public (public API endpoints - no auth required)
     * - /_next/static (static files)
     * - /_next/image (image optimization files)
     * - /favicon.ico (favicon file)
     * - Static assets (images, fonts, etc.)
     */
    '/((?!uploads/|placeholder\\.svg|api/uploads|api/public|_next/static|_next/image|favicon\\.ico|.*\\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|otf)$).*)',
  ]
}