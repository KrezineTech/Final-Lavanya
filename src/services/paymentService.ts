import { PaymentStatus } from '@prisma/client';

export interface PaymentIntent {
  id: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  clientSecret?: string;
  metadata?: any;
}

export interface AuthorizePaymentRequest {
  amountCents: number;
  currency?: string;
  paymentMethodId?: string;
  customerId?: string;
  metadata?: Record<string, any>;
}

export interface CapturePaymentRequest {
  paymentIntentId: string;
  amountCents?: number; // If not provided, captures full amount
}

export interface RefundPaymentRequest {
  chargeId: string;
  amountCents: number;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface RefundResponse {
  id: string;
  amountCents: number;
  status: 'pending' | 'succeeded' | 'failed';
  reason?: string;
  metadata?: any;
}

export interface VoidPaymentRequest {
  paymentIntentId: string;
  reason?: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  created: number;
}

export abstract class PaymentService {
  abstract authorize(request: AuthorizePaymentRequest): Promise<PaymentIntent>;
  abstract capture(request: CapturePaymentRequest): Promise<PaymentIntent>;
  abstract refund(request: RefundPaymentRequest): Promise<RefundResponse>;
  abstract void(request: VoidPaymentRequest): Promise<PaymentIntent>;
  abstract getPayment(paymentIntentId: string): Promise<PaymentIntent>;
  abstract verifyWebhook(payload: string, signature: string): WebhookEvent;
}

// Stripe implementation
export class StripePaymentService extends PaymentService {
  private apiKey: string;
  private webhookSecret: string;
  private baseUrl = 'https://api.stripe.com/v1';

  constructor(apiKey: string, webhookSecret: string) {
    super();
    this.apiKey = apiKey;
    this.webhookSecret = webhookSecret;
  }

  async authorize(request: AuthorizePaymentRequest): Promise<PaymentIntent> {
    try {
      const response = await fetch(`${this.baseUrl}/payment_intents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          amount: request.amountCents.toString(),
          currency: request.currency || 'usd',
          capture_method: 'manual',
          payment_method: request.paymentMethodId || '',
          customer: request.customerId || '',
          'metadata[orderId]': request.metadata?.orderId || '',
          confirm: 'true',
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Stripe API error: ${data.error?.message || 'Unknown error'}`);
      }

      return {
        id: data.id,
        amountCents: data.amount,
        currency: data.currency,
        status: this.mapStripeStatus(data.status),
        clientSecret: data.client_secret,
        metadata: data.metadata,
      };
    } catch (error) {
      console.error('Failed to authorize payment:', error);
      throw error;
    }
  }

  async capture(request: CapturePaymentRequest): Promise<PaymentIntent> {
    try {
      const captureData: any = {};
      
      if (request.amountCents) {
        captureData.amount_to_capture = request.amountCents.toString();
      }

      const response = await fetch(`${this.baseUrl}/payment_intents/${request.paymentIntentId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(captureData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Stripe API error: ${data.error?.message || 'Unknown error'}`);
      }

      return {
        id: data.id,
        amountCents: data.amount,
        currency: data.currency,
        status: this.mapStripeStatus(data.status),
        metadata: data.metadata,
      };
    } catch (error) {
      console.error('Failed to capture payment:', error);
      throw error;
    }
  }

  async refund(request: RefundPaymentRequest): Promise<RefundResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/refunds`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          charge: request.chargeId,
          amount: request.amountCents.toString(),
          reason: request.reason || 'requested_by_customer',
          'metadata[orderId]': request.metadata?.orderId || '',
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Stripe API error: ${data.error?.message || 'Unknown error'}`);
      }

      return {
        id: data.id,
        amountCents: data.amount,
        status: data.status,
        reason: data.reason,
        metadata: data.metadata,
      };
    } catch (error) {
      console.error('Failed to process refund:', error);
      throw error;
    }
  }

  async void(request: VoidPaymentRequest): Promise<PaymentIntent> {
    try {
      const response = await fetch(`${this.baseUrl}/payment_intents/${request.paymentIntentId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          cancellation_reason: request.reason || 'requested_by_customer',
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Stripe API error: ${data.error?.message || 'Unknown error'}`);
      }

      return {
        id: data.id,
        amountCents: data.amount,
        currency: data.currency,
        status: this.mapStripeStatus(data.status),
        metadata: data.metadata,
      };
    } catch (error) {
      console.error('Failed to void payment:', error);
      throw error;
    }
  }

  async getPayment(paymentIntentId: string): Promise<PaymentIntent> {
    try {
      const response = await fetch(`${this.baseUrl}/payment_intents/${paymentIntentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Stripe API error: ${data.error?.message || 'Unknown error'}`);
      }

      return {
        id: data.id,
        amountCents: data.amount,
        currency: data.currency,
        status: this.mapStripeStatus(data.status),
        clientSecret: data.client_secret,
        metadata: data.metadata,
      };
    } catch (error) {
      console.error('Failed to get payment:', error);
      throw error;
    }
  }

  verifyWebhook(payload: string, signature: string): WebhookEvent {
    try {
      // In a real implementation, you would use Stripe's webhook verification
      // For now, we'll just parse the JSON
      const event = JSON.parse(payload);
      
      // Verify signature here with Stripe's library
      // stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
      
      return {
        id: event.id,
        type: event.type,
        data: event.data,
        created: event.created,
      };
    } catch (error) {
      console.error('Failed to verify webhook:', error);
      throw new Error('Invalid webhook signature');
    }
  }

  private mapStripeStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      'requires_payment_method': PaymentStatus.PENDING,
      'requires_confirmation': PaymentStatus.PENDING,
      'requires_action': PaymentStatus.PENDING,
      'processing': PaymentStatus.PENDING,
      'requires_capture': PaymentStatus.AUTHORIZED,
      'succeeded': PaymentStatus.CAPTURED,
      'canceled': PaymentStatus.VOIDED,
    };

    return statusMap[status] || PaymentStatus.FAILED;
  }
}

// Factory function to create payment service
export function createPaymentService(): PaymentService {
  const provider = process.env.PAYMENT_PROVIDER || 'stripe';
  
  switch (provider) {
    case 'stripe':
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (!stripeKey || !webhookSecret) {
        throw new Error('STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET environment variables are required');
      }
      
      return new StripePaymentService(stripeKey, webhookSecret);
      
    default:
      throw new Error(`Unsupported payment provider: ${provider}`);
  }
}

// Legacy functions for backward compatibility
type ConnectionResult = {
  success: boolean;
  message: string;
};

const simulateApiCall = (success: boolean, delay: number): Promise<ConnectionResult> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (success) {
        resolve({ success: true, message: "Connection successful." });
      } else {
        reject({ success: false, message: "Failed to connect. Please try again." });
      }
    }, delay);
  });
};

export const connectProvider = async (providerName: string): Promise<ConnectionResult> => {
  console.log(`Attempting to connect ${providerName}...`);
  const shouldSucceed = providerName.toLowerCase() !== 'paypal' || Math.random() > 0.5;
  return simulateApiCall(shouldSucceed, 1500);
};

export const manageProvider = async (providerName: string): Promise<void> => {
    console.log(`Redirecting to manage ${providerName}...`);
    return Promise.resolve();
}
