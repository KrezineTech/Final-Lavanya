import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireAdminAuth } from '@/lib/api-utils'

const prisma = new PrismaClient()

// Get all customers with comprehensive data
export const GET = async (request: NextRequest) => {
  try {
    // Check admin authentication
    await requireAdminAuth(request)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const status = searchParams.get('status') // 'active', 'inactive', 'all'

    const skip = (page - 1) * limit

    // Build where clause for filtering
    const whereClause: any = {}

    // Add search filtering
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Add status filtering
    if (status === 'active') {
      whereClause.isActive = true
    } else if (status === 'inactive') {
      whereClause.isActive = false
    }

    // Get customers with order statistics
    const customers = await (prisma as any).frontendUser.findMany({
      where: whereClause,
      include: {
        orders: {
          select: {
            id: true,
            number: true,
            grandTotalCents: true,
            paymentStatus: true,
            fulfillmentStatus: true,
            createdAt: true,
            items: {
              select: {
                name: true,
                quantity: true
              },
              take: 3
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 3
        },
        _count: {
          select: {
            orders: true
          }
        }
      },
      orderBy: {
        [sortBy]: sortOrder as 'asc' | 'desc'
      },
      skip,
      take: limit
    })

    // Enhance customers with calculated data
    const enhancedCustomers = customers.map((customer: any) => {
      const totalSpentCents = customer.orders.reduce((sum: number, order: any) => sum + order.grandTotalCents, 0)
      const recentOrders = customer.orders.map((order: any) => ({
        id: order.id,
        number: order.number,
        total: order.grandTotalCents / 100,
        totalFormatted: `USD ${(order.grandTotalCents / 100).toFixed(2)}`,
        status: order.fulfillmentStatus === 'DELIVERED' ? 'Delivered' :
                order.fulfillmentStatus === 'FULFILLED' ? 'Shipped' :
                order.paymentStatus === 'CAPTURED' ? 'Processing' : 'Pending',
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        createdAt: order.createdAt,
        itemCount: order.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
        mainItem: order.items[0]?.name || 'No items'
      }))

      return {
        id: customer.id,
        name: customer.name || 'Unknown Customer',
        email: customer.email,
        avatar: '', // FrontendUser doesn't have image field
        isActive: customer.isActive,
        orders: customer._count.orders,
        totalSpentCents,
        totalSpent: totalSpentCents / 100,
        recentOrders,
        lastLoginAt: customer.lastLoginAt,
        lastFrontendLoginAt: customer.lastLoginAt, // Map to lastLoginAt
        frontendSessionActive: customer.sessionActive,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        role: 'USER', // All frontend users are USER role
        sessionCount: 0, // Not tracked for frontend users
        tags: [] as string[] // We'll determine tags based on order history
      };
    });

    // Assign tags based on spending and activity
    enhancedCustomers.forEach((customer: any) => {
      const tags: string[] = []

      if (customer.totalSpent >= 1000) {
        tags.push('VIP')
      }

      if (customer.orders === 0) {
        tags.push('No Orders')
      } else if (customer.orders === 1) {
        tags.push('New Customer')
      }

      if (!customer.isActive) {
        tags.push('Inactive')
      }

      if (customer.frontendSessionActive) {
        tags.push('Online')
      }

      // Check if customer hasn't logged in for 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      if (customer.lastFrontendLoginAt && customer.lastFrontendLoginAt < thirtyDaysAgo) {
        tags.push('Dormant')
      }

      customer.tags = tags
    })

    // Get total count for pagination
    const totalCount = await (prisma as any).frontendUser.count({ where: whereClause })

    return NextResponse.json({
      success: true,
      customers: enhancedCustomers,
      pagination: {
        currentPage: page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      },
      filters: {
        search,
        sortBy,
        sortOrder,
        status
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching customers:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED',
          timestamp: new Date().toISOString()
        },
        { status: 401 }
      )
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json(
        {
          error: 'Forbidden',
          code: 'ADMIN_REQUIRED',
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      )
    }
    return NextResponse.json(
      {
        error: 'Failed to fetch customers',
        code: 'CUSTOMER_FETCH_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Update customer status
export const PUT = async (request: NextRequest) => {
  try {
    // Check admin authentication
    await requireAdminAuth(request)

    const body = await request.json()
    const { customerId, isActive, notes } = body

    if (!customerId) {
      return NextResponse.json(
        {
          error: 'Customer ID is required',
          code: 'MISSING_CUSTOMER_ID',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    // Update customer in FrontendUser table
    const updatedCustomer = await (prisma as any).frontendUser.update({
      where: { id: customerId },
      data: {
        isActive: isActive !== undefined ? isActive : undefined,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      customer: updatedCustomer,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error updating customer:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED',
          timestamp: new Date().toISOString()
        },
        { status: 401 }
      )
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json(
        {
          error: 'Forbidden',
          code: 'ADMIN_REQUIRED',
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      )
    }
    return NextResponse.json(
      {
        error: 'Failed to update customer',
        code: 'CUSTOMER_UPDATE_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}