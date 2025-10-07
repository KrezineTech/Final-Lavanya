import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {    
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log(`🔐 User orders API access for user ${id}`);

    // Fetch user's orders from database
    const orders = await prisma.order.findMany({
      where: {
        userId: id
      },
      include: {
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Fetch user details separately to avoid Prisma include issues
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    // Transform orders to expected format
    const transformedOrders = orders.map(order => {
      // Type assertion for metadata as it's Json type in Prisma
      const metadata = order.metadata as any;
      
      return {
        id: order.number, // Use order number as ID for frontend compatibility
        dbId: order.id, // Keep database ID for reference
        userId: order.userId,
        customerName: order.customerName || user?.name || 'Unknown Customer',
        customerEmail: user?.email || order.guestEmail || 'No email',
        customerPhone: order.guestPhone,
        items: order.items.map((item: any) => ({
          name: item.name,
          price: item.priceCents / 100, // Convert cents to currency
          quantity: item.quantity,
          sku: item.sku || 'N/A',
          total: (item.priceCents * item.quantity) / 100,
          image: (item.metadata as any)?.image || null,
        })),
        subtotal: order.subtotalCents / 100,
        shipping: {
          method: 'Standard Shipping',
          cost: `US$ ${(order.shippingCents / 100).toFixed(2)}`,
          destination: 'TBD' // Could be extracted from shipping address if stored
        },
        tax: order.taxCents / 100,
        total: order.grandTotalCents / 100,
        totalPrice: `US$ ${(order.grandTotalCents / 100).toFixed(2)}`,
        status: order.fulfillmentStatus === 'DELIVERED' ? 'Delivered' : 
                order.fulfillmentStatus === 'FULFILLED' ? 'Shipped' : 
                order.paymentStatus === 'CAPTURED' ? 'Processing' : 'Pending',
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        createdAt: order.createdAt.toISOString(),
        orderedDate: order.createdAt.toISOString(),
        shipByDate: new Date(order.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from order
        destinationCountry: metadata?.destinationCountry || 'Unknown',
        hasNote: false,
        isGift: metadata?.isGift || false,
        isPersonalizable: metadata?.isPersonalizable || false,
      };
    });

    console.log(`📊 Fetched ${orders.length} orders for user ${id}`);

    return res.status(200).json({
      success: true,
      orders: transformedOrders,
      total: orders.length,
      userId: id
    });

  } catch (error) {
    console.error('Error fetching user orders:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch user orders',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}