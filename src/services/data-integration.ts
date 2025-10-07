// Enhanced API service for real data integration
// This service provides a foundation for integrating with actual APIs

export interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  category?: string;
  inStock?: boolean;
  description?: string;
}

export interface Collection {
  id: string;
  name: string;
  productCount: number;
  description?: string;
  image?: string;
}

export interface Category {
  id: string;
  name: string;
  productCount: number;
  description?: string;
  parentId?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  totalOrders?: number;
  totalSpent?: number;
}

class DataIntegrationService {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl = '/api', timeout = 10000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    return response.json();
  }

  // Product Methods
  async searchProducts(query: string, limit = 10): Promise<Product[]> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/products/search?q=${encodeURIComponent(query)}&limit=${limit}`
      );
      return await this.handleResponse<Product[]>(response);
    } catch (error) {
      console.warn('Real product search failed, using fallback data:', error);
      // Fallback to mock data
      return this.getMockProducts().filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, limit);
    }
  }

  async getProducts(page = 1, limit = 50, categoryId?: string): Promise<{ data: Product[]; total: number }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(categoryId && { categoryId })
      });
      
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/products?${params.toString()}`
      );
      return await this.handleResponse<{ data: Product[]; total: number }>(response);
    } catch (error) {
      console.warn('Real product fetch failed, using fallback data:', error);
      const mockProducts = this.getMockProducts();
      return {
        data: mockProducts.slice((page - 1) * limit, page * limit),
        total: mockProducts.length
      };
    }
  }

  // Collection Methods
  async searchCollections(query: string, limit = 10): Promise<Collection[]> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/collections/search?q=${encodeURIComponent(query)}&limit=${limit}`
      );
      return await this.handleResponse<Collection[]>(response);
    } catch (error) {
      console.warn('Real collection search failed, using fallback data:', error);
      return this.getMockCollections().filter(c => 
        c.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, limit);
    }
  }

  async getCollections(): Promise<Collection[]> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/collections`);
      return await this.handleResponse<Collection[]>(response);
    } catch (error) {
      console.warn('Real collection fetch failed, using fallback data:', error);
      return this.getMockCollections();
    }
  }

  // Category Methods
  async searchCategories(query: string, limit = 10): Promise<Category[]> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/categories/search?q=${encodeURIComponent(query)}&limit=${limit}`
      );
      return await this.handleResponse<Category[]>(response);
    } catch (error) {
      console.warn('Real category search failed, using fallback data:', error);
      return this.getMockCategories().filter(c => 
        c.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, limit);
    }
  }

  async getCategories(): Promise<Category[]> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/categories`);
      return await this.handleResponse<Category[]>(response);
    } catch (error) {
      console.warn('Real category fetch failed, using fallback data:', error);
      return this.getMockCategories();
    }
  }

  // Customer Methods
  async searchCustomers(query: string, limit = 10): Promise<Customer[]> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/customers/search?q=${encodeURIComponent(query)}&limit=${limit}`
      );
      return await this.handleResponse<Customer[]>(response);
    } catch (error) {
      console.warn('Real customer search failed, using fallback data:', error);
      return this.getMockCustomers().filter(c => 
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.email.toLowerCase().includes(query.toLowerCase())
      ).slice(0, limit);
    }
  }

  async getCustomers(page = 1, limit = 50): Promise<{ data: Customer[]; total: number }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/customers?${params.toString()}`
      );
      return await this.handleResponse<{ data: Customer[]; total: number }>(response);
    } catch (error) {
      console.warn('Real customer fetch failed, using fallback data:', error);
      const mockCustomers = this.getMockCustomers();
      return {
        data: mockCustomers.slice((page - 1) * limit, page * limit),
        total: mockCustomers.length
      };
    }
  }

  // Mock Data (fallback when real APIs are not available)
  private getMockProducts(): Product[] {
    return [
      { id: 'prod1', name: 'Krishna Painting', price: 150, image: '/images/krishna.jpg', category: 'Religious Art', inStock: true },
      { id: 'prod2', name: 'Ganesha Painting', price: 200, image: '/images/ganesha.jpg', category: 'Religious Art', inStock: true },
      { id: 'prod3', name: 'Guru Nanak Art', price: 175, image: '/images/guru-nanak.jpg', category: 'Religious Art', inStock: true },
      { id: 'prod4', name: 'Abstract Sikh Art', price: 225, image: '/images/abstract-sikh.jpg', category: 'Abstract', inStock: true },
      { id: 'prod5', name: 'Entryway Ganesha Art', price: 300, image: '/images/entryway-ganesha.jpg', category: 'Home Decor', inStock: true },
      { id: 'prod6', name: 'Radha Krishna Painting', price: 280, image: '/images/radha-krishna.jpg', category: 'Religious Art', inStock: true },
      { id: 'prod7', name: 'Shiva Wall Art', price: 250, image: '/images/shiva.jpg', category: 'Religious Art', inStock: true },
      { id: 'prod8', name: 'Modern Spiritual Art', price: 320, image: '/images/modern-spiritual.jpg', category: 'Modern', inStock: false },
    ];
  }

  private getMockCollections(): Collection[] {
    return [
      { id: 'col1', name: 'Summer Sale', productCount: 15, description: 'Special summer collection with discounted prices' },
      { id: 'col2', name: 'New Arrivals', productCount: 8, description: 'Latest additions to our gallery' },
      { id: 'col3', name: 'Religious Art', productCount: 25, description: 'Traditional and contemporary religious artwork' },
      { id: 'col4', name: 'Best Sellers', productCount: 12, description: 'Most popular items from our collection' },
      { id: 'col5', name: 'Abstract Collection', productCount: 18, description: 'Modern abstract interpretations of spiritual themes' },
    ];
  }

  private getMockCategories(): Category[] {
    return [
      { id: 'cat1', name: 'Paintings', productCount: 45, description: 'Hand-painted artwork on canvas' },
      { id: 'cat2', name: 'Sculptures', productCount: 12, description: 'Three-dimensional art pieces' },
      { id: 'cat3', name: 'Prints', productCount: 30, description: 'High-quality reproductions and digital prints' },
      { id: 'cat4', name: 'Religious Art', productCount: 35, description: 'Spiritual and religious themed artwork', parentId: 'cat1' },
      { id: 'cat5', name: 'Abstract', productCount: 20, description: 'Modern abstract designs', parentId: 'cat1' },
      { id: 'cat6', name: 'Home Decor', productCount: 25, description: 'Decorative pieces for interior design' },
    ];
  }

  private getMockCustomers(): Customer[] {
    return [
      { id: '1', name: 'John Doe', email: 'john.doe@example.com', phone: '+1-555-0101', totalOrders: 5, totalSpent: 850 },
      { id: '2', name: 'Jane Smith', email: 'jane.smith@example.com', phone: '+1-555-0102', totalOrders: 3, totalSpent: 520 },
      { id: '3', name: 'Sam Wilson', email: 'sam.wilson@example.com', phone: '+1-555-0103', totalOrders: 8, totalSpent: 1200 },
      { id: '4', name: 'Emily Brown', email: 'emily.brown@example.com', phone: '+1-555-0104', totalOrders: 2, totalSpent: 300 },
      { id: '5', name: 'Michael Clark', email: 'michael.clark@example.com', phone: '+1-555-0105', totalOrders: 12, totalSpent: 2100 },
      { id: '6', name: 'Divya Patel', email: 'divya.patel@example.com', phone: '+1-555-0106', totalOrders: 4, totalSpent: 680 },
      { id: '7', name: 'Sheila Patel', email: 'sheila.patel@example.com', phone: '+1-555-0107', totalOrders: 6, totalSpent: 950 },
      { id: '8', name: 'Mona Singh', email: 'mona.singh@example.com', phone: '+1-555-0108', totalOrders: 1, totalSpent: 150 },
    ];
  }
}

// Create singleton instance
export const dataService = new DataIntegrationService();

// React hook for using the data service
import { useState, useEffect, useCallback } from 'react';

export const useDataSearch = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchProducts = useCallback(async (query: string) => {
    if (!query.trim()) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      const results = await dataService.searchProducts(query);
      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const searchCollections = useCallback(async (query: string) => {
    if (!query.trim()) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      const results = await dataService.searchCollections(query);
      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const searchCategories = useCallback(async (query: string) => {
    if (!query.trim()) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      const results = await dataService.searchCategories(query);
      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const searchCustomers = useCallback(async (query: string) => {
    if (!query.trim()) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      const results = await dataService.searchCustomers(query);
      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    searchProducts,
    searchCollections,
    searchCategories,
    searchCustomers,
    loading,
    error
  };
};
