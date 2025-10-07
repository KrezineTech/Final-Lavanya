import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { SUPER_ADMIN, isSuperAdminCredentials, getSuperAdminData, hashPassword } from '@/lib/super-admin-config'

const authOptions = {
  // adapter: PrismaAdapter(prisma), // Not needed for JWT strategy
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials) {
          console.error('No credentials provided')
          throw new Error('Credentials are required')
        }

        const email = credentials.email as string
        const password = credentials.password as string

        if (!email || !password) {
          console.error('Missing email or password')
          throw new Error('Email and password are required')
        }

        try {
          console.log('Attempting login for:', email)

          // Check if credentials match Super Admin
          const isSuperAdmin = await isSuperAdminCredentials(email, password)
          
          if (isSuperAdmin) {
            console.log('Super Admin login detected')
            
            // Get or create Super Admin in database
            let superAdminUser = await prisma.user.findUnique({
              where: { email: SUPER_ADMIN.email.toLowerCase() }
            })

            // Hash the Super Admin password if user doesn't exist or password not set
            const hashedPassword = await hashPassword(SUPER_ADMIN.password)

            if (!superAdminUser) {
              // Create Super Admin user in database
              superAdminUser = await prisma.user.create({
                data: {
                  email: SUPER_ADMIN.email.toLowerCase(),
                  name: SUPER_ADMIN.name,
                  role: SUPER_ADMIN.role,
                  password: hashedPassword,
                  isActive: true,
                  canManageUsers: true,
                  allowedPages: ['/'], // Super Admin has access to all pages
                  emailVerified: new Date()
                }
              })
            } else if (!superAdminUser.password || superAdminUser.password !== hashedPassword) {
              // Update Super Admin password if it changed
              superAdminUser = await prisma.user.update({
                where: { id: superAdminUser.id },
                data: {
                  password: hashedPassword,
                  role: SUPER_ADMIN.role,
                  canManageUsers: true,
                  isActive: true
                }
              })
            }

            // Update last login tracking for Super Admin
            await prisma.user.update({
              where: { id: superAdminUser.id },
              data: {
                lastLoginAt: new Date(),
                lastLoginSource: 'ADMIN',
                adminSessionActive: true,
                lastAdminLoginAt: new Date()
              }
            })

            // Create JWT token for API access
            const apiToken = jwt.sign(
              {
                id: superAdminUser.id,
                email: superAdminUser.email,
                role: superAdminUser.role,
                type: 'admin',
                isSuperAdmin: true,
                canManageUsers: true
              },
              process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET!,
              { expiresIn: '24h' }
            )

            return {
              id: superAdminUser.id,
              email: superAdminUser.email,
              name: superAdminUser.name,
              role: superAdminUser.role,
              allowedPages: ['/'], // Super Admin has access to all pages
              canManageUsers: true,
              apiToken
            }
          }

          // Not Super Admin, check database for regular user
          const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
          })

          if (!user || !user.password) {
            console.error('User not found or no password for:', email)
            throw new Error('Invalid credentials')
          }

          // Check if user is active
          if (!user.isActive) {
            console.error('User account deactivated:', email)
            throw new Error('Account is deactivated')
          }

          // Verify password
          const isValidPassword = await bcrypt.compare(password, user.password)
          if (!isValidPassword) {
            console.error('Invalid password for:', email)
            throw new Error('Invalid credentials')
          }

          console.log('Login successful for:', email)

          // Update last login tracking
          await prisma.user.update({
            where: { id: user.id },
            data: {
              lastLoginAt: new Date(),
              lastLoginSource: 'ADMIN',
              adminSessionActive: true,
              lastAdminLoginAt: new Date()
            }
          })

          // Create JWT token for API access
          const apiToken = jwt.sign(
            {
              id: user.id,
              email: user.email,
              role: user.role,
              type: 'admin',
              allowedPages: user.allowedPages,
              canManageUsers: user.canManageUsers
            },
            process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET!,
            { expiresIn: '24h' }
          )

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            allowedPages: user.allowedPages,
            canManageUsers: user.canManageUsers,
            apiToken
          }
        } catch (error) {
          console.error('Authentication error:', error)
          throw error
        }
      }
    })
  ],
  session: {
    strategy: 'jwt' as const,
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 60 * 60 // Update every hour
  },
  jwt: {
    maxAge: 24 * 60 * 60 // 24 hours
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token-admin`,
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    callbackUrl: {
      name: `next-auth.callback-url-admin`,
      options: {
        sameSite: 'lax' as const,
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    csrfToken: {
      name: `next-auth.csrf-token-admin`,
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  pages: {
    signIn: '/login',
    error: '/login'
  },
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.apiToken = user.apiToken
        token.allowedPages = user.allowedPages
        token.canManageUsers = user.canManageUsers
      }
      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.apiToken = token.apiToken as string
        session.user.allowedPages = token.allowedPages as string[]
        session.user.canManageUsers = token.canManageUsers as boolean
      }
      return session
    },
    async signIn({ user }: { user: any }) {
      // Additional sign-in logic if needed
      console.log('User signed in:', user?.email)
      return true
    }
  },
  events: {
    async signOut(message: any) {
      // Update user session status when signing out
      if ('token' in message && message.token?.sub) {
        try {
          await prisma.user.update({
            where: { id: message.token.sub },
            data: {
              adminSessionActive: false
            }
          })
        } catch (error) {
          console.error('Error updating session status:', error)
        }
      }
    }
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)

// Export the auth options for middleware
export default authOptions