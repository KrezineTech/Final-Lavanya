import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { orderService } from '@/services/orderService';
import { webhookShippingSchema, validateRequestBody } from '@/lib/validators/orders';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const trackingData = validateRequestBody(webhookShippingSchema, req.body);

    // Map carrier status to our status enum
    const statusMap: Record<string, any> = {
      'pre_transit': 'LABEL_CREATED',
      'in_transit': 'IN_TRANSIT',
      'out_for_delivery': 'OUT_FOR_DELIVERY',
      'delivered': 'DELIVERED',
      'exception': 'EXCEPTION',
      'return_to_sender': 'EXCEPTION',
      'failure': 'EXCEPTION',
    };

    const mappedStatus = statusMap[trackingData.status.toLowerCase()] || 'IN_TRANSIT';

    // Find shipment by tracking number
    const shipment = await prisma.shipment.findFirst({
      where: { trackingNumber: trackingData.tracking_number },
    });

    if (!shipment) {
      console.log(`Shipment not found for tracking number: ${trackingData.tracking_number}`);
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // Update shipment tracking
    await orderService.updateShipmentTracking(shipment.id, {
      status: mappedStatus,
      description: trackingData.description,
      location: trackingData.location,
      timestamp: trackingData.timestamp,
      metadata: req.body,
    });

    console.log(`Updated tracking for shipment ${shipment.id}: ${mappedStatus}`);

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Shipping webhook processing failed:', error);
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Webhook processing failed'
    });
  }
}
