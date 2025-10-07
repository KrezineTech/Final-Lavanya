import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../../lib/prisma';

// Persistent file storage for orders
const ORDERS_FILE_PATH = path.join(process.cwd(), 'data', 'orders.json');

// Ensure data directory exists
const dataDir = path.dirname(ORDERS_FILE_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Helper functions for persistent storage
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

function saveOrders(orders: any[]): void {
  try {
    fs.writeFileSync(ORDERS_FILE_PATH, JSON.stringify(orders, null, 2));
  } catch (error) {
    console.error('Error saving orders:', error);
  }
}

// Helper function to convert cents to currency amounts for database
function convertToCents(amount: number): number {
  return Math.round(amount * 100);
}

// Helper function to persist order to database
async function persistOrderToDatabase(orderData: any): Promise<void> {
  console.log(`🔄 Starting database persistence for order: ${orderData.id}`);
  console.log(`📧 Customer email: ${orderData.customerEmail}`);
  
  try {
    // Parse totalPrice to get amount in base currency
    const totalAmount = parseFloat(orderData.totalPrice?.replace(/[^\d.]/g, '') || '0');
    
    // Handle both formats: cents (integer) or dollars (float/string)
    const subtotalCents = orderData.subtotalCents !== undefined 
      ? orderData.subtotalCents 
      : convertToCents(orderData.subtotal || 0);
    
    const taxCents = orderData.taxCents !== undefined
      ? orderData.taxCents
      : convertToCents(orderData.tax || 0);
    
    const grandTotal = orderData.totalAmountCents !== undefined
      ? orderData.totalAmountCents
      : (orderData.grandTotalCents !== undefined ? orderData.grandTotalCents : convertToCents(totalAmount));
    
    // Prepare discount metadata if applied
    const discountMetadata = orderData.appliedDiscount ? {
      discountCode: orderData.appliedDiscount.code,
      discountId: orderData.appliedDiscount.id,
      discountTitle: orderData.appliedDiscount.title,
      discountAmount: orderData.appliedDiscount.discountAmount,
      freeItemsSavings: orderData.freeItemsSavings || 0,
    } : (orderData.metadata?.appliedDiscount || null);
    
    console.log(`📝 Preparing database order with number: ${orderData.id.replace('#', '').replace(/^TEST-/, 'ORD-TEST-')}`);
    console.log(`📝 Items to create: ${orderData.items?.length || 0}`);
    console.log(`👤 Customer Name: ${orderData.customerName}`);
    console.log(`📧 Customer Email: ${orderData.customerEmail}`);
    console.log(`👤 User ID: ${orderData.userId || orderData.frontendUserId || 'none (guest order)'}`);
    
    // Create order in database
    let dbOrder;
    try {
      dbOrder = await prisma.order.create({
        data: {
          number: orderData.id.replace('#', '').replace(/^TEST-/, 'ORD-TEST-'), // Handle test orders
          // Set userId/frontendUserId only if provided (for logged-in users)
          userId: orderData.userId || null,
          frontendUserId: orderData.frontendUserId || null,
          // Set guestEmail only for non-logged-in orders
          guestEmail: (orderData.userId || orderData.frontendUserId) ? null : orderData.customerEmail,
          guestPhone: orderData.customerPhone || null, // Store customer phone number
          customerName: orderData.customerName, // Use the name from the checkout form
          subtotalCents: subtotalCents,
          shippingCents: convertToCents(parseFloat(orderData.shipping?.cost?.replace(/[^\d.]/g, '') || '0')),
          taxCents: taxCents,
          discountCents: convertToCents(orderData.appliedDiscount?.discountAmount || orderData.appliedDiscount?.discountAmountCents || 0),
          grandTotalCents: grandTotal,
          currency: 'USD',
          paymentStatus: 'PENDING',
          fulfillmentStatus: 'UNFULFILLED',
          metadata: {
            frontendOrderId: orderData.id,
            isGift: orderData.isGift || false,
            isPersonalizable: orderData.isPersonalizable || false,
            destinationCountry: orderData.destinationCountry,
            shippingAddress: orderData.shippingAddress,
            billingAddress: orderData.billingAddress,
            customerPhone: orderData.customerPhone || null,
            // Store applied discount information for Buy X Get Y
            appliedDiscount: discountMetadata,
          },
          items: {
            create: orderData.items?.map((item: any) => {
              // Handle both frontend format (price in dollars) and test format (priceCents)
              const itemPrice = item.priceCents !== undefined 
                ? item.priceCents  // Already in cents, don't convert
                : convertToCents(item.price || 0); // In dollars, convert to cents
              
              const itemOriginalPrice = item.originalPriceCents !== undefined
                ? item.originalPriceCents // Already in cents
                : (item.originalPrice ? convertToCents(item.originalPrice) : null); // In dollars, convert
              
              return {
                name: item.name || item.productName, // Support both formats
                priceCents: itemPrice,
                quantity: item.quantity,
                sku: item.sku || `SKU-${item.productId || 'unknown'}`,
                productId: null, // Set to null to avoid foreign key constraint issues - will be linked later if needed
                // Buy X Get Y Free Product Fields
                isFreeItem: item.isFreeItem || false,
                originalPriceCents: itemOriginalPrice,
                freeItemType: item.freeItemType || null,
                discountCode: item.discountCode || orderData.appliedDiscount?.code || null,
                productCategoryId: null, // Will be populated if needed via product lookup
                metadata: {
                  image: item.image,
                  total: item.total,
                  size: item.size,
                  color: item.color,
                  productId: item.productId || null, // Store original productId in metadata
                }
              };
            }) || []
          }
        },
        include: {
          items: true
        }
      });
      console.log('✅ Prisma order.create succeeded');
    } catch (createError: any) {
      console.error('❌ Prisma order.create FAILED:', createError.message);
      console.error('❌ Error code:', createError.code);
      if (createError.meta) {
        console.error('❌ Error meta:', JSON.stringify(createError.meta, null, 2));
      }
      throw createError;
    }

    console.log(`✅ Order ${orderData.id} persisted to database with ID: ${dbOrder.id}`);
    
    // Log free items information (using any type to avoid TypeScript errors until Prisma regenerates)
    const freeItems = dbOrder.items.filter((item: any) => item.isFreeItem);
    if (freeItems.length > 0) {
      console.log(`🎁 Order contains ${freeItems.length} free item(s) from Buy X Get Y discount:`);
      freeItems.forEach((item: any) => {
        const savings = item.originalPriceCents ? (item.originalPriceCents / 100).toFixed(2) : '0.00';
        console.log(`   - ${item.name} (${item.quantity}x) - Saved: $${savings} - Code: ${item.discountCode}`);
      });
    }
    
    // If userId provided, log the user association
    if (orderData.userId) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: orderData.userId },
          select: { email: true, id: true }
        });
        if (user) {
          console.log(`👤 Order associated with user: ${user.email} (${user.id})`);
        }
      } catch (userError) {
        console.warn('⚠️ Could not fetch user details for logging:', userError);
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to persist order to database:', error);
    throw error; // Re-throw to be handled by caller
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const orderData = req.body;
      
      // Validate required order data
      if (!orderData.id || !orderData.customerEmail) {
        return res.status(400).json({ 
          error: 'Missing required order data: id and customerEmail are required' 
        });
      }
      
      // Load existing orders for file storage
      const orders = loadOrders();
      
      // Check if order already exists (prevent duplicates)
      const existingIndex = orders.findIndex(order => order.id === orderData.id);
      if (existingIndex >= 0) {
        // Update existing order in file storage
        orders[existingIndex] = orderData;
        console.log('📄 Order updated in file storage:', orderData.id);
      } else {
        // Add new order to file storage
        orders.push(orderData);
        console.log('📄 Order synced to file storage:', orderData.id);
      }
      
      // Save orders to persistent file storage
      saveOrders(orders);
      
      // Persist order to database (with user association if userId provided)
      try {
        await persistOrderToDatabase(orderData);
      } catch (dbError) {
        console.error('⚠️ Database persistence failed, but file storage succeeded:', dbError);
        console.error('⚠️ Full error details:', JSON.stringify(dbError, null, 2));
        // Don't fail the entire request if database fails - file storage is backup
      }
      
      return res.status(200).json({ 
        success: true, 
        message: 'Order synced successfully',
        orderId: orderData.id,
        userId: orderData.userId || null
      });
    } catch (error) {
      console.error('Order sync error:', error);
      return res.status(500).json({ error: 'Failed to sync order' });
    }
  }

  if (req.method === 'GET') {
    const orders = loadOrders();
    return res.status(200).json({ orders });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}