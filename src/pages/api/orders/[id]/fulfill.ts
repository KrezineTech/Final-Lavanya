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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid order ID' });
  }

  try {
    const fulfillmentData = req.body;
    const orders = loadOrders();
    const orderIndex = orders.findIndex(o => o.id === id);
    
    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[orderIndex];
    
    // Create fulfillment record
    const fulfillment = {
      id: `fulfillment_${Date.now()}`,
      orderId: id,
      carrier: fulfillmentData.carrier || 'UPS',
      service: fulfillmentData.service || 'Ground',
      trackingNumber: fulfillmentData.trackingNumber || `1Z${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      shippingLabelUrl: fulfillmentData.shippingLabelUrl || '',
      status: 'Label Created',
      createdAt: new Date().toISOString(),
      items: fulfillmentData.items || order.items.map((item: any) => ({
        itemId: item.sku,
        name: item.name,
        quantity: item.quantity
      }))
    };

    // Update order with fulfillment
    const updatedOrder = {
      ...order,
      status: 'Shipped',
      fulfillmentStatus: 'Fulfilled',
      fulfillments: [...(order.fulfillments || []), fulfillment],
      trackingNumber: fulfillment.trackingNumber,
      shippingCarrier: fulfillment.carrier,
      shippedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    orders[orderIndex] = updatedOrder;
    saveOrders(orders);

    console.log(`📦 Order ${id} fulfilled with tracking: ${fulfillment.trackingNumber}`);

    return res.status(201).json({
      success: true,
      fulfillment,
      order: updatedOrder
    });
    
  } catch (error: any) {
    console.error('Failed to create fulfillment:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create fulfillment'
    });
  }
}
