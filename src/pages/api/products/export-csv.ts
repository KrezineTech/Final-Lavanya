import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { generateProductCSV } from '../../../lib/product-csv-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    console.log('Starting CSV export...');
    
    // Fetch all products with their relations
    const products = await prisma.product.findMany({
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        collections: {
          include: {
            collection: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        media: {
          select: {
            id: true,
            fileName: true,
            filePath: true,
            fileType: true,
            altText: true,
            isPrimary: true
          },
          orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'asc' }
          ]
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${products.length} products to export`);

    // Generate CSV content
    const csvContent = generateProductCSV(products);
    
    // Set headers for file download
    const filename = `products-export-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    console.log('CSV export completed successfully');
    return res.status(200).send(csvContent);
    
  } catch (error) {
    console.error('Error exporting products to CSV:', error);
    return res.status(500).json({ 
      error: 'Failed to export products to CSV',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
