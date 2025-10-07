import { Address, Shipment, ShipmentStatus } from '@prisma/client';

export interface ShippingRate {
  carrier: string;
  service: string;
  costCents: number;
  estimatedDays: number;
  currency: string;
}

export interface ShippingLabel {
  trackingNumber: string;
  labelUrl: string;
  costCents: number;
  estimatedDelivery?: Date;
}

export interface TrackingInfo {
  status: ShipmentStatus;
  description: string;
  location?: string;
  timestamp: Date;
  estimatedDelivery?: Date;
}

export interface ShipmentRequest {
  fromAddress: Partial<Address>;
  toAddress: Partial<Address>;
  items: Array<{
    name: string;
    quantity: number;
    weightGrams: number;
    valueCents: number;
  }>;
  carrier?: string;
  service?: string;
  insurance?: boolean;
  signature?: boolean;
}

export abstract class ShippingService {
  abstract quoteRates(request: ShipmentRequest): Promise<ShippingRate[]>;
  abstract buyLabel(request: ShipmentRequest & { carrier: string; service: string }): Promise<ShippingLabel>;
  abstract voidLabel(labelId: string): Promise<boolean>;
  abstract track(trackingNumber: string, carrier?: string): Promise<TrackingInfo[]>;
  abstract validateAddress(address: Partial<Address>): Promise<Address>;
}

// EasyPost implementation
export class EasyPostShippingService extends ShippingService {
  private apiKey: string;
  private baseUrl = 'https://api.easypost.com/v2';

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  async quoteRates(request: ShipmentRequest): Promise<ShippingRate[]> {
    try {
      const response = await fetch(`${this.baseUrl}/shipments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to_address: this.formatAddress(request.toAddress),
          from_address: this.formatAddress(request.fromAddress),
          parcel: this.formatParcel(request.items),
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`EasyPost API error: ${data.error?.message || 'Unknown error'}`);
      }

      return data.rates.map((rate: any) => ({
        carrier: rate.carrier,
        service: rate.service,
        costCents: Math.round(parseFloat(rate.rate) * 100),
        estimatedDays: rate.delivery_days || 7,
        currency: rate.currency || 'USD',
      }));
    } catch (error) {
      console.error('Error quoting shipping rates:', error);
      throw error;
    }
  }

  async buyLabel(request: ShipmentRequest & { carrier: string; service: string }): Promise<ShippingLabel> {
    try {
      // First get rates
      const rates = await this.quoteRates(request);
      const selectedRate = rates.find(r => r.carrier === request.carrier && r.service === request.service);
      
      if (!selectedRate) {
        throw new Error(`Rate not found for ${request.carrier} ${request.service}`);
      }

      const response = await fetch(`${this.baseUrl}/shipments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to_address: this.formatAddress(request.toAddress),
          from_address: this.formatAddress(request.fromAddress),
          parcel: this.formatParcel(request.items),
          rate: {
            carrier: request.carrier,
            service: request.service,
          },
          insurance: request.insurance ? this.calculateInsurance(request.items) : undefined,
          options: {
            delivery_confirmation: request.signature ? 'SIGNATURE' : undefined,
          },
        }),
      });

      const shipment = await response.json();
      
      if (!response.ok) {
        throw new Error(`EasyPost API error: ${shipment.error?.message || 'Unknown error'}`);
      }

      // Buy the label
      const buyResponse = await fetch(`${this.baseUrl}/shipments/${shipment.id}/buy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rate: shipment.rates.find((r: any) => r.carrier === request.carrier && r.service === request.service),
        }),
      });

      const boughtShipment = await buyResponse.json();
      
      if (!buyResponse.ok) {
        throw new Error(`EasyPost label purchase error: ${boughtShipment.error?.message || 'Unknown error'}`);
      }

      return {
        trackingNumber: boughtShipment.tracking_code,
        labelUrl: boughtShipment.postage_label.label_url,
        costCents: Math.round(parseFloat(boughtShipment.selected_rate.rate) * 100),
        estimatedDelivery: boughtShipment.selected_rate.delivery_date ? new Date(boughtShipment.selected_rate.delivery_date) : undefined,
      };
    } catch (error) {
      console.error('Error buying shipping label:', error);
      throw error;
    }
  }

  async voidLabel(labelId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/shipments/${labelId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Error voiding shipping label:', error);
      return false;
    }
  }

  async track(trackingNumber: string, carrier?: string): Promise<TrackingInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/trackers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tracking_code: trackingNumber,
          carrier: carrier,
        }),
      });

      const tracker = await response.json();
      
      if (!response.ok) {
        throw new Error(`EasyPost tracking error: ${tracker.error?.message || 'Unknown error'}`);
      }

      return tracker.tracking_details.map((detail: any) => ({
        status: this.mapTrackingStatus(detail.status),
        description: detail.message || detail.status,
        location: detail.tracking_location ? `${detail.tracking_location.city}, ${detail.tracking_location.state}` : undefined,
        timestamp: new Date(detail.datetime),
      }));
    } catch (error) {
      console.error('Error tracking shipment:', error);
      throw error;
    }
  }

  async validateAddress(address: Partial<Address>): Promise<Address> {
    try {
      const response = await fetch(`${this.baseUrl}/addresses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verify: ['delivery'],
          street1: address.address1,
          street2: address.address2,
          city: address.city,
          state: address.state,
          zip: address.postalCode,
          country: address.country || 'US',
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Address validation error: ${data.error?.message || 'Unknown error'}`);
      }

      return {
        id: '',
        firstName: address.firstName || '',
        lastName: address.lastName || '',
        company: address.company || null,
        address1: data.street1,
        address2: data.street2 || null,
        city: data.city,
        state: data.state,
        postalCode: data.zip,
        country: data.country,
        phone: address.phone || null,
      };
    } catch (error) {
      console.error('Error validating address:', error);
      throw error;
    }
  }

  private formatAddress(address: Partial<Address>) {
    return {
      name: `${address.firstName || ''} ${address.lastName || ''}`.trim(),
      company: address.company,
      street1: address.address1,
      street2: address.address2,
      city: address.city,
      state: address.state,
      zip: address.postalCode,
      country: address.country || 'US',
      phone: address.phone,
    };
  }

  private formatParcel(items: Array<{ name: string; quantity: number; weightGrams: number; valueCents: number }>) {
    const totalWeight = items.reduce((sum, item) => sum + (item.weightGrams * item.quantity), 0);
    
    return {
      length: 12, // Default dimensions in inches
      width: 9,
      height: 3,
      weight: Math.max(1, totalWeight / 28.35), // Convert grams to ounces, minimum 1 oz
    };
  }

  private calculateInsurance(items: Array<{ valueCents: number; quantity: number }>) {
    const totalValue = items.reduce((sum, item) => sum + (item.valueCents * item.quantity), 0);
    return Math.round(totalValue / 100); // Convert cents to dollars
  }

  private mapTrackingStatus(status: string): ShipmentStatus {
    const statusMap: Record<string, ShipmentStatus> = {
      'pre_transit': ShipmentStatus.LABEL_CREATED,
      'in_transit': ShipmentStatus.IN_TRANSIT,
      'out_for_delivery': ShipmentStatus.OUT_FOR_DELIVERY,
      'delivered': ShipmentStatus.DELIVERED,
      'exception': ShipmentStatus.EXCEPTION,
      'cancelled': ShipmentStatus.CANCELLED,
    };
    
    return statusMap[status.toLowerCase()] || ShipmentStatus.IN_TRANSIT;
  }
}

// Factory function
export function createShippingService(): ShippingService {
  const provider = process.env.SHIPPING_PROVIDER || 'easypost';
  
  switch (provider) {
    case 'easypost':
      if (!process.env.EASYPOST_API_KEY) {
        throw new Error('EASYPOST_API_KEY environment variable is required');
      }
      return new EasyPostShippingService(process.env.EASYPOST_API_KEY);
    default:
      throw new Error(`Unsupported shipping provider: ${provider}`);
  }
}
