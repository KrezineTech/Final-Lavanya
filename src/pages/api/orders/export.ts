import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

// Persistent file storage for orders
const ORDERS_FILE_PATH = path.join(process.cwd(), 'data', 'orders.json');

// Helper function to load orders from persistent storage
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { format = 'csv' } = req.query;
    const orders = loadOrders();

    if (format === 'csv') {
      // Generate CSV format
      const csvHeaders = [
        'Order ID',
        'Customer Name',
        'Customer Email',
        'Order Date',
        'Ship By Date',
        'Status',
        'Payment Status',
        'Fulfillment Status',
        'Total',
        'Destination Country',
        'Items',
        'Tracking Number'
      ];

      const csvRows = orders.map(order => [
        order.id || '',
        order.customerName || '',
        order.customerEmail || '',
        order.orderedDate ? new Date(order.orderedDate).toISOString().split('T')[0] : '',
        order.shipByDate ? new Date(order.shipByDate).toISOString().split('T')[0] : '',
        order.status || '',
        order.paymentStatus || '',
        order.fulfillmentStatus || '',
        order.totalPrice || '',
        order.destinationCountry || '',
        order.items ? order.items.map((item: any) => `${item.name} (${item.quantity})`).join('; ') : '',
        order.trackingNumber || ''
      ]);

      // Convert to CSV string
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="orders-export-${new Date().toISOString().split('T')[0]}.csv"`);
      
      return res.status(200).send(csvContent);

    } else if (format === 'json') {
      // Generate JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="orders-export-${new Date().toISOString().split('T')[0]}.json"`);
      
      return res.status(200).json({
        exportDate: new Date().toISOString(),
        totalOrders: orders.length,
        orders: orders
      });

    } else {
      return res.status(400).json({ error: 'Invalid format. Supported formats: csv, json' });
    }

  } catch (error: any) {
    console.error('Failed to export orders:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to export orders'
    });
  }
}
