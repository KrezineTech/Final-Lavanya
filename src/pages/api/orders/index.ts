import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../../lib/prisma';

// Persistent file storage for orders
const ORDERS_FILE_PATH = path.join(process.cwd(), 'data', 'orders.json');

function saveOrders(orders: any[]): void {
  try {
    fs.writeFileSync(ORDERS_FILE_PATH, JSON.stringify(orders, null, 2));
  } catch (error) {
    console.error('Error saving orders:', error);
  }
}

// Helper function to get product image by SKU
async function getProductImageBySku(sku: string | null | undefined): Promise<string> {
  try {
    // Handle null/undefined SKU
    if (!sku) {
      return '/placeholder-product.jpg';
    }
    
    // Remove any prefixes from SKU like "SKU-" 
    const cleanSku = sku.replace(/^SKU-/, '');
    
    // Try to find product by SKU in database
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { sku: sku },
          { sku: cleanSku },
          { id: cleanSku }, // Also try by ID since some SKUs might be product IDs
        ]
      },
      include: {
        media: {
          where: { isPrimary: true },
          orderBy: { isPrimary: 'desc' },
          take: 1
        }
      }
    });

    if (product && product.media && product.media.length > 0) {
      // Return the primary image URL
      const media = product.media[0];
      if (media.filePath.startsWith('http')) {
        return media.filePath;
      } else {
        // Construct full URL for local images, avoiding double slashes
        const cleanPath = media.filePath.replace(/^\/+uploads\/+/, '');
        return `/uploads/${cleanPath}`;
      }
    }

    // If no product found or no image, try a few fallback patterns
    if (cleanSku === 'cmf3kvhsq0007kufc4wl4bj6t') {
      // This is the Lord Ganesha painting - use a specific image
      return 'https://krezine.in/assets/images/artworks/ganesha-painting-1.jpg';
    }

    // Default fallback
    return 'https://placehold.co/80x80.png';
  } catch (error) {
    console.error('Error fetching product image:', error);
    return 'https://placehold.co/80x80.png';
  }
}

// Helper function to load orders from persistent storage
async function loadPersistentOrders(): Promise<any[]> {
  try {
    const ordersFilePath = path.join(process.cwd(), 'data', 'orders.json');
    if (fs.existsSync(ordersFilePath)) {
      const data = fs.readFileSync(ordersFilePath, 'utf8');
      const orders = JSON.parse(data);
      
      // Transform persistent orders to match the expected format with real product images
      const transformedOrders = await Promise.all(orders.map(async (order: any) => {
        // Extract the main product from items array
        const mainItem = order.items && order.items[0];
        
        // Get the actual product image
        const productImage = mainItem ? await getProductImageBySku(mainItem.sku) : 'https://placehold.co/80x80.png';
        
        return {
          id: order.id,
          shipByDate: order.shipByDate,
          customerName: order.customerName || 'Unknown Customer',
          customerEmail: order.customerEmail || null,
          customerPhone: order.customerPhone || null,
          totalPrice: order.totalPrice,
          isGift: order.isGift || false,
          isPersonalizable: order.isPersonalizable || false,
          // Include all items with free item data
          items: order.items?.map((item: any) => ({
            name: item.name || 'Unknown Item',
            price: item.price || 0,
            quantity: item.quantity || 1,
            sku: item.sku || 'N/A',
            image: item.image || null,
            total: item.total || (item.price * item.quantity),
            productId: item.productId || null,
            size: item.size || 'Standard',
            color: item.color || 'Default',
            isFreeItem: item.isFreeItem || false,
            originalPrice: item.originalPrice || null,
            freeItemType: item.freeItemType || null,
            discountCode: item.discountCode || null,
          })) || [],
          // Include applied discount information
          appliedDiscount: order.appliedDiscount || null,
          freeItemsSavings: order.freeItemsSavings || 0,
          product: mainItem ? {
            name: mainItem.name || 'Unknown Product',
            image: productImage, // Use actual product image instead of placeholder
            hint: (mainItem.name || 'unknown').toLowerCase(),
            quantity: mainItem.quantity,
            sku: mainItem.sku,
            size: 'Standard',
            personalization: '',
            price: mainItem.price,
            transactionId: mainItem.sku,
          } : null,
          orderedDate: order.orderedDate || order.createdAt,
          shipping: order.shipping || {
            method: 'Standard Shipping',
            cost: 'US$ 0.00',
            destination: 'Unknown'
          },
          subtotal: order.subtotal || 0,
          tax: order.tax || 0,
          total: order.total || 0,
          shippingAddress: order.shippingAddress || 'Address not available',
          billingAddress: order.billingAddress || order.shippingAddress || 'Address not available',
          destinationCountry: order.destinationCountry || 'Unknown',
          hasNote: order.hasNote || false,
          status: order.status || 'Not Shipped',
          paymentStatus: order.paymentStatus || 'Pending',
          fulfillmentStatus: order.fulfillmentStatus || 'Unfulfilled',
        };
      }));
      
      return transformedOrders;
    }
  } catch (error) {
    console.error('Error loading persistent orders:', error);
  }
  return [];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log(`🔐 Orders API access - authentication removed`);

  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const { query } = req;
      
      // Parse filters
      const filters: any = {};
      
      if (query.paymentStatus) {
        filters.paymentStatus = Array.isArray(query.paymentStatus) 
          ? query.paymentStatus 
          : query.paymentStatus.split(',');
      }
      
      if (query.fulfillmentStatus) {
        filters.fulfillmentStatus = Array.isArray(query.fulfillmentStatus) 
          ? query.fulfillmentStatus 
          : query.fulfillmentStatus.split(',');
      }
      
      if (query.q) filters.q = query.q as string;
      if (query.from) filters.from = new Date(query.from as string);
      if (query.to) filters.to = new Date(query.to as string);
      if (query.minTotal) filters.minTotal = Number(query.minTotal);
      if (query.maxTotal) filters.maxTotal = Number(query.maxTotal);
      if (query.destination) filters.destination = query.destination as string;
      if (query.status) filters.status = query.status as string;

      // Parse sort
      const sortField = (query.sort as string) || 'createdAt';
      const sort = {
        field: ['createdAt', 'grandTotalCents', 'number'].includes(sortField) 
          ? (sortField as 'createdAt' | 'grandTotalCents' | 'number')
          : 'createdAt',
        direction: (query.direction as 'asc' | 'desc') || 'desc',
      };

      // Parse pagination
      const pagination = {
        page: Number(query.page) || 1,
        pageSize: Math.min(Number(query.pageSize) || 20, 100),
      };

      // Load persistent orders from JSON file
      let persistentOrders = await loadPersistentOrders();
      console.log(`📊 Orders API - Persistent orders loaded from JSON: ${persistentOrders.length}`);
      
      // Load orders from database
      let dbOrders: any[] = [];
      try {
        const ordersFromDb = await prisma.order.findMany({
          include: {
            items: true,
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
        
        console.log(`📊 Orders API - Database orders loaded: ${ordersFromDb.length}`);
        
        // Transform database orders to match the expected format
        dbOrders = await Promise.all(ordersFromDb.map(async (order: any) => {
          const mainItem = order.items && order.items[0];
          const productImage = mainItem ? await getProductImageBySku(mainItem.sku) : 'https://placehold.co/80x80.png';
          
          // Convert from database format to frontend format
          const totalPrice = `US$ ${(order.grandTotalCents / 100).toFixed(2)}`;
          
          return {
            id: `#${order.number.replace('ORD-', '')}`,
            shipByDate: order.createdAt ? new Date(new Date(order.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            customerName: order.customerName || 'Unknown Customer',
            customerEmail: order.guestEmail || 'unknown@example.com',
            customerPhone: order.guestPhone || order.metadata?.customerPhone || null,
            totalPrice: totalPrice,
            isGift: order.metadata?.isGift || false,
            isPersonalizable: order.metadata?.isPersonalizable || false,
            items: await Promise.all(order.items.map(async (item: any) => ({
              name: item.name,
              price: item.priceCents / 100,
              quantity: item.quantity,
              sku: item.sku,
              image: item.metadata?.image || await getProductImageBySku(item.sku),
              total: (item.priceCents * item.quantity) / 100,
              productId: item.metadata?.productId || item.productId || null,
              size: item.metadata?.size || 'Standard',
              color: item.metadata?.color || 'Default',
              // Include free item metadata
              isFreeItem: item.isFreeItem || false,
              originalPrice: item.originalPriceCents ? item.originalPriceCents / 100 : null,
              freeItemType: item.freeItemType || null,
              discountCode: item.discountCode || null,
            }))),
            // Include applied discount information
            appliedDiscount: order.metadata?.appliedDiscount || null,
            freeItemsSavings: order.metadata?.appliedDiscount?.freeItemsSavings || 0,
            product: mainItem ? {
              name: mainItem.name,
              image: productImage,
              hint: mainItem.name.toLowerCase(),
              quantity: mainItem.quantity,
              sku: mainItem.sku,
              size: 'Standard',
              personalization: '',
              price: mainItem.priceCents / 100,
              transactionId: mainItem.sku,
            } : null,
            orderedDate: order.createdAt?.toISOString() || new Date().toISOString(),
            createdAt: order.createdAt?.toISOString() || new Date().toISOString(),
            shipping: {
              method: 'Standard Shipping',
              cost: `US$ ${(order.shippingCents / 100).toFixed(2)}`,
              destination: order.metadata?.destinationCountry || 'Unknown'
            },
            subtotal: order.subtotalCents / 100,
            tax: order.taxCents / 100,
            total: order.grandTotalCents / 100,
            shippingAddress: order.metadata?.shippingAddress || 'Address not available',
            billingAddress: order.metadata?.billingAddress || order.metadata?.shippingAddress || 'Address not available',
            destinationCountry: order.metadata?.destinationCountry || 'Unknown',
            hasNote: false,
            status: order.fulfillmentStatus === 'UNFULFILLED' ? 'Not Shipped' : order.fulfillmentStatus,
            paymentStatus: order.paymentStatus || 'Pending',
            fulfillmentStatus: order.fulfillmentStatus || 'Unfulfilled',
          };
        }));
      } catch (dbError) {
        console.error('📊 Error loading orders from database:', dbError);
      }
      
      // Merge orders from both sources (database + JSON file)
      // Use a Map to avoid duplicates based on order ID
      const ordersMap = new Map();
      
      // Add database orders first (they are more authoritative)
      dbOrders.forEach(order => {
        ordersMap.set(order.id, order);
      });
      
      // Add persistent orders (only if not already in database)
      persistentOrders.forEach(order => {
        if (!ordersMap.has(order.id)) {
          ordersMap.set(order.id, order);
        }
      });
      
      let allOrders = Array.from(ordersMap.values());
      console.log(`📊 Orders API - Total merged orders: ${allOrders.length} (DB: ${dbOrders.length}, JSON: ${persistentOrders.length})`);
      
      // Apply filters to merged orders
      if (filters.q) {
        const searchTerm = filters.q.toLowerCase();
        allOrders = allOrders.filter(order => 
          order.id?.toLowerCase().includes(searchTerm) ||
          order.customerName?.toLowerCase().includes(searchTerm) ||
          order.customerEmail?.toLowerCase().includes(searchTerm) ||
          order.items?.some((item: any) => item.name?.toLowerCase().includes(searchTerm))
        );
      }
      
      if (filters.destination && filters.destination !== 'All') {
        allOrders = allOrders.filter(order => 
          order.destinationCountry === filters.destination
        );
      }
      
      if (filters.status && filters.status !== 'All') {
        allOrders = allOrders.filter(order => 
          order.status === filters.status
        );
      }
      
      if (filters.paymentStatus && filters.paymentStatus.length > 0) {
        allOrders = allOrders.filter(order => 
          filters.paymentStatus.includes(order.paymentStatus)
        );
      }
      
      if (filters.fulfillmentStatus && filters.fulfillmentStatus.length > 0) {
        allOrders = allOrders.filter(order => 
          filters.fulfillmentStatus.includes(order.fulfillmentStatus)
        );
      }
      
      if (filters.from) {
        allOrders = allOrders.filter(order => 
          new Date(order.createdAt) >= filters.from
        );
      }
      
      if (filters.to) {
        allOrders = allOrders.filter(order => 
          new Date(order.createdAt) <= filters.to
        );
      }
      
      console.log(`📊 Orders API - Total orders after filtering: ${allOrders.length}`);
      
      return res.status(200).json({
        orders: allOrders,
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: allOrders.length,
          totalPages: Math.ceil(allOrders.length / pagination.pageSize),
        }
      });

    } catch (error) {
      console.error('Failed to fetch orders:', error);
      
      // Fallback: return persistent orders only
      try {
        const persistentOrders = await loadPersistentOrders();
        return res.status(200).json({
          orders: persistentOrders,
          pagination: {
            page: 1,
            pageSize: 20,
            total: persistentOrders.length,
            totalPages: Math.ceil(persistentOrders.length / 20),
          }
        });
      } catch (fallbackError) {
        return res.status(500).json({
          error: 'Failed to load orders from any source',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { orderId, updates } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ error: 'Order ID is required' });
      }

      // Ensure proper ID handling (decode if needed)
      const cleanOrderId = typeof orderId === 'string' ? decodeURIComponent(orderId) : orderId;
      console.log(`📊 Attempting to update order: "${orderId}" -> "${cleanOrderId}" with updates:`, updates);

      // Load existing raw orders (not transformed)
      const ordersFilePath = path.join(process.cwd(), 'data', 'orders.json');
      
      if (!fs.existsSync(ordersFilePath)) {
        return res.status(404).json({ error: 'Orders data file not found' });
      }

      const rawOrdersData = fs.readFileSync(ordersFilePath, 'utf8');
      const orders = JSON.parse(rawOrdersData);
      
      const orderIndex = orders.findIndex((order: any) => 
        order.id === cleanOrderId || order.id === orderId
      );
      
      if (orderIndex === -1) {
        console.log(`📊 Order not found: "${cleanOrderId}". Available orders:`, orders.map((o: any) => o.id));
        return res.status(404).json({ error: 'Order not found' });
      }

      // Update the order with raw data structure
      const updatedOrder = {
        ...orders[orderIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      orders[orderIndex] = updatedOrder;
      
      // Save updated orders
      fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2));

      console.log(`📊 Order ${cleanOrderId} updated successfully`);
      
      // Transform the updated order for response
      const mainItem = updatedOrder.items && updatedOrder.items[0];
      const productImage = mainItem ? await getProductImageBySku(mainItem.sku) : 'https://placehold.co/80x80.png';
      
      const transformedOrder = {
        id: updatedOrder.id,
        shipByDate: updatedOrder.shipByDate,
        customerName: updatedOrder.customerName || 'Unknown Customer',
        totalPrice: updatedOrder.totalPrice,
        isGift: updatedOrder.isGift || false,
        isPersonalizable: updatedOrder.isPersonalizable || false,
        product: mainItem ? {
          name: mainItem.name,
          image: productImage, // Use actual product image
          hint: mainItem.name.toLowerCase(),
          quantity: mainItem.quantity,
          sku: mainItem.sku,
          size: 'Standard',
          personalization: '',
          price: mainItem.price,
          transactionId: mainItem.sku,
        } : null,
        orderedDate: updatedOrder.orderedDate || updatedOrder.createdAt,
        shipping: updatedOrder.shipping || {
          method: 'Standard Shipping',
          cost: 'US$ 0.00',
          destination: 'Unknown'
        },
        shippingAddress: updatedOrder.shippingAddress || 'Address not available',
        destinationCountry: updatedOrder.destinationCountry || 'Unknown',
        hasNote: updatedOrder.hasNote || false,
        status: updatedOrder.status || 'Not Shipped',
      };
      
      return res.status(200).json({
        success: true,
        order: transformedOrder
      });

    } catch (error: any) {
      console.error('Failed to update order:', error);
      return res.status(500).json({
        error: 'Failed to update order',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
