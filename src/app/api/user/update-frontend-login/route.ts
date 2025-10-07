import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

// Input validation schema
const updateLoginSchema = z.object({
  userId: z.string().optional(),
  email: z.string().email('Invalid email address'),
  loginTime: z.string().datetime('Invalid login time format')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = updateLoginSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          message: 'Validation failed',
          errors: validationResult.error.flatten().fieldErrors
        },
        { status: 400 }
      )
    }

    const { userId, email, loginTime } = validationResult.data
    const loginDate = new Date(loginTime)

    console.log(`🔄 Updating frontend login tracking for: ${email}`)

    // Find user by email or userId
    const whereClause = userId ? { id: userId } : { email: email.toLowerCase() }
    
    const user = await prisma.user.findUnique({
      where: whereClause,
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        lastFrontendLoginAt: true,
        frontendSessionActive: true
      }
    })

    if (!user) {
      console.log(`❌ User not found for frontend login tracking: ${email}`)
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.isActive) {
      console.log(`❌ Inactive user attempted frontend login: ${email}`)
      return NextResponse.json(
        { message: 'Account is inactive' },
        { status: 401 }
      )
    }

    // Update frontend login tracking
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        lastFrontendLoginAt: loginDate,
        frontendSessionActive: true,
        lastLoginAt: loginDate, // Also update general last login
        lastLoginSource: 'FRONTEND'
      },
      select: {
        id: true,
        email: true,
        lastFrontendLoginAt: true,
        frontendSessionActive: true
      }
    })

    console.log(`✅ Frontend login tracking updated for: ${email} at ${loginDate.toISOString()}`)

    return NextResponse.json({
      success: true,
      message: 'Frontend login tracking updated',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        lastFrontendLoginAt: updatedUser.lastFrontendLoginAt,
        frontendSessionActive: updatedUser.frontendSessionActive
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error updating frontend login tracking:', error)
    return NextResponse.json(
      { 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
  // Removed prisma.$disconnect() - client should remain connected
}

// Handle CORS for cross-origin requests from frontend
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}