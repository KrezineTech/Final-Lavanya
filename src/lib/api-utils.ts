import { getServerSession } from 'next-auth/next'
import auth from '@/lib/auth'
import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

type SessionUser = {
  role: string;
  [key: string]: any;
};

type Session = {
  user: SessionUser;
  [key: string]: any;
};

export async function requireAdminAuth(request?: NextRequest): Promise<Session> {
  // First try NextAuth session
  const session = await getServerSession(auth) as Session;

  if (session && session.user) {
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN']
    if (allowedRoles.includes(session.user.role)) {
      return session
    }
  }

  // If no NextAuth session, try JWT token from Authorization header
  if (request) {
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7) // Remove 'Bearer ' prefix

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET!) as any

        if (decoded.type === 'admin') {
          const allowedRoles = ['ADMIN', 'SUPER_ADMIN']
          if (allowedRoles.includes(decoded.role)) {
            // Return a session-like object
            return {
              user: {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role
              }
            } as Session
          } else {
            throw new Error('Forbidden')
          }
        } else {
          // Valid token but wrong type
          throw new Error('Forbidden')
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Forbidden') {
          throw error
        }
        // Token invalid, continue to throw unauthorized
      }
    }
  }

  throw new Error('Unauthorized')
}

export async function getAdminSession() {
  try {
    return await requireAdminAuth()
  } catch {
    return null
  }
}

export function getBaseUrl(req?: any): string {
  // In development, try to use the same host and port as the request
  if (req && req.headers && req.headers.host) {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    return `${protocol}://${req.headers.host}`;
  }
  
  // Fallback to environment variable or default
  const port = process.env.PORT || '3000';
  return `http://localhost:${port}`;
}
