import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  console.log('Frontend auth API called')
  try {
    const { email, password } = await request.json()
    console.log('Received email:', email)

    if (!email || !password) {
      console.log('Missing email or password')
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    console.log('Looking up user in FrontendUser table')
    // Find user in FrontendUser table
    const user = await prisma.frontendUser.findUnique({
      where: { email: email.toLowerCase() }
    })
    console.log('User lookup result:', user ? 'found' : 'not found')

    if (!user || !user.password) {
      console.log('User not found or no password')
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('User account deactivated')
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 401 }
      )
    }

    console.log('Verifying password')
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    console.log('Password valid:', isValidPassword)
    if (!isValidPassword) {
      console.log('Invalid password')
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    console.log('Updating login tracking')
    // Update login tracking
    await prisma.frontendUser.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        sessionActive: true
      }
    })

    console.log('Creating JWT token')
    // Create JWT token for API access (separate from NextAuth session)
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        type: 'frontend',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
      },
      process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET!
    )

    console.log('Returning success response')
    // Return user data without password
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      ...userWithoutPassword,
      token
    })

  } catch (error) {
    console.error('Frontend authentication error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}