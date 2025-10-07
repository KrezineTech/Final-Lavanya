import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { createShippingService } from '@/services/shippingService';
import { quoteRatesSchema, validateRequestBody } from '@/lib/validators/orders';

const prisma = new PrismaClient();
const shippingService = createShippingService();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const quoteData = validateRequestBody(quoteRatesSchema, req.body);

    // Get addresses
    const [fromAddress, toAddress] = await Promise.all([
      prisma.address.findUnique({ where: { id: quoteData.fromAddressId } }),
      prisma.address.findUnique({ where: { id: quoteData.toAddressId } }),
    ]);

    if (!fromAddress || !toAddress) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // Create shipping request
    const shippingRequest = {
      fromAddress,
      toAddress,
      items: quoteData.items,
      insurance: quoteData.options?.insurance,
      signature: quoteData.options?.signature,
    };

    const rates = await shippingService.quoteRates(shippingRequest);

    return res.status(200).json({ rates });
  } catch (error) {
    console.error('Failed to quote shipping rates:', error);
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to quote rates'
    });
  }
}
