// api/orders/fulfill.ts
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

interface FulfillmentRequest {
  orderId: string;
  trackingNumber: string;
  carrier: string;
  notes?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderId, trackingNumber, carrier, notes }: FulfillmentRequest = req.body;

    if (!orderId || !trackingNumber || !carrier) {
      return res.status(400).json({ 
        error: 'Missing required fields: orderId, trackingNumber, carrier' 
      });
    }

    // Read current orders
    const ordersPath = path.join(process.cwd(), 'data', 'orders.json');
    
    if (!fs.existsSync(ordersPath)) {
      return res.status(404).json({ error: 'Orders data not found' });
    }

    const ordersData = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
    const orders = Array.isArray(ordersData) ? ordersData : ordersData.orders || [];

    // Find the order
    const orderIndex = orders.findIndex((order: any) => order.id === orderId);
    
    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update order with fulfillment information
    const updatedOrder = {
      ...orders[orderIndex],
      status: 'Shipped',
      fulfillmentStatus: 'Fulfilled',
      tracking: {
        number: trackingNumber,
        carrier: carrier,
        url: `https://tracking.example.com/${trackingNumber}`,
        notes: notes || ''
      },
      shippedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    orders[orderIndex] = updatedOrder;

    // Save updated orders
    const dataToSave = Array.isArray(ordersData) ? orders : { ...ordersData, orders };
    fs.writeFileSync(ordersPath, JSON.stringify(dataToSave, null, 2));

    res.status(200).json({
      success: true,
      message: 'Order fulfilled successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Fulfillment error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
