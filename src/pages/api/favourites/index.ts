import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

/**
 * Admin Favourites API
 * Manages user favourites in the database
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return await getFavourites(req, res);
      case 'POST':
        return await addFavourite(req, res);
      case 'DELETE':
        return await removeFavourite(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Favourites API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Get user's favourites
async function getFavourites(req: NextApiRequest, res: NextApiResponse) {
  const { frontendUserId, userId, guestId } = req.query;

  if (!frontendUserId && !userId && !guestId) {
    return res.status(400).json({ 
      error: 'frontendUserId, userId, or guestId is required' 
    });
  }

  try {
    const favourites = await prisma.favourite.findMany({
      where: {
        OR: [
          frontendUserId ? { frontendUserId: frontendUserId as string } : {},
          userId ? { userId: userId as string } : {},
          guestId ? { guestId: guestId as string } : {}
        ].filter(condition => Object.keys(condition).length > 0)
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            priceCents: true,
            media: {
              where: { isPrimary: true },
              take: 1,
              select: {
                filePath: true,
                isPrimary: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.status(200).json({ 
      success: true,
      favourites,
      count: favourites.length
    });

  } catch (error) {
    console.error('Error fetching favourites:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch favourites',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Add product to favourites
async function addFavourite(req: NextApiRequest, res: NextApiResponse) {
  const { productId, frontendUserId, userId, guestId } = req.body;

  if (!productId) {
    return res.status(400).json({ error: 'productId is required' });
  }

  if (!frontendUserId && !userId && !guestId) {
    return res.status(400).json({ 
      error: 'frontendUserId, userId, or guestId is required' 
    });
  }

  try {
    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if already favourited
    const existing = await prisma.favourite.findFirst({
      where: {
        productId,
        OR: [
          frontendUserId ? { frontendUserId } : {},
          userId ? { userId } : {},
          guestId ? { guestId } : {}
        ].filter(condition => Object.keys(condition).length > 0)
      }
    });

    if (existing) {
      return res.status(200).json({ 
        success: true,
        message: 'Product already in favourites',
        favourite: existing,
        alreadyExists: true
      });
    }

    // Create favourite
    const favourite = await prisma.favourite.create({
      data: {
        productId,
        frontendUserId: frontendUserId || null,
        userId: userId || null,
        guestId: guestId || null
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            priceCents: true
          }
        }
      }
    });

    console.log('✅ Favourite added:', {
      productId,
      frontendUserId,
      userId,
      guestId
    });

    return res.status(201).json({ 
      success: true,
      favourite,
      message: 'Product added to favourites'
    });

  } catch (error) {
    console.error('Error adding favourite:', error);
    return res.status(500).json({ 
      error: 'Failed to add favourite',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Remove product from favourites
async function removeFavourite(req: NextApiRequest, res: NextApiResponse) {
  const { productId, frontendUserId, userId, guestId } = req.query;

  if (!productId) {
    return res.status(400).json({ error: 'productId is required' });
  }

  if (!frontendUserId && !userId && !guestId) {
    return res.status(400).json({ 
      error: 'frontendUserId, userId, or guestId is required' 
    });
  }

  try {
    // Find and delete the favourite
    const deleted = await prisma.favourite.deleteMany({
      where: {
        productId: productId as string,
        OR: [
          frontendUserId ? { frontendUserId: frontendUserId as string } : {},
          userId ? { userId: userId as string } : {},
          guestId ? { guestId: guestId as string } : {}
        ].filter(condition => Object.keys(condition).length > 0)
      }
    });

    if (deleted.count === 0) {
      return res.status(404).json({ 
        error: 'Favourite not found',
        success: false
      });
    }

    console.log('✅ Favourite removed:', {
      productId,
      frontendUserId,
      userId,
      guestId,
      deletedCount: deleted.count
    });

    return res.status(200).json({ 
      success: true,
      message: 'Product removed from favourites',
      deletedCount: deleted.count
    });

  } catch (error) {
    console.error('Error removing favourite:', error);
    return res.status(500).json({ 
      error: 'Failed to remove favourite',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
