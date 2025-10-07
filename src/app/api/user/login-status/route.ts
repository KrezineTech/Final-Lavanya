import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

// Input validation schema
const loginStatusSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  userId: z.string().optional()
}).refine(data => data.email || data.userId, {
  message: "Either email or userId must be provided"
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = loginStatusSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          message: 'Validation failed',
          errors: validationResult.error.flatten().fieldErrors
        },
        { status: 400 }
      )
    }

    const { email, userId } = validationResult.data

    // Build where clause
    const whereClause = email 
      ? { email: email.toLowerCase() }
      : { id: userId }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        lastLoginSource: true,
        frontendSessionActive: true,
        adminSessionActive: true,
        lastFrontendLoginAt: true,
        lastAdminLoginAt: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    // Check if sessions are recent (within last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const isFrontendSessionRecent = user.lastFrontendLoginAt && user.lastFrontendLoginAt > twentyFourHoursAgo
    const isAdminSessionRecent = user.lastAdminLoginAt && user.lastAdminLoginAt > twentyFourHoursAgo

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      },
      loginStatus: {
        lastLoginAt: user.lastLoginAt,
        lastLoginSource: user.lastLoginSource,
        sessions: {
          frontend: {
            active: user.frontendSessionActive && isFrontendSessionRecent,
            lastLoginAt: user.lastFrontendLoginAt,
            isRecent: isFrontendSessionRecent
          },
          admin: {
            active: user.adminSessionActive && isAdminSessionRecent,
            lastLoginAt: user.lastAdminLoginAt,
            isRecent: isAdminSessionRecent
          }
        },
        summary: {
          isLoggedInAnywhere: (user.frontendSessionActive && isFrontendSessionRecent) || (user.adminSessionActive && isAdminSessionRecent),
          isLoggedInFrontend: user.frontendSessionActive && isFrontendSessionRecent,
          isLoggedInAdmin: user.adminSessionActive && isAdminSessionRecent,
          activeSessionsCount: 
            (user.frontendSessionActive && isFrontendSessionRecent ? 1 : 0) + 
            (user.adminSessionActive && isAdminSessionRecent ? 1 : 0),
          mostRecentSource: user.lastLoginSource
        }
      }
    })

  } catch (error) {
    console.error('Login status check error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
  // Removed prisma.$disconnect() - client should remain connected
}

// GET method to check all active sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source') // 'frontend', 'admin', or 'all'
    
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    // Build where clause based on source filter
    let whereClause: any = {
      isActive: true,
      lastLoginAt: {
        gte: twentyFourHoursAgo
      }
    }

    if (source === 'frontend') {
      whereClause.frontendSessionActive = true
      whereClause.lastFrontendLoginAt = {
        gte: twentyFourHoursAgo
      }
    } else if (source === 'admin') {
      whereClause.adminSessionActive = true
      whereClause.lastAdminLoginAt = {
        gte: twentyFourHoursAgo
      }
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        lastLoginAt: true,
        lastLoginSource: true,
        frontendSessionActive: true,
        adminSessionActive: true,
        lastFrontendLoginAt: true,
        lastAdminLoginAt: true
      },
      orderBy: {
        lastLoginAt: 'desc'
      }
    })

    const processedUsers = users.map(user => {
      const isFrontendActive = user.frontendSessionActive && user.lastFrontendLoginAt && user.lastFrontendLoginAt > twentyFourHoursAgo
      const isAdminActive = user.adminSessionActive && user.lastAdminLoginAt && user.lastAdminLoginAt > twentyFourHoursAgo

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLoginAt: user.lastLoginAt,
        lastLoginSource: user.lastLoginSource,
        sessions: {
          frontend: {
            active: isFrontendActive,
            lastLoginAt: user.lastFrontendLoginAt
          },
          admin: {
            active: isAdminActive,
            lastLoginAt: user.lastAdminLoginAt
          }
        },
        activeIn: [
          ...(isFrontendActive ? ['frontend'] : []),
          ...(isAdminActive ? ['admin'] : [])
        ]
      }
    })

    return NextResponse.json({
      message: 'Active sessions retrieved successfully',
      filter: source || 'all',
      count: processedUsers.length,
      users: processedUsers,
      summary: {
        totalActiveUsers: processedUsers.length,
        frontendOnlyUsers: processedUsers.filter(u => u.activeIn.includes('frontend') && !u.activeIn.includes('admin')).length,
        adminOnlyUsers: processedUsers.filter(u => u.activeIn.includes('admin') && !u.activeIn.includes('frontend')).length,
        bothSessionsUsers: processedUsers.filter(u => u.activeIn.includes('frontend') && u.activeIn.includes('admin')).length
      }
    })

  } catch (error) {
    console.error('Active sessions retrieval error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
  // Removed prisma.$disconnect() - client should remain connected
}