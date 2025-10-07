import { NextApiRequest, NextApiResponse } from 'next';
import { orderService } from '@/services/orderService';
import { capturePaymentSchema, validateRequestBody } from '@/lib/validators/orders';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId } = req.query;

  if (!orderId || typeof orderId !== 'string') {
    return res.status(400).json({ error: 'Invalid order ID' });
  }

  try {
    const captureData = validateRequestBody(capturePaymentSchema, req.body);
    const actorId = req.headers['x-admin-id'] as string || 'system';

    const payment = await orderService.capturePayment(orderId, captureData.amountCents, actorId);

    return res.status(200).json(payment);
  } catch (error) {
    console.error('Failed to capture payment:', error);
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to capture payment'
    });
  }
}
