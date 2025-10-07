import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

// Persistent file storage for orders
const ORDERS_FILE_PATH = path.join(process.cwd(), 'data', 'orders.json');

function saveOrders(orders: any[]): void {
  try {
    fs.writeFileSync(ORDERS_FILE_PATH, JSON.stringify(orders, null, 2));
  } catch (error) {
    console.error('Error saving orders:', error);
  }
}

// Helper function to load orders from persistent storage
function loadPersistentOrders(): any[] {
  try {
    const ordersFilePath = path.join(process.cwd(), 'data', 'orders.json');
    if (fs.existsSync(ordersFilePath)) {
      const data = fs.readFileSync(ordersFilePath, 'utf8');
      const orders = JSON.parse(data);
      
      // Transform persistent orders to match the expected format
      return orders.map((order: any) => {
        // Extract the main product from items array
        const mainItem = order.items && order.items[0];
        
        return {
          id: order.id,
          shipByDate: order.shipByDate,
          customerName: order.customerName || 'Unknown Customer',
          totalPrice: order.totalPrice,
          isGift: order.isGift || false,
          isPersonalizable: order.isPersonalizable || false,
          product: mainItem ? {
            name: mainItem.name,
            image: 'https://placehold.co/80x80.png',
            hint: mainItem.name.toLowerCase(),
            quantity: mainItem.quantity,
            sku: mainItem.sku,
            size: 'Standard',
            personalization: '',
            price: mainItem.price,
            transactionId: mainItem.sku,
          } : null,
          orderedDate: order.orderedDate || order.createdAt,
          shipping: order.shipping || {
            method: 'Standard Shipping',
            cost: 'US$ 0.00',
            destination: 'Unknown'
          },
          shippingAddress: order.shippingAddress || 'Address not available',
          destinationCountry: order.destinationCountry || 'Unknown',
          hasNote: order.hasNote || false,
          status: order.status || 'Not Shipped',
        };
      });
    }
  } catch (error) {
    console.error('Error loading persistent orders:', error);
  }
  return [];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const { query } = req;
      
      // Parse filters
      const filters: any = {};
      
      if (query.paymentStatus) {
        filters.paymentStatus = Array.isArray(query.paymentStatus) 
          ? query.paymentStatus 
          : query.paymentStatus.split(',');
      }
      
      if (query.fulfillmentStatus) {
        filters.fulfillmentStatus = Array.isArray(query.fulfillmentStatus) 
          ? query.fulfillmentStatus 
          : query.fulfillmentStatus.split(',');
      }
      
      if (query.q) filters.q = query.q as string;
      if (query.from) filters.from = new Date(query.from as string);
      if (query.to) filters.to = new Date(query.to as string);
      if (query.minTotal) filters.minTotal = Number(query.minTotal);
      if (query.maxTotal) filters.maxTotal = Number(query.maxTotal);
      if (query.destination) filters.destination = query.destination as string;
      if (query.status) filters.status = query.status as string;

      // Parse sort
      const sortField = (query.sort as string) || 'createdAt';
      const sort = {
        field: ['createdAt', 'grandTotalCents', 'number'].includes(sortField) 
          ? (sortField as 'createdAt' | 'grandTotalCents' | 'number')
          : 'createdAt',
        direction: (query.direction as 'asc' | 'desc') || 'desc',
      };

      // Parse pagination
      const pagination = {
        page: Number(query.page) || 1,
        pageSize: Math.min(Number(query.pageSize) || 20, 100),
      };

      // Load persistent orders from JSON file
      let persistentOrders = loadPersistentOrders();
      console.log(`📊 Orders API - Persistent orders loaded: ${persistentOrders.length}`);
      
      // Apply filters to persistent orders
      if (filters.q) {
        const searchTerm = filters.q.toLowerCase();
        persistentOrders = persistentOrders.filter(order => 
          order.id?.toLowerCase().includes(searchTerm) ||
          order.customerName?.toLowerCase().includes(searchTerm) ||
          order.customerEmail?.toLowerCase().includes(searchTerm) ||
          order.items?.some((item: any) => item.name?.toLowerCase().includes(searchTerm))
        );
      }
      
      if (filters.destination && filters.destination !== 'All') {
        persistentOrders = persistentOrders.filter(order => 
          order.destinationCountry === filters.destination
        );
      }
      
      if (filters.status && filters.status !== 'All') {
        persistentOrders = persistentOrders.filter(order => 
          order.status === filters.status
        );
      }
      
      if (filters.paymentStatus && filters.paymentStatus.length > 0) {
        persistentOrders = persistentOrders.filter(order => 
          filters.paymentStatus.includes(order.paymentStatus)
        );
      }
      
      if (filters.fulfillmentStatus && filters.fulfillmentStatus.length > 0) {
        persistentOrders = persistentOrders.filter(order => 
          filters.fulfillmentStatus.includes(order.fulfillmentStatus)
        );
      }
      
      if (filters.from) {
        persistentOrders = persistentOrders.filter(order => 
          new Date(order.createdAt) >= filters.from
        );
      }
      
      if (filters.to) {
        persistentOrders = persistentOrders.filter(order => 
          new Date(order.createdAt) <= filters.to
        );
      }
      
      // Use persistent orders as the main source
      const allOrders = persistentOrders;
      
      console.log(`📊 Orders API - Total orders after filtering: ${allOrders.length}`);
      
      return res.status(200).json({
        orders: allOrders,
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: allOrders.length,
          totalPages: Math.ceil(allOrders.length / pagination.pageSize),
        }
      });

    } catch (error) {
      console.error('Failed to fetch orders:', error);
      
      // Fallback: return persistent orders only
      try {
        const persistentOrders = loadPersistentOrders();
        return res.status(200).json({
          orders: persistentOrders,
          pagination: {
            page: 1,
            pageSize: 20,
            total: persistentOrders.length,
            totalPages: Math.ceil(persistentOrders.length / 20),
          }
        });
      } catch (fallbackError) {
        return res.status(500).json({
          error: 'Failed to load orders from any source',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { orderId, updates } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ error: 'Order ID is required' });
      }

      // Load existing orders
      const orders = loadPersistentOrders();
      const orderIndex = orders.findIndex(order => order.id === orderId);
      
      if (orderIndex === -1) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Update the order
      const updatedOrder = {
        ...orders[orderIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      orders[orderIndex] = updatedOrder;
      saveOrders(orders);

      console.log(`📊 Order ${orderId} updated successfully`);
      
      return res.status(200).json({
        success: true,
        order: updatedOrder
      });

    } catch (error: any) {
      console.error('Failed to update order:', error);
      return res.status(500).json({
        error: 'Failed to update order',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
