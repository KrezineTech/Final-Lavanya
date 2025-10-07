import type { NextApiResponse } from 'next';
import { Prisma } from '@prisma/client';

export interface APIError {
  code: string;
  message: string;
  field?: string;
  details?: any;
}

export interface APIErrorResponse {
  success: false;
  error: APIError;
  timestamp: string;
  requestId?: string;
}

/**
 * Centralized error handling for API routes
 */
export class ErrorHandler {
  
  /**
   * Handle Prisma database errors
   */
  static handlePrismaError(error: Prisma.PrismaClientKnownRequestError): APIError {
    switch (error.code) {
      case 'P2002':
        return {
          code: 'DUPLICATE_ENTRY',
          message: 'A record with this information already exists',
          field: this.extractConstraintField(error.meta?.target),
          details: error.meta
        };
        
      case 'P2014':
        return {
          code: 'INVALID_ID',
          message: 'The ID you provided is invalid',
          details: error.meta
        };
        
      case 'P2003':
        return {
          code: 'FOREIGN_KEY_CONSTRAINT',
          message: 'This record is referenced by other data and cannot be modified',
          details: error.meta
        };
        
      case 'P2025':
        return {
          code: 'RECORD_NOT_FOUND',
          message: 'The requested record was not found',
          details: error.meta
        };
        
      case 'P2000':
        return {
          code: 'VALUE_TOO_LONG',
          message: 'One of the values provided is too long',
          details: error.meta
        };
        
      case 'P2001':
        return {
          code: 'RECORD_DOES_NOT_EXIST',
          message: 'The record you are trying to access does not exist',
          details: error.meta
        };
        
      case 'P2004':
        return {
          code: 'CONSTRAINT_FAILED',
          message: 'A database constraint was violated',
          details: error.meta
        };
        
      case 'P2015':
        return {
          code: 'RELATED_RECORD_NOT_FOUND',
          message: 'A related record could not be found',
          details: error.meta
        };
        
      case 'P2016':
        return {
          code: 'QUERY_INTERPRETATION_ERROR',
          message: 'Query could not be interpreted',
          details: error.meta
        };
        
      case 'P2017':
        return {
          code: 'RECORDS_NOT_CONNECTED',
          message: 'The records are not connected',
          details: error.meta
        };
        
      default:
        return {
          code: 'DATABASE_ERROR',
          message: 'A database error occurred',
          details: { prismaCode: error.code, meta: error.meta }
        };
    }
  }
  
  /**
   * Handle validation errors
   */
  static handleValidationError(field: string, message: string): APIError {
    return {
      code: 'VALIDATION_ERROR',
      message,
      field
    };
  }
  
  /**
   * Handle authentication errors
   */
  static handleAuthError(message: string = 'Authentication required'): APIError {
    return {
      code: 'AUTHENTICATION_ERROR',
      message
    };
  }
  
  /**
   * Handle authorization errors
   */
  static handleAuthorizationError(message: string = 'Insufficient permissions'): APIError {
    return {
      code: 'AUTHORIZATION_ERROR',
      message
    };
  }
  
  /**
   * Handle rate limiting errors
   */
  static handleRateLimitError(message: string = 'Too many requests'): APIError {
    return {
      code: 'RATE_LIMIT_ERROR',
      message
    };
  }
  
  /**
   * Handle file upload errors
   */
  static handleFileUploadError(message: string): APIError {
    return {
      code: 'FILE_UPLOAD_ERROR',
      message
    };
  }
  
  /**
   * Handle external API errors
   */
  static handleExternalAPIError(service: string, message: string): APIError {
    return {
      code: 'EXTERNAL_API_ERROR',
      message: `${service}: ${message}`
    };
  }
  
  /**
   * Handle generic server errors
   */
  static handleServerError(message: string = 'Internal server error'): APIError {
    return {
      code: 'INTERNAL_SERVER_ERROR',
      message
    };
  }
  
  /**
   * Send error response
   */
  static sendError(
    res: NextApiResponse<APIErrorResponse>,
    error: APIError,
    statusCode: number = 400,
    requestId?: string
  ): void {
    const response: APIErrorResponse = {
      success: false,
      error,
      timestamp: new Date().toISOString(),
      requestId
    };
    
    // Log error for monitoring
    console.error(`API Error [${statusCode}]:`, {
      ...response,
      stack: error.details?.stack
    });
    
    res.status(statusCode).json(response);
  }
  
  /**
   * Process and send error
   */
  static processError(
    res: NextApiResponse,
    error: unknown,
    requestId?: string
  ): void {
    // Handle Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const apiError = this.handlePrismaError(error);
      const statusCode = this.getStatusCodeForPrismaError(error.code);
      return this.sendError(res, apiError, statusCode, requestId);
    }
    
    // Handle Prisma validation errors
    if (error instanceof Prisma.PrismaClientValidationError) {
      const apiError = this.handleValidationError('query', 'Invalid query parameters');
      return this.sendError(res, apiError, 400, requestId);
    }
    
    // Handle custom API errors
    if (this.isAPIError(error)) {
      const statusCode = this.getStatusCodeForAPIError(error.code);
      return this.sendError(res, error, statusCode, requestId);
    }
    
    // Handle JavaScript errors
    if (error instanceof Error) {
      const apiError = this.handleServerError(
        process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      );
      apiError.details = process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        name: error.name
      } : undefined;
      return this.sendError(res, apiError, 500, requestId);
    }
    
    // Handle unknown errors
    const apiError = this.handleServerError('An unexpected error occurred');
    this.sendError(res, apiError, 500, requestId);
  }
  
  /**
   * Extract field name from Prisma constraint
   */
  private static extractConstraintField(target: any): string | undefined {
    if (Array.isArray(target) && target.length > 0) {
      return target[0];
    }
    if (typeof target === 'string') {
      return target;
    }
    return undefined;
  }
  
  /**
   * Get HTTP status code for Prisma error
   */
  private static getStatusCodeForPrismaError(code: string): number {
    switch (code) {
      case 'P2002': return 409; // Conflict
      case 'P2014': return 400; // Bad Request
      case 'P2003': return 409; // Conflict
      case 'P2025': return 404; // Not Found
      case 'P2001': return 404; // Not Found
      case 'P2015': return 404; // Not Found
      default: return 500; // Internal Server Error
    }
  }
  
  /**
   * Get HTTP status code for API error
   */
  private static getStatusCodeForAPIError(code: string): number {
    switch (code) {
      case 'VALIDATION_ERROR': return 400;
      case 'AUTHENTICATION_ERROR': return 401;
      case 'AUTHORIZATION_ERROR': return 403;
      case 'RATE_LIMIT_ERROR': return 429;
      case 'FILE_UPLOAD_ERROR': return 400;
      case 'EXTERNAL_API_ERROR': return 502;
      case 'DUPLICATE_ENTRY': return 409;
      case 'RECORD_NOT_FOUND': return 404;
      case 'INVALID_ID': return 400;
      default: return 500;
    }
  }
  
  /**
   * Check if error is an API error
   */
  private static isAPIError(error: any): error is APIError {
    return error && typeof error === 'object' && 'code' in error && 'message' in error;
  }
}

/**
 * Async error wrapper for API routes
 */
export function asyncHandler(
  handler: (req: any, res: any) => Promise<void>
) {
  return async (req: any, res: any) => {
    try {
      await handler(req, res);
    } catch (error) {
      ErrorHandler.processError(res, error);
    }
  };
}

/**
 * Input validation helper
 */
export function validateRequired(value: any, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw ErrorHandler.handleValidationError(fieldName, `${fieldName} is required`);
  }
}

export function validateString(value: any, fieldName: string, maxLength?: number): void {
  validateRequired(value, fieldName);
  if (typeof value !== 'string') {
    throw ErrorHandler.handleValidationError(fieldName, `${fieldName} must be a string`);
  }
  if (maxLength && value.length > maxLength) {
    throw ErrorHandler.handleValidationError(
      fieldName, 
      `${fieldName} must be ${maxLength} characters or less`
    );
  }
}

export function validateNumber(value: any, fieldName: string, min?: number, max?: number): void {
  validateRequired(value, fieldName);
  const num = Number(value);
  if (isNaN(num)) {
    throw ErrorHandler.handleValidationError(fieldName, `${fieldName} must be a number`);
  }
  if (min !== undefined && num < min) {
    throw ErrorHandler.handleValidationError(fieldName, `${fieldName} must be at least ${min}`);
  }
  if (max !== undefined && num > max) {
    throw ErrorHandler.handleValidationError(fieldName, `${fieldName} must be at most ${max}`);
  }
}

export function validateEmail(value: any, fieldName: string): void {
  validateString(value, fieldName);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    throw ErrorHandler.handleValidationError(fieldName, `${fieldName} must be a valid email address`);
  }
}

export function validateArray(value: any, fieldName: string, maxLength?: number): void {
  validateRequired(value, fieldName);
  if (!Array.isArray(value)) {
    throw ErrorHandler.handleValidationError(fieldName, `${fieldName} must be an array`);
  }
  if (maxLength && value.length > maxLength) {
    throw ErrorHandler.handleValidationError(
      fieldName, 
      `${fieldName} must contain ${maxLength} items or less`
    );
  }
}
