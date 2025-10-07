import { PrismaClient, Order, OrderItem, Payment, Shipment, Refund, PaymentStatus, FulfillmentStatus, ShipmentStatus, RefundStatus } from '@prisma/client';
import { createPaymentService } from './paymentService';
import { createShippingService } from './shippingService';

const prisma = new PrismaClient();

export interface OrderFilters {
  paymentStatus?: PaymentStatus[];
  fulfillmentStatus?: FulfillmentStatus[];
  q?: string; // search order number, email, tracking
  from?: Date;
  to?: Date;
  minTotal?: number;
  maxTotal?: number;
}

export interface OrderSortOptions {
  field: 'createdAt' | 'grandTotalCents' | 'number';
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface CreateFulfillmentRequest {
  orderId: string;
  items: Array<{
    orderItemId: string;
    quantity: number;
  }>;
  carrier?: string;
  service?: string;
  fromAddressId?: string;
  options?: {
    signature?: boolean;
    insurance?: boolean;
  };
}

export interface ProcessRefundRequest {
  orderId: string;
  amountCents: number;
  items?: Array<{
    orderItemId: string;
    quantity: number;
  }>;
  reason?: string;
}

export interface OrderWithDetails extends Order {
  items: OrderItem[];
  payments: Payment[];
  shipments: (Shipment & {
    items: any[];
    trackingEvents: any[];
  })[];
  refunds: Refund[];
  billingAddress: any;
  shippingAddress: any;
}

export class OrderService {
  private paymentService = createPaymentService();
  private shippingService = createShippingService();

  async getOrders(filters: OrderFilters = {}, sort: OrderSortOptions = { field: 'createdAt', direction: 'desc' }, pagination: PaginationOptions = { page: 1, pageSize: 20 }) {
    const where: any = {};

    // Apply filters
    if (filters.paymentStatus?.length) {
      where.paymentStatus = { in: filters.paymentStatus };
    }

    if (filters.fulfillmentStatus?.length) {
      where.fulfillmentStatus = { in: filters.fulfillmentStatus };
    }

    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = filters.from;
      if (filters.to) where.createdAt.lte = filters.to;
    }

    if (filters.minTotal || filters.maxTotal) {
      where.grandTotalCents = {};
      if (filters.minTotal) where.grandTotalCents.gte = filters.minTotal * 100;
      if (filters.maxTotal) where.grandTotalCents.lte = filters.maxTotal * 100;
    }

    if (filters.q) {
      where.OR = [
        { number: { contains: filters.q, mode: 'insensitive' } },
        { guestEmail: { contains: filters.q, mode: 'insensitive' } },
        { customerName: { contains: filters.q, mode: 'insensitive' } },
        {
          shipments: {
            some: {
              trackingNumber: { contains: filters.q, mode: 'insensitive' }
            }
          }
        }
      ];
    }

    const skip = (pagination.page - 1) * pagination.pageSize;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: true,
          payments: true,
          shipments: {
            include: {
              items: true,
              trackingEvents: { orderBy: { timestamp: 'desc' } }
            }
          },
          billingAddress: true,
          shippingAddress: true,
        },
        orderBy: { [sort.field]: sort.direction },
        skip,
        take: pagination.pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.ceil(total / pagination.pageSize),
      },
    };
  }

  async getOrderById(id: string): Promise<OrderWithDetails | null> {
    return prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
        shipments: {
          include: {
            items: true,
            trackingEvents: {
              orderBy: { timestamp: 'desc' },
            },
            fromAddress: true,
            toAddress: true,
          },
        },
        refunds: {
          include: {
            items: true,
          },
        },
        billingAddress: true,
        shippingAddress: true,
        auditLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    }) as Promise<OrderWithDetails | null>;
  }

  async updateOrderMetadata(id: string, data: { tags?: string[]; notes?: string }, actorId: string) {
    const order = await prisma.order.update({
      where: { id },
      data,
    });

    await this.createAuditLog({
      orderId: id,
      entityType: 'order',
      entityId: id,
      action: 'updated',
      actor: actorId,
      actorType: 'admin',
      changes: data,
    });

    return order;
  }

  async cancelOrder(id: string, reason: string, actorId: string) {
    const order = await this.getOrderById(id);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.fulfillmentStatus === 'DELIVERED') {
      throw new Error('Cannot cancel delivered order');
    }

    // Void any authorized payments
    for (const payment of order.payments) {
      if (payment.status === 'AUTHORIZED') {
        try {
          await this.paymentService.void({
            paymentIntentId: payment.providerChargeId!,
            reason,
          });
          
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'VOIDED' },
          });
        } catch (error) {
          console.error('Failed to void payment:', error);
        }
      }
    }

    // Cancel any pending shipments
    for (const shipment of order.shipments) {
      if (shipment.status === 'PENDING' || shipment.status === 'LABEL_CREATED') {
        await prisma.shipment.update({
          where: { id: shipment.id },
          data: { status: 'CANCELLED' },
        });
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        fulfillmentStatus: 'CANCELLED',
        cancelReason: reason,
        cancelledAt: new Date(),
      },
    });

    await this.createAuditLog({
      orderId: id,
      entityType: 'order',
      entityId: id,
      action: 'cancelled',
      actor: actorId,
      actorType: 'admin',
      changes: { cancelReason: reason },
    });

    return updatedOrder;
  }

  async createFulfillment(request: CreateFulfillmentRequest, actorId: string) {
    const order = await this.getOrderById(request.orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.paymentStatus !== 'CAPTURED') {
      throw new Error('Order must be paid before fulfillment');
    }

    // Validate items and quantities
    for (const item of request.items) {
      const orderItem = order.items.find(oi => oi.id === item.orderItemId);
      if (!orderItem) {
        throw new Error(`Order item ${item.orderItemId} not found`);
      }
      
      const availableQty = orderItem.quantity - orderItem.fulfilledQty;
      if (item.quantity > availableQty) {
        throw new Error(`Cannot fulfill ${item.quantity} of item ${orderItem.name}, only ${availableQty} available`);
      }
    }

    try {
      // Create shipping label
      const shippingRequest = {
        fromAddress: order.shippingAddress!, // You might want to use a warehouse address
        toAddress: order.shippingAddress!,
        items: request.items.map(item => {
          const orderItem = order.items.find(oi => oi.id === item.orderItemId)!;
          return {
            name: orderItem.name,
            quantity: item.quantity,
            weightGrams: 450, // Default weight per item
            valueCents: orderItem.priceCents,
          };
        }),
        carrier: request.carrier || 'ups',
        service: request.service || 'ground',
        insurance: request.options?.insurance,
        signature: request.options?.signature,
      };

      const label = await this.shippingService.buyLabel(shippingRequest);

      // Create shipment record
      const shipment = await prisma.shipment.create({
        data: {
          orderId: request.orderId,
          carrier: request.carrier || 'ups',
          service: request.service || 'ground',
          trackingNumber: label.trackingNumber,
          labelUrl: label.labelUrl,
          costCents: label.costCents,
          status: 'LABEL_CREATED',
          fromAddressId: request.fromAddressId,
          toAddressId: order.shippingAddressId,
          estimatedDelivery: label.estimatedDelivery,
          items: {
            create: request.items.map(item => ({
              orderItemId: item.orderItemId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Update order item fulfilled quantities
      for (const item of request.items) {
        await prisma.orderItem.update({
          where: { id: item.orderItemId },
          data: {
            fulfilledQty: {
              increment: item.quantity,
            },
          },
        });
      }

      // Update order fulfillment status
      const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const totalFulfilled = order.items.reduce((sum, item) => sum + item.fulfilledQty, 0) + 
                             request.items.reduce((sum, item) => sum + item.quantity, 0);

      let fulfillmentStatus: FulfillmentStatus = 'PARTIALLY_FULFILLED';
      if (totalFulfilled >= totalItems) {
        fulfillmentStatus = 'FULFILLED';
      }

      await prisma.order.update({
        where: { id: request.orderId },
        data: { fulfillmentStatus },
      });

      await this.createAuditLog({
        orderId: request.orderId,
        entityType: 'shipment',
        entityId: shipment.id,
        action: 'created',
        actor: actorId,
        actorType: 'admin',
        changes: { 
          trackingNumber: label.trackingNumber,
          carrier: request.carrier,
          service: request.service,
        },
      });

      return shipment;
    } catch (error) {
      console.error('Failed to create fulfillment:', error);
      throw error;
    }
  }

  async capturePayment(orderId: string, amountCents?: number, actorId?: string) {
    const order = await this.getOrderById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const payment = order.payments.find(p => p.status === 'AUTHORIZED');
    if (!payment) {
      throw new Error('No authorized payment found');
    }

    try {
      const capturedPayment = await this.paymentService.capture({
        paymentIntentId: payment.providerChargeId!,
        amountCents: amountCents || payment.amountCents,
      });

      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'CAPTURED',
          capturedCents: capturedPayment.amountCents,
          capturedAt: new Date(),
        },
      });

      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'CAPTURED' },
      });

      if (actorId) {
        await this.createAuditLog({
          orderId,
          entityType: 'payment',
          entityId: payment.id,
          action: 'captured',
          actor: actorId,
          actorType: 'admin',
          changes: { capturedCents: capturedPayment.amountCents },
        });
      }

      return updatedPayment;
    } catch (error) {
      console.error('Failed to capture payment:', error);
      throw error;
    }
  }

  async processRefund(request: ProcessRefundRequest, actorId: string) {
    const order = await this.getOrderById(request.orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const payment = order.payments.find(p => p.status === 'CAPTURED');
    if (!payment) {
      throw new Error('No captured payment found');
    }

    if (request.amountCents > payment.capturedCents - payment.refundedCents) {
      throw new Error('Refund amount exceeds available balance');
    }

    try {
      const refundResponse = await this.paymentService.refund({
        chargeId: payment.providerChargeId!,
        amountCents: request.amountCents,
        reason: request.reason,
        metadata: { orderId: request.orderId },
      });

      const refund = await prisma.refund.create({
        data: {
          orderId: request.orderId,
          paymentId: payment.id,
          amountCents: request.amountCents,
          reason: request.reason,
          status: 'PROCESSING',
          provider: payment.provider,
          providerRefundId: refundResponse.id,
          items: request.items ? {
            create: request.items.map(item => ({
              orderItemId: item.orderItemId,
              quantity: item.quantity,
              amountCents: Math.round(request.amountCents / request.items!.length), // Simple allocation
            })),
          } : undefined,
        },
        include: {
          items: true,
        },
      });

      // Update order item refunded quantities
      if (request.items) {
        for (const item of request.items) {
          await prisma.orderItem.update({
            where: { id: item.orderItemId },
            data: {
              refundedQty: {
                increment: item.quantity,
              },
            },
          });
        }
      }

      // Update payment refunded amount
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          refundedCents: {
            increment: request.amountCents,
          },
          status: payment.capturedCents - payment.refundedCents - request.amountCents > 0 
            ? 'PARTIALLY_REFUNDED' 
            : 'REFUNDED',
        },
      });

      // Update order payment status
      const totalRefunded = order.payments.reduce((sum, p) => sum + p.refundedCents, 0) + request.amountCents;
      const totalCaptured = order.payments.reduce((sum, p) => sum + p.capturedCents, 0);
      
      let paymentStatus: PaymentStatus = 'PARTIALLY_REFUNDED';
      if (totalRefunded >= totalCaptured) {
        paymentStatus = 'REFUNDED';
      }

      await prisma.order.update({
        where: { id: request.orderId },
        data: { paymentStatus },
      });

      await this.createAuditLog({
        orderId: request.orderId,
        entityType: 'refund',
        entityId: refund.id,
        action: 'created',
        actor: actorId,
        actorType: 'admin',
        changes: { 
          amountCents: request.amountCents,
          reason: request.reason,
        },
      });

      return refund;
    } catch (error) {
      console.error('Failed to process refund:', error);
      throw error;
    }
  }

  async updateShipmentTracking(shipmentId: string, trackingUpdate: any) {
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { order: true },
    });

    if (!shipment) {
      throw new Error('Shipment not found');
    }

    // Create tracking event
    await prisma.trackingEvent.create({
      data: {
        shipmentId,
        status: trackingUpdate.status,
        description: trackingUpdate.description,
        location: trackingUpdate.location,
        timestamp: new Date(trackingUpdate.timestamp),
        metadata: trackingUpdate,
      },
    });

    // Update shipment status
    await prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        status: trackingUpdate.status,
        actualDelivery: trackingUpdate.status === 'DELIVERED' ? new Date() : undefined,
      },
    });

    // Update order fulfillment status if delivered
    if (trackingUpdate.status === 'DELIVERED') {
      const order = await this.getOrderById(shipment.orderId);
      if (order) {
        const allShipmentsDelivered = order.shipments.every(s => 
          s.id === shipmentId || s.status === 'DELIVERED'
        );

        if (allShipmentsDelivered) {
          await prisma.order.update({
            where: { id: shipment.orderId },
            data: { fulfillmentStatus: 'DELIVERED' },
          });
        } else {
          await prisma.order.update({
            where: { id: shipment.orderId },
            data: { fulfillmentStatus: 'PARTIALLY_DELIVERED' },
          });
        }
      }
    }

    await this.createAuditLog({
      orderId: shipment.orderId,
      entityType: 'shipment',
      entityId: shipmentId,
      action: 'tracking_updated',
      actor: 'system',
      actorType: 'system',
      changes: trackingUpdate,
    });
  }

  async exportOrders(filters: OrderFilters) {
    const orders = await prisma.order.findMany({
      where: this.buildWhereClause(filters),
      include: {
        items: true,
        payments: true,
        shipments: true,
        billingAddress: true,
        shippingAddress: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Convert to CSV format
    const csvHeaders = [
      'Order Number',
      'Date',
      'Customer',
      'Email',
      'Total',
      'Payment Status',
      'Fulfillment Status',
      'Items',
      'Tracking Numbers',
    ];

    const csvRows = orders.map(order => [
      order.number,
      order.createdAt.toISOString().split('T')[0],
      order.customerName || 'Guest',
      order.guestEmail || '',
      (order.grandTotalCents / 100).toFixed(2),
      order.paymentStatus,
      order.fulfillmentStatus,
      order.items.map(item => `${item.name} (${item.quantity})`).join('; '),
      order.shipments.map(s => s.trackingNumber).filter(Boolean).join('; '),
    ]);

    return {
      headers: csvHeaders,
      rows: csvRows,
    };
  }

  private buildWhereClause(filters: OrderFilters) {
    const where: any = {};

    if (filters.paymentStatus?.length) {
      where.paymentStatus = { in: filters.paymentStatus };
    }

    if (filters.fulfillmentStatus?.length) {
      where.fulfillmentStatus = { in: filters.fulfillmentStatus };
    }

    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = filters.from;
      if (filters.to) where.createdAt.lte = filters.to;
    }

    if (filters.minTotal || filters.maxTotal) {
      where.grandTotalCents = {};
      if (filters.minTotal) where.grandTotalCents.gte = filters.minTotal * 100;
      if (filters.maxTotal) where.grandTotalCents.lte = filters.maxTotal * 100;
    }

    if (filters.q) {
      where.OR = [
        { number: { contains: filters.q, mode: 'insensitive' } },
        { guestEmail: { contains: filters.q, mode: 'insensitive' } },
        { customerName: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private async createAuditLog(data: {
    orderId?: string;
    entityType: string;
    entityId: string;
    action: string;
    actor: string;
    actorType: string;
    changes?: any;
    correlationId?: string;
  }) {
    await prisma.auditLog.create({
      data: {
        ...data,
        changes: data.changes ? data.changes : undefined,
        createdAt: new Date(),
      },
    });
  }
}

export const orderService = new OrderService();
