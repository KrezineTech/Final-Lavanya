import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Get all active users who have logged in recently (within last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const activeUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        lastLoginAt: {
          gte: sevenDaysAgo
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true
      },
      orderBy: {
        lastLoginAt: 'desc'
      }
    })

    return NextResponse.json({
      message: 'Active users retrieved successfully',
      count: activeUsers.length,
      users: activeUsers
    })

  } catch (error) {
    console.error('Error fetching active users:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
  // Removed prisma.$disconnect() - client should remain connected
}