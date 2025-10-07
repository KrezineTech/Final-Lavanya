import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

/**
 * Admin Favourites Stats API
 * Provides aggregated statistics about favourites for analytics
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { startDate, endDate } = req.query;

    console.log('📊 Favourites stats request:', { startDate, endDate });

    // Build date filter if provided
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate as string);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate as string);
    }

    const whereClause = Object.keys(dateFilter).length > 0 
      ? { createdAt: dateFilter }
      : {};

    console.log('📊 Where clause:', whereClause);

    // Get total favourites count
    const totalFavourites = await prisma.favourite.count({
      where: whereClause
    });

    console.log('📊 Total favourites:', totalFavourites);

    // Get unique users who favourited
    const uniqueUsers = await prisma.favourite.groupBy({
      by: ['frontendUserId', 'userId', 'guestId'],
      where: whereClause,
      _count: true
    });

    const uniqueUserCount = uniqueUsers.filter(u => 
      u.frontendUserId || u.userId || u.guestId
    ).length;

    // Get products by favourites count (top favourited products)
    const topFavouritedProducts = await prisma.favourite.groupBy({
      by: ['productId'],
      where: whereClause,
      _count: {
        productId: true
      },
      orderBy: {
        _count: {
          productId: 'desc'
        }
      },
      take: 10
    });

    // Get product details for top favourited
    const productIds = topFavouritedProducts.map(f => f.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds }
      },
      select: {
        id: true,
        name: true,
        slug: true,
        priceCents: true,
        media: {
          where: { isPrimary: true },
          take: 1,
          select: {
            filePath: true
          }
        }
      }
    });

    // Combine product data with favourite counts
    const topProducts = topFavouritedProducts.map(fav => {
      const product = products.find(p => p.id === fav.productId);
      return {
        productId: fav.productId,
        productName: product?.name || 'Unknown',
        productSlug: product?.slug || '',
        favouriteCount: fav._count.productId,
        imageUrl: product?.media?.[0]?.filePath || null
      };
    });

    // Get favourites by product (for analytics page)
    const favouritesByProduct = await prisma.favourite.groupBy({
      by: ['productId'],
      where: whereClause,
      _count: {
        productId: true
      }
    });

    // Create a map of productId to favourite count
    const productFavouriteMap: Record<string, number> = {};
    favouritesByProduct.forEach(item => {
      productFavouriteMap[item.productId] = item._count.productId;
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalFavourites,
        uniqueUsers: uniqueUserCount,
        topProducts,
        productFavouriteMap, // Map for quick lookup by productId
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching favourites stats:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
    return res.status(500).json({ 
      error: 'Failed to fetch favourites statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : String(error)
    });
  }
}
