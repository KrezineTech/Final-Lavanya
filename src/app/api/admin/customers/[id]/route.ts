import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Get individual customer details with order history
export const GET = async (request: NextRequest) => {
  try {
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const customerId = pathSegments[pathSegments.length - 1]

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

    // Get customer details from FrontendUser table
    const customer = await (prisma as any).frontendUser.findUnique({
      where: { id: customerId },
      include: {
        orders: {
          select: {
            id: true,
            number: true,
            grandTotalCents: true,
            currency: true,
            paymentStatus: true,
            fulfillmentStatus: true,
            createdAt: true,
            updatedAt: true,
            items: {
              select: {
                id: true,
                name: true,
                quantity: true,
                priceCents: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50 // Limit to last 50 orders
        },
        _count: {
          select: {
            orders: true
          }
        }
      }
    })

    if (!customer) {
      return NextResponse.json(
        {
          error: 'Customer not found',
          code: 'CUSTOMER_NOT_FOUND',
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      )
    }

    // Use the orders from the include
    const orders = customer.orders

    // Calculate comprehensive statistics
    const paidOrders = orders.filter((order: any) =>
      ['CAPTURED', 'PARTIALLY_REFUNDED'].includes(order.paymentStatus)
    )

    const totalSpentCents = paidOrders.reduce((sum: number, order: any) =>
      sum + order.grandTotalCents, 0
    )

    const averageOrderValueCents = paidOrders.length > 0
      ? Math.round(totalSpentCents / paidOrders.length)
      : 0

    // Get recent activity (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const recentOrders = orders.filter((order: any) =>
      order.createdAt >= sixMonthsAgo
    )

    // Determine customer tags/segments
    const tags: string[] = []

    if (totalSpentCents >= 100000) { // $1000+
      tags.push('VIP')
    } else if (totalSpentCents >= 50000) { // $500+
      tags.push('High Value')
    }

    if (orders.length === 0) {
      tags.push('No Orders')
    } else if (orders.length === 1) {
      tags.push('New Customer')
    } else if (orders.length >= 10) {
      tags.push('Loyal Customer')
    }

    if (!customer.isActive) {
      tags.push('Inactive')
    }

    if (customer.sessionActive) {
      tags.push('Online')
    }

    // Check dormancy
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    if (customer.lastLoginAt && customer.lastLoginAt < thirtyDaysAgo) {
      tags.push('Dormant')
    }

    // Check if frequent buyer (>5 orders in last 6 months)
    if (recentOrders.length >= 5) {
      tags.push('Frequent Buyer')
    }

    // Enhanced customer object
    const enhancedCustomer = {
      id: customer.id,
      name: customer.name || 'Unknown Customer',
      email: customer.email,
      avatar: '', // FrontendUser doesn't have image field
      isActive: customer.isActive,
      emailVerified: customer.emailVerified,
      lastLoginAt: customer.lastLoginAt,
      lastFrontendLoginAt: customer.lastLoginAt, // Map to lastLoginAt
      frontendSessionActive: customer.sessionActive,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      role: 'USER', // All frontend users are USER role
      sessionCount: 0, // Not tracked for frontend users
      tags,
      statistics: {
        totalOrders: orders.length,
        totalPaidOrders: paidOrders.length,
        totalSpentCents,
        totalSpent: totalSpentCents / 100,
        averageOrderValueCents,
        averageOrderValue: averageOrderValueCents / 100,
        recentOrdersCount: recentOrders.length,
        firstOrderDate: orders.length > 0 ? orders[orders.length - 1].createdAt : null,
        lastOrderDate: orders.length > 0 ? orders[0].createdAt : null
      }
    }

    return NextResponse.json({
      success: true,
      customer: enhancedCustomer,
      orders: orders.map((order: any) => ({
        ...order,
        grandTotal: order.grandTotalCents / 100,
        itemsTotal: order.items.reduce((sum: number, item: any) => sum + item.quantity, 0)
      })),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching customer details:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch customer details',
        code: 'CUSTOMER_DETAIL_FETCH_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}