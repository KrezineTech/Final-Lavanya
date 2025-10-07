import { z } from 'zod';

// Order filters validation
export const orderFiltersSchema = z.object({
  paymentStatus: z.array(z.enum(['PENDING', 'AUTHORIZED', 'CAPTURED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'VOIDED', 'FAILED'])).optional(),
  fulfillmentStatus: z.array(z.enum(['UNFULFILLED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'PARTIALLY_DELIVERED', 'DELIVERED', 'CANCELLED'])).optional(),
  q: z.string().optional(),
  from: z.string().pipe(z.coerce.date()).optional(),
  to: z.string().pipe(z.coerce.date()).optional(),
  minTotal: z.number().min(0).optional(),
  maxTotal: z.number().min(0).optional(),
});

// Order sorting validation
export const orderSortSchema = z.object({
  field: z.enum(['createdAt', 'grandTotalCents', 'number']).default('createdAt'),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

// Pagination validation
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

// Order update validation
export const updateOrderSchema = z.object({
  tags: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),
});

// Cancel order validation
export const cancelOrderSchema = z.object({
  reason: z.string().min(1).max(500),
});

// Create fulfillment validation
export const createFulfillmentSchema = z.object({
  items: z.array(z.object({
    orderItemId: z.string().cuid(),
    quantity: z.number().int().min(1),
  })).min(1),
  carrier: z.string().optional(),
  service: z.string().optional(),
  fromAddressId: z.string().cuid().optional(),
  options: z.object({
    signature: z.boolean().optional(),
    insurance: z.boolean().optional(),
  }).optional(),
});

// Capture payment validation
export const capturePaymentSchema = z.object({
  amountCents: z.number().int().min(1).optional(),
});

// Process refund validation
export const processRefundSchema = z.object({
  amountCents: z.number().int().min(1),
  items: z.array(z.object({
    orderItemId: z.string().cuid(),
    quantity: z.number().int().min(1),
  })).optional(),
  reason: z.string().max(500).optional(),
});

// Shipment tracking update validation
export const shipmentTrackingUpdateSchema = z.object({
  status: z.enum(['PENDING', 'LABEL_CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION', 'CANCELLED']),
  description: z.string().optional(),
  location: z.string().optional(),
  timestamp: z.string().pipe(z.coerce.date()),
  metadata: z.record(z.any()).optional(),
});

// Address validation
export const addressSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  company: z.string().max(100).optional(),
  address1: z.string().min(1).max(200),
  address2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100).optional(),
  postalCode: z.string().min(1).max(20),
  country: z.string().length(2).default('US'),
  phone: z.string().max(20).optional(),
});

// Export orders validation
export const exportOrdersSchema = z.object({
  filters: orderFiltersSchema.optional(),
  format: z.enum(['csv', 'xlsx']).default('csv'),
});

// Webhook validation
export const webhookPaymentSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.record(z.any()),
  }),
  created: z.number(),
});

export const webhookShippingSchema = z.object({
  tracking_number: z.string(),
  status: z.string(),
  description: z.string().optional(),
  location: z.string().optional(),
  timestamp: z.string(),
  carrier: z.string().optional(),
});

// Notification schema
export const notificationSchema = z.object({
  type: z.enum(['order_confirmation', 'payment_received', 'order_shipped', 'order_delivered', 'refund_processed']),
  template: z.string().optional(),
  customMessage: z.string().max(1000).optional(),
});

// Audit log query schema
export const auditLogQuerySchema = z.object({
  entityType: z.string().optional(),
  actor: z.string().optional(),
  action: z.string().optional(),
  from: z.string().pipe(z.coerce.date()).optional(),
  to: z.string().pipe(z.coerce.date()).optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

// Rate quote validation
export const quoteRatesSchema = z.object({
  fromAddressId: z.string().cuid(),
  toAddressId: z.string().cuid(),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number().int().min(1),
    weightGrams: z.number().min(1),
    valueCents: z.number().int().min(0),
  })).min(1),
  options: z.object({
    signature: z.boolean().optional(),
    insurance: z.boolean().optional(),
  }).optional(),
});

// Helper function to validate request body
export function validateRequestBody<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Validation failed: ${messages.join(', ')}`);
    }
    throw error;
  }
}

// Helper function to validate query parameters
export function validateQueryParams<T>(schema: z.ZodSchema<T>, params: Record<string, string | string[]>): T {
  // Convert query params to appropriate types
  const processed: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      processed[key] = value;
    } else if (value === 'true') {
      processed[key] = true;
    } else if (value === 'false') {
      processed[key] = false;
    } else if (!isNaN(Number(value)) && value !== '') {
      processed[key] = Number(value);
    } else {
      processed[key] = value;
    }
  }
  
  try {
    return schema.parse(processed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Query validation failed: ${messages.join(', ')}`);
    }
    throw error;
  }
}
