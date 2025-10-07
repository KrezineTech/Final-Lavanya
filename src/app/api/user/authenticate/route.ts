import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const { email, password, source } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Enforce role-based access control based on login source
    const allowedFrontendRoles = ['CUSTOMER', 'USER']
    const allowedAdminRoles = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT']

    if (source === 'FRONTEND' && !allowedFrontendRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Access denied: Admin accounts cannot login to frontend' },
        { status: 403 }
      )
    }

    if (source === 'ADMIN' && !allowedAdminRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Access denied: Customer accounts cannot login to admin panel' },
        { status: 403 }
      )
    }

    // Update login tracking
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginSource: source === 'ADMIN' ? 'ADMIN' : 'FRONTEND',
        ...(source === 'ADMIN' && {
          adminSessionActive: true,
          lastAdminLoginAt: new Date()
        }),
        ...(source === 'FRONTEND' && {
          frontendSessionActive: true,
          lastFrontendLoginAt: new Date()
        })
      }
    })

    // Create JWT token for API access (separate from NextAuth session)
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        type: source.toLowerCase(),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      },
      process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET!
    )

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      ...userWithoutPassword,
      token
    })

  } catch (error) {
    console.error('Authentication error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}