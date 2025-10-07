import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { createEmailService } from '@/services/emailService';
import { notificationSchema, validateRequestBody } from '@/lib/validators/orders';

const prisma = new PrismaClient();
const emailService = createEmailService();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId } = req.query;

  if (!orderId || typeof orderId !== 'string') {
    return res.status(400).json({ error: 'Invalid order ID' });
  }

  try {
    const notificationData = validateRequestBody(notificationSchema, req.body);

    // Get order with full details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
        shipments: {
          include: {
            trackingEvents: {
              orderBy: { timestamp: 'desc' },
              take: 1,
            },
          },
        },
        refunds: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        billingAddress: true,
        shippingAddress: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const customerEmail = order.guestEmail;
    const customerName = order.customerName || 'Valued Customer';

    if (!customerEmail) {
      return res.status(400).json({ error: 'No customer email found' });
    }

    // Prepare email context
    const emailContext = {
      order: order as any, // Type cast to avoid complex type issues
      customer: {
        name: customerName,
        email: customerEmail,
      },
      trackingNumber: order.shipments?.[0]?.trackingNumber || undefined,
      refund: order.refunds?.[0] as any,
    };

    // Send notification based on type
    let template;
    switch (notificationData.type) {
      case 'order_confirmation':
        template = await emailService.renderTemplate('orderConfirmation', emailContext);
        break;
      case 'order_shipped':
        template = await emailService.renderTemplate('shipmentNotification', emailContext);
        break;
      case 'order_delivered':
        template = await emailService.renderTemplate('deliveryConfirmation', emailContext);
        break;
      case 'refund_processed':
        template = await emailService.renderTemplate('refundNotification', emailContext);
        break;
      default:
        return res.status(400).json({ error: 'Invalid notification type' });
    }

    const success = await emailService.sendEmail(customerEmail, template, emailContext);

    if (!success) {
      throw new Error('Failed to send email');
    }

    // Log the notification
    await prisma.auditLog.create({
      data: {
        orderId,
        entityType: 'notification',
        entityId: orderId,
        action: 'email_sent',
        actor: 'admin',
        actorType: 'admin',
        changes: {
          type: notificationData.type,
          recipient: customerEmail,
          subject: template.subject,
        },
      },
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Notification sent successfully' 
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to send notification'
    });
  }
}
