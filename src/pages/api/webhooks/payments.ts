import { NextApiRequest, NextApiResponse } from 'next';
import { createPaymentService } from '@/services/paymentService';
import { orderService } from '@/services/orderService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const paymentService = createPaymentService();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signature = req.headers['stripe-signature'] as string;
    const payload = JSON.stringify(req.body);

    // Verify webhook signature
    const event = paymentService.verifyWebhook(payload, signature);

    // Process webhook event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      case 'charge.dispute.created':
        await handleChargeDispute(event.data.object);
        break;
      
      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Webhook processing failed'
    });
  }
}

async function handlePaymentSucceeded(paymentIntent: any) {
  const orderId = paymentIntent.metadata?.orderId;
  if (!orderId) return;

  try {
    // Update payment status
    await prisma.payment.updateMany({
      where: {
        orderId,
        providerChargeId: paymentIntent.id,
      },
      data: {
        status: 'CAPTURED',
        capturedCents: paymentIntent.amount,
        capturedAt: new Date(),
      },
    });

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'CAPTURED' },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        orderId,
        entityType: 'payment',
        entityId: paymentIntent.id,
        action: 'payment_succeeded',
        actor: 'webhook',
        actorType: 'system',
        changes: {
          amountCents: paymentIntent.amount,
          status: 'CAPTURED',
        },
      },
    });

    console.log(`Payment succeeded for order ${orderId}`);
  } catch (error) {
    console.error('Failed to handle payment succeeded:', error);
  }
}

async function handlePaymentFailed(paymentIntent: any) {
  const orderId = paymentIntent.metadata?.orderId;
  if (!orderId) return;

  try {
    // Update payment status
    await prisma.payment.updateMany({
      where: {
        orderId,
        providerChargeId: paymentIntent.id,
      },
      data: {
        status: 'FAILED',
      },
    });

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'FAILED' },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        orderId,
        entityType: 'payment',
        entityId: paymentIntent.id,
        action: 'payment_failed',
        actor: 'webhook',
        actorType: 'system',
        changes: {
          error: paymentIntent.last_payment_error?.message,
        },
      },
    });

    console.log(`Payment failed for order ${orderId}`);
  } catch (error) {
    console.error('Failed to handle payment failed:', error);
  }
}

async function handleChargeDispute(dispute: any) {
  const chargeId = dispute.charge;
  
  try {
    // Find the payment and order
    const payment = await prisma.payment.findFirst({
      where: { providerChargeId: chargeId },
      include: { order: true },
    });

    if (!payment) return;

    // Create audit log for dispute
    await prisma.auditLog.create({
      data: {
        orderId: payment.orderId,
        entityType: 'payment',
        entityId: payment.id,
        action: 'dispute_created',
        actor: 'webhook',
        actorType: 'system',
        changes: {
          disputeId: dispute.id,
          amount: dispute.amount,
          reason: dispute.reason,
          status: dispute.status,
        },
      },
    });

    console.log(`Dispute created for payment ${payment.id}, order ${payment.orderId}`);
  } catch (error) {
    console.error('Failed to handle charge dispute:', error);
  }
}
