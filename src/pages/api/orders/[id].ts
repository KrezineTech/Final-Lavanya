import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

// Persistent file storage for orders
const ORDERS_FILE_PATH = path.join(process.cwd(), 'data', 'orders.json');

// Helper functions for persistent storage
function loadOrders(): any[] {
  try {
    if (fs.existsSync(ORDERS_FILE_PATH)) {
      const data = fs.readFileSync(ORDERS_FILE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading orders:', error);
  }
  return [];
}

function saveOrders(orders: any[]): void {
  try {
    const dataDir = path.dirname(ORDERS_FILE_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(ORDERS_FILE_PATH, JSON.stringify(orders, null, 2));
  } catch (error) {
    console.error('Error saving orders:', error);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid order ID' });
  }

  // Decode the order ID in case it's URL encoded
  const decodedId = decodeURIComponent(id);
  console.log(`📊 Order API - Received ID: "${id}", Decoded ID: "${decodedId}"`);

  try {
    switch (req.method) {
      case 'GET':
        const orders = loadOrders();
        const order = orders.find(o => o.id === decodedId || o.id === id);
        
        if (!order) {
          console.log(`📊 Order not found. Available orders:`, orders.map(o => o.id));
          return res.status(404).json({ error: 'Order not found' });
        }
        
        return res.status(200).json(order);

      case 'PATCH':
        const allOrders = loadOrders();
        const orderIndex = allOrders.findIndex(o => o.id === decodedId || o.id === id);
        
        if (orderIndex === -1) {
          console.log(`📊 Order not found for update. ID: "${decodedId}", Available:`, allOrders.map(o => o.id));
          return res.status(404).json({ error: 'Order not found' });
        }

        const updateData = req.body;
        const updatedOrder = {
          ...allOrders[orderIndex],
          ...updateData,
          updatedAt: new Date().toISOString()
        };

        allOrders[orderIndex] = updatedOrder;
        saveOrders(allOrders);

        console.log(`📊 Order ${decodedId} updated successfully:`, updateData);
        
        return res.status(200).json({
          success: true,
          order: updatedOrder
        });

      case 'DELETE':
        const ordersToFilter = loadOrders();
        const filteredOrders = ordersToFilter.filter(o => o.id !== id);
        
        if (filteredOrders.length === ordersToFilter.length) {
          return res.status(404).json({ error: 'Order not found' });
        }

        saveOrders(filteredOrders);
        
        return res.status(200).json({ 
          success: true, 
          message: 'Order deleted successfully' 
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Order API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Operation failed'
    });
  }
}
