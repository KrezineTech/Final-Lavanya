import { NextApiRequest, NextApiResponse } from 'next';
import { orderService } from '@/services/orderService';
import { processRefundSchema, validateRequestBody } from '@/lib/validators/orders';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId } = req.query;

  if (!orderId || typeof orderId !== 'string') {
    return res.status(400).json({ error: 'Invalid order ID' });
  }

  try {
    const refundData = validateRequestBody(processRefundSchema, req.body);
    const actorId = req.headers['x-admin-id'] as string || 'system';

    const refund = await orderService.processRefund({
      orderId,
      ...refundData,
    }, actorId);

    return res.status(201).json(refund);
  } catch (error) {
    console.error('Failed to process refund:', error);
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to process refund'
    });
  }
}
