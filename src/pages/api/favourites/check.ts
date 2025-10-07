import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

/**
 * Check Favourite API
 * Checks if a product is in user's favourites
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { productId, frontendUserId, userId, guestId } = req.query;

    if (!productId) {
      return res.status(400).json({ 
        error: 'productId is required' 
      });
    }

    if (!frontendUserId && !userId && !guestId) {
      return res.status(400).json({ 
        error: 'frontendUserId, userId, or guestId is required' 
      });
    }

    const favourite = await prisma.favourite.findFirst({
      where: {
        productId: productId as string,
        OR: [
          frontendUserId ? { frontendUserId: frontendUserId as string } : {},
          userId ? { userId: userId as string } : {},
          guestId ? { guestId: guestId as string } : {}
        ].filter(condition => Object.keys(condition).length > 0)
      }
    });

    return res.status(200).json({ 
      success: true,
      isFavourite: !!favourite,
      favouriteId: favourite?.id || null
    });

  } catch (error) {
    console.error('Check favourite error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
