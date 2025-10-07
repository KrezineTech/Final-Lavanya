import { Address, Order, OrderItem, Payment, PaymentStatus, Refund, Shipment } from '@prisma/client';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailContext {
  order: Order & {
    items: OrderItem[];
    payments: Payment[];
    shipments?: Shipment[];
    billingAddress?: Address;
    shippingAddress?: Address;
  };
  customer: {
    name: string;
    email: string;
  };
  trackingNumber?: string;
  refund?: Refund;
}

export abstract class EmailService {
  abstract sendEmail(to: string, template: EmailTemplate, context?: any): Promise<boolean>;
  abstract renderTemplate(templateName: string, context: EmailContext): Promise<EmailTemplate>;
}

export class NodemailerEmailService extends EmailService {
  private transporter: any;

  constructor(config: any) {
    super();
    // Initialize nodemailer transporter
    // This would be implemented with actual nodemailer
  }

  async sendEmail(to: string, template: EmailTemplate, context?: any): Promise<boolean> {
    try {
      // Implement actual email sending
      console.log(`Sending email to ${to}: ${template.subject}`);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  async renderTemplate(templateName: string, context: EmailContext): Promise<EmailTemplate> {
    const templates = {
      orderConfirmation: this.getOrderConfirmationTemplate(context),
      shipmentNotification: this.getShipmentNotificationTemplate(context),
      deliveryConfirmation: this.getDeliveryConfirmationTemplate(context),
      refundNotification: this.getRefundNotificationTemplate(context),
    };

    return templates[templateName as keyof typeof templates] || templates.orderConfirmation;
  }

  private getOrderConfirmationTemplate(context: EmailContext): EmailTemplate {
    const { order, customer } = context;
    
    return {
      subject: `Order Confirmation - #${order.number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Thank you for your order!</h1>
          <p>Hi ${customer.name},</p>
          <p>We've received your order and will process it soon.</p>
          
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
            <h2>Order #${order.number}</h2>
            <p><strong>Total:</strong> $${(order.grandTotalCents / 100).toFixed(2)}</p>
            <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
          </div>
          
          <h3>Items Ordered:</h3>
          <ul>
            ${order.items.map(item => `
              <li>${item.name} - Qty: ${item.quantity} - $${(item.priceCents / 100).toFixed(2)}</li>
            `).join('')}
          </ul>
          
          <p>We'll send you another email when your order ships.</p>
          <p>Thank you for your business!</p>
        </div>
      `,
      text: `
        Thank you for your order!
        
        Order #${order.number}
        Total: $${(order.grandTotalCents / 100).toFixed(2)}
        Payment Status: ${order.paymentStatus}
        
        Items:
        ${order.items.map(item => `- ${item.name} - Qty: ${item.quantity} - $${(item.priceCents / 100).toFixed(2)}`).join('\n')}
        
        We'll send you another email when your order ships.
      `,
    };
  }

  private getShipmentNotificationTemplate(context: EmailContext): EmailTemplate {
    const { order, customer, trackingNumber } = context;
    
    return {
      subject: `Your order #${order.number} has shipped!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Your order has shipped!</h1>
          <p>Hi ${customer.name},</p>
          <p>Great news! Your order #${order.number} is on its way.</p>
          
          ${trackingNumber ? `
            <div style="background: #e8f5e8; padding: 20px; margin: 20px 0;">
              <h2>Tracking Information</h2>
              <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
              <p>You can track your package using the tracking number above.</p>
            </div>
          ` : ''}
          
          <p>Thank you for your order!</p>
        </div>
      `,
      text: `
        Your order has shipped!
        
        Order #${order.number} is on its way.
        ${trackingNumber ? `Tracking Number: ${trackingNumber}` : ''}
        
        Thank you for your order!
      `,
    };
  }

  private getDeliveryConfirmationTemplate(context: EmailContext): EmailTemplate {
    const { order, customer } = context;
    
    return {
      subject: `Your order #${order.number} has been delivered!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Order Delivered!</h1>
          <p>Hi ${customer.name},</p>
          <p>Your order #${order.number} has been delivered!</p>
          
          <p>We hope you love your purchase. If you have any questions or concerns, please don't hesitate to contact us.</p>
          
          <p>Thank you for choosing us!</p>
        </div>
      `,
      text: `
        Order Delivered!
        
        Your order #${order.number} has been delivered!
        
        Thank you for choosing us!
      `,
    };
  }

  private getRefundNotificationTemplate(context: EmailContext): EmailTemplate {
    const { order, customer, refund } = context;
    
    return {
      subject: `Refund processed for order #${order.number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Refund Processed</h1>
          <p>Hi ${customer.name},</p>
          <p>We've processed a refund for your order #${order.number}.</p>
          
          ${refund ? `
            <div style="background: #f0f8ff; padding: 20px; margin: 20px 0;">
              <h2>Refund Details</h2>
              <p><strong>Amount:</strong> $${(refund.amountCents / 100).toFixed(2)}</p>
              ${refund.reason ? `<p><strong>Reason:</strong> ${refund.reason}</p>` : ''}
            </div>
          ` : ''}
          
          <p>Please allow 3-5 business days for the refund to appear on your payment method.</p>
          
          <p>If you have any questions, please contact our support team.</p>
        </div>
      `,
      text: `
        Refund Processed
        
        We've processed a refund for your order #${order.number}.
        ${refund ? `Amount: $${(refund.amountCents / 100).toFixed(2)}` : ''}
        
        Please allow 3-5 business days for the refund to appear.
      `,
    };
  }
}

export function createEmailService(): EmailService {
  return new NodemailerEmailService({});
}
