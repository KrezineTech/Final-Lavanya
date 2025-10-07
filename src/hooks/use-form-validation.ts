import { useState, useCallback } from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number | ((context?: any) => number);
  pattern?: RegExp;
  validator?: (value: any, context?: any) => boolean;
  message: string;
}

export interface ValidationRules {
  [field: string]: ValidationRule;
}

export const discountValidationRules: ValidationRules = {
  title: {
    required: true,
    minLength: 3,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-_%.,'()!&]+$/,
    message: 'Title must be 3-100 characters and contain only letters, numbers, spaces, and basic symbols'
  },
  code: {
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: /^[A-Z0-9_-]+$/,
    message: 'Code must be 3-20 characters and contain only uppercase letters, numbers, hyphens, and underscores'
  },
  value: {
    required: true,
    min: 0,
    max: (context?: any) => {
      if (context?.valueType === 'percentage') return 100;
      return 10000; // $10,000 max for fixed amounts
    },
    message: 'Value must be between 0 and 100 for percentage or 0 and 10000 for fixed amount'
  },
  startDate: {
    required: true,
    validator: (date: Date) => {
      if (!date) return false;
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Reset time for date-only comparison
      const inputDate = new Date(date);
      inputDate.setHours(0, 0, 0, 0);
      return inputDate >= now;
    },
    message: 'Start date must be today or in the future'
  },
  endDate: {
    validator: (endDate: Date, context?: any) => {
      if (!endDate) return true; // Optional field
      if (!context?.startDate) return true;
      return new Date(endDate) > new Date(context.startDate);
    },
    message: 'End date must be after start date'
  },
  limitTotalUses: {
    min: 1,
    max: 1000000,
    message: 'Total uses limit must be between 1 and 1,000,000'
  },
  limitPerCustomerValue: {
    min: 1,
    max: 100,
    message: 'Per customer limit must be between 1 and 100'
  }
};

export const useFormValidation = (rules: ValidationRules) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = useCallback((field: string, value: any, context?: any) => {
    const rule = rules[field];
    if (!rule) return null;

    // Required validation
    if (rule.required && (value === undefined || value === null || value === '')) {
      return rule.message;
    }

    // Skip other validations if field is not required and empty
    if (!rule.required && (value === undefined || value === null || value === '')) {
      return null;
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return rule.message;
    }

    // Length validation
    if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      return rule.message;
    }
    if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      return rule.message;
    }

    // Numeric validation
    if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
      return rule.message;
    }
    if (rule.max !== undefined && typeof value === 'number') {
      const maxValue = typeof rule.max === 'function' ? rule.max(context) : rule.max;
      if (value > maxValue) {
        return rule.message;
      }
    }

    // Custom validator
    if (rule.validator && !rule.validator(value, context)) {
      return rule.message;
    }

    return null;
  }, [rules]);

  const validateForm = useCallback((formData: any) => {
    const newErrors: Record<string, string> = {};

    Object.keys(rules).forEach(field => {
      const error = validateField(field, formData[field], formData);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [rules, validateField]);

  const validateSingleField = useCallback((field: string, value: any, context?: any) => {
    const error = validateField(field, value, context);
    setErrors(prev => ({
      ...prev,
      [field]: error || ''
    }));
    return !error;
  }, [validateField]);

  const clearError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    errors,
    validateField,
    validateForm,
    validateSingleField,
    clearError,
    clearAllErrors,
    hasErrors: Object.keys(errors).length > 0
  };
};

// Helper function to display validation errors
export const getErrorMessage = (errors: Record<string, string>, field: string): string | undefined => {
  return errors[field] && errors[field] !== '' ? errors[field] : undefined;
};

// Helper function to check if field has error
export const hasFieldError = (errors: Record<string, string>, field: string): boolean => {
  return !!(errors[field] && errors[field] !== '');
};

// Core validation functions
export const validateDiscountCode = (code: string): string | null => {
  if (!code || code.trim() === '') {
    return 'Discount code is required';
  }
  if (code.length < 3) {
    return 'Discount code must be at least 3 characters long';
  }
  if (code.length > 20) {
    return 'Discount code cannot exceed 20 characters';
  }
  if (!/^[A-Z0-9]+$/.test(code)) {
    return 'Discount code can only contain uppercase letters and numbers';
  }
  return null;
};

export const validateDiscountValue = (value: number, type: 'percentage' | 'fixed'): string | null => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'Discount value is required';
  }
  if (value <= 0) {
    return 'Discount value must be greater than 0';
  }
  if (type === 'percentage' && value > 100) {
    return 'Percentage discount cannot exceed 100%';
  }
  if (type === 'fixed' && value > 10000) {
    return 'Fixed discount amount seems unusually high';
  }
  return null;
};

// Specific hooks for discount validation
export const useDiscountValidation = () => {
  return useFormValidation(discountValidationRules);
};

// Specific hook for Buy X Get Y validation
export const useBuyXGetYValidation = () => {
  const buyXGetYRules: ValidationRules = {
    ...discountValidationRules,
    buyQuantity: {
      required: true,
      min: 1,
      message: 'Buy quantity must be at least 1'
    },
    getQuantity: {
      required: true,
      min: 1,
      message: 'Get quantity must be at least 1'
    },
    buyProducts: {
      required: true,
      message: 'At least one buy product must be selected'
    },
    getProducts: {
      required: true,
      message: 'At least one get product must be selected'
    }
  };
  
  return useFormValidation(buyXGetYRules);
};
