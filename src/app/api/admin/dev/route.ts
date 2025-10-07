import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'stats':
        // Get basic admin statistics
        const [userCount, messageCount, customerCount] = await Promise.all([
          prisma.user.count(),
          prisma.message.count(),
          prisma.user.count({ where: { role: 'CUSTOMER' } })
        ])

        return NextResponse.json({
          users: userCount,
          messages: messageCount,
          customers: customerCount,
          timestamp: new Date().toISOString()
        })

      case 'users':
        // Get all users (limited for development)
        const users = await prisma.user.findMany({
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            createdAt: true,
            lastLoginAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        })

        return NextResponse.json({ users })

      case 'messages':
        // Get recent messages
        const messages = await prisma.message.findMany({
          include: {
            sender: {
              select: { id: true, name: true, email: true }
            },
            receiver: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { timestamp: 'desc' },
          take: 20
        })

        return NextResponse.json({ messages })

      default:
        return NextResponse.json({
          message: 'Admin Development API',
          available_actions: ['stats', 'users', 'messages'],
          usage: '/api/admin/dev?action=stats'
        })
    }
  } catch (error) {
    console.error('Admin dev API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
