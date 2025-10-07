/**
 * Discount Page Refinements and Bug Fixes
 * Addresses the issues identified in the comprehensive assessment
 */

import { useState } from 'react';
import { format } from 'date-fns';

// Define the validation rule type
type ValidationRule = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  transform?: (value: string) => string;
  min?: number;
  max?: number | ((additionalData: any) => number);
  validator?: (value: any, additionalData?: any) => boolean;
  message: string;
};

// 1. Enhanced validation utility for discount forms
export const discountValidationRules: Record<string, ValidationRule> = {
  title: {
    required: true,
    minLength: 3,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-_%.]+$/,
    message: 'Title must be 3-100 characters and contain only letters, numbers, spaces, and basic symbols'
  },
  code: {
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: /^[A-Z0-9_-]+$/,
    transform: (value: string) => value.toUpperCase().trim(),
    message: 'Code must be 3-20 characters and contain only uppercase letters, numbers, hyphens, and underscores'
  },
  value: {
    required: true,
    min: 0,
    max: (valueType: string) => valueType === 'percentage' ? 100 : 10000,
    message: 'Value must be between 0 and 100 for percentage or 0 and 10000 for fixed amount'
  },
  startDate: {
    required: true,
    validator: (date: Date) => date >= new Date(),
    message: 'Start date must be today or in the future'
  },
  endDate: {
    validator: (endDate: Date, startDate: Date) => !endDate || endDate > startDate,
    message: 'End date must be after start date'
  },
  limitTotalUses: {
    min: 1,
    max: 1000000,
    message: 'Total uses limit must be between 1 and 1,000,000'
  }
};

// 2. Enhanced form validation hook
export const useDiscountFormValidation = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (field: string, value: any, additionalData?: any) => {
    const rule = discountValidationRules[field as keyof typeof discountValidationRules];
    if (!rule) return null;

    // Required validation
    if (rule.required && (!value || value === '')) {
      return `${field} is required`;
    }

    // Transform value if needed
    if (rule.transform && typeof value === 'string') {
      value = rule.transform(value);
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value)) {
      return rule.message;
    }

    // Length validation
    if (rule.minLength && value.length < rule.minLength) {
      return rule.message;
    }
    if (rule.maxLength && value.length > rule.maxLength) {
      return rule.message;
    }

    // Numeric validation
    if (rule.min !== undefined && value < rule.min) {
      return rule.message;
    }
    if (rule.max !== undefined) {
      const maxValue = typeof rule.max === 'function' ? rule.max(additionalData) : rule.max;
      if (value > maxValue) {
        return rule.message;
      }
    }

    // Custom validator
    if (rule.validator && !rule.validator(value, additionalData)) {
      return rule.message;
    }

    return null;
  };

  const validateForm = (formData: any) => {
    const newErrors: Record<string, string> = {};

    Object.keys(discountValidationRules).forEach(field => {
      const error = validateField(field, formData[field], formData);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearError = (field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  return { errors, validateField, validateForm, clearError };
};

// 3. Enhanced API integration with better error handling
export const discountApiService = {
  async createDiscount(discountData: any) {
    try {
      const response = await fetch('/api/discounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(discountData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create discount:', error);
      throw error;
    }
  },

  async updateDiscount(id: string, discountData: any) {
    try {
      const response = await fetch(`/api/discounts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(discountData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update discount:', error);
      throw error;
    }
  },

  async getDiscounts(filters?: any) {
    try {
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.keys(filters).forEach(key => {
          if (filters[key] !== undefined && filters[key] !== null) {
            queryParams.append(key, filters[key]);
          }
        });
      }

      const url = `/api/discounts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : data.data || [];
    } catch (error) {
      console.error('Failed to fetch discounts:', error);
      throw error;
    }
  }
};

// 4. Product/Collection selection integration (mock implementation ready for real data)
export const useProductSelection = () => {
  const [products, setProducts] = useState<{ id: string; name: string; price: number }[]>([]);
  const [collections, setCollections] = useState<{ id: string; name: string; productCount: number }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; productCount: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const searchProducts = async (query: string) => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
      // const products = await response.json();
      
      // Mock implementation for now
      const mockProducts = [
        { id: 'prod1', name: 'Krishna Painting', price: 150 },
        { id: 'prod2', name: 'Ganesha Painting', price: 200 },
        { id: 'prod3', name: 'Guru Nanak Art', price: 175 },
        { id: 'prod4', name: 'Abstract Sikh Art', price: 225 },
        { id: 'prod5', name: 'Entryway Ganesha Art', price: 300 },
      ].filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
      
      setProducts(mockProducts);
      return mockProducts;
    } catch (error) {
      console.error('Failed to search products:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const searchCollections = async (query: string) => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/collections/search?q=${encodeURIComponent(query)}`);
      // const collections = await response.json();
      
      // Mock implementation for now
      const mockCollections = [
        { id: 'col1', name: 'Summer Sale', productCount: 15 },
        { id: 'col2', name: 'New Arrivals', productCount: 8 },
        { id: 'col3', name: 'Religious Art', productCount: 25 },
      ].filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
      
      setCollections(mockCollections);
      return mockCollections;
    } catch (error) {
      console.error('Failed to search collections:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const searchCategories = async (query: string) => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/categories/search?q=${encodeURIComponent(query)}`);
      // const categories = await response.json();
      
      // Mock implementation for now
      const mockCategories = [
        { id: 'cat1', name: 'Paintings', productCount: 45 },
        { id: 'cat2', name: 'Sculptures', productCount: 12 },
        { id: 'cat3', name: 'Prints', productCount: 30 },
      ].filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
      
      setCategories(mockCategories);
      return mockCategories;
    } catch (error) {
      console.error('Failed to search categories:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    products,
    collections,
    categories,
    loading,
    searchProducts,
    searchCollections,
    searchCategories
  };
};

// 5. Enhanced date/time handling
export const useDateTimeManagement = () => {
  const formatDateTime = (date: Date) => {
    return {
      date: format(date, 'yyyy-MM-dd'),
      time: format(date, 'HH:mm'),
      display: format(date, 'MMM d, yyyy \'at\' h:mm a'),
      iso: date.toISOString()
    };
  };

  const combineDateAndTime = (date: Date, timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  };

  const validateDateRange = (startDate: Date, endDate?: Date) => {
    const now = new Date();
    const errors = [];

    if (startDate < now) {
      errors.push('Start date cannot be in the past');
    }

    if (endDate && endDate <= startDate) {
      errors.push('End date must be after start date');
    }

    return errors;
  };

  return {
    formatDateTime,
    combineDateAndTime,
    validateDateRange
  };
};

// 6. Analytics and reporting hooks (ready for implementation)
export const useDiscountAnalytics = (discountId?: string) => {
  const [analytics, setAnalytics] = useState<null | { totalUses: number; totalSavings: number; averageOrderValue: number; conversionRate: number; popularProducts: string[]; usageOverTime: { date: string; uses: number }[] }>(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // TODO: Implement actual analytics API
      // const response = await fetch(`/api/discounts/${discountId}/analytics`);
      // const data = await response.json();
      
      // Mock analytics data
      const mockAnalytics = {
        totalUses: 45,
        totalSavings: 1250.00,
        averageOrderValue: 175.50,
        conversionRate: 12.5,
        popularProducts: ['Krishna Painting', 'Ganesha Art'],
        usageOverTime: [
          { date: '2024-01-01', uses: 5 },
          { date: '2024-01-02', uses: 8 },
          { date: '2024-01-03', uses: 12 },
        ]
      };
      
      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return { analytics, loading, fetchAnalytics };
};

// 7. Bulk operations utility
export const useBulkDiscountOperations = () => {
  const [selectedDiscounts, setSelectedDiscounts] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const selectDiscount = (id: string) => {
    setSelectedDiscounts(prev => 
      prev.includes(id) 
        ? prev.filter(discountId => discountId !== id)
        : [...prev, id]
    );
  };

  const selectAllDiscounts = (discountIds: string[]) => {
    setSelectedDiscounts(discountIds);
  };

  const clearSelection = () => {
    setSelectedDiscounts([]);
  };

  const bulkUpdateStatus = async (status: string) => {
    setIsProcessing(true);
    try {
      const promises = selectedDiscounts.map(id =>
        fetch(`/api/discounts/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        })
      );
      
      await Promise.all(promises);
      clearSelection();
      return true;
    } catch (error) {
      console.error('Bulk update failed:', error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const bulkDelete = async () => {
    setIsProcessing(true);
    try {
      const promises = selectedDiscounts.map(id =>
        fetch(`/api/discounts/${id}`, { method: 'DELETE' })
      );
      
      await Promise.all(promises);
      clearSelection();
      return true;
    } catch (error) {
      console.error('Bulk delete failed:', error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    selectedDiscounts,
    isProcessing,
    selectDiscount,
    selectAllDiscounts,
    clearSelection,
    bulkUpdateStatus,
    bulkDelete
  };
};

console.log('✅ Discount page refinements and utilities ready for implementation');
