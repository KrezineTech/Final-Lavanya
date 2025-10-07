import type { NextApiResponse } from 'next';

export interface APISuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    pages?: number;
    responseTime?: number;
    cached?: boolean;
  };
  timestamp: string;
  requestId?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/**
 * API Response Helper for consistent response formatting
 */
export class ResponseHelper {
  
  /**
   * Send success response
   */
  static sendSuccess<T>(
    res: NextApiResponse<APISuccessResponse<T>>,
    data: T,
    message?: string,
    statusCode: number = 200,
    meta?: any,
    requestId?: string
  ): void {
    const response: APISuccessResponse<T> = {
      success: true,
      data,
      message,
      meta,
      timestamp: new Date().toISOString(),
      requestId
    };
    
    res.status(statusCode).json(response);
  }
  
  /**
   * Send paginated response
   */
  static sendPaginated<T>(
    res: NextApiResponse<APISuccessResponse<T[]>>,
    data: T[],
    pagination: PaginationMeta,
    message?: string,
    responseTime?: number,
    cached?: boolean,
    requestId?: string
  ): void {
    const meta = {
      ...pagination,
      responseTime,
      cached
    };
    
    this.sendSuccess(res, data, message, 200, meta, requestId);
  }
  
  /**
   * Send created response
   */
  static sendCreated<T>(
    res: NextApiResponse<APISuccessResponse<T>>,
    data: T,
    message: string = 'Resource created successfully',
    requestId?: string
  ): void {
    this.sendSuccess(res, data, message, 201, undefined, requestId);
  }
  
  /**
   * Send updated response
   */
  static sendUpdated<T>(
    res: NextApiResponse<APISuccessResponse<T>>,
    data: T,
    message: string = 'Resource updated successfully',
    requestId?: string
  ): void {
    this.sendSuccess(res, data, message, 200, undefined, requestId);
  }
  
  /**
   * Send deleted response
   */
  static sendDeleted(
    res: NextApiResponse<APISuccessResponse<null>>,
    message: string = 'Resource deleted successfully',
    requestId?: string
  ): void {
    this.sendSuccess(res, null, message, 200, undefined, requestId);
  }
  
  /**
   * Send bulk operation response
   */
  static sendBulkOperation<T>(
    res: NextApiResponse<APISuccessResponse<T>>,
    data: T,
    affected: number,
    operation: string,
    requestId?: string
  ): void {
    const message = `${affected} record(s) ${operation} successfully`;
    const meta = { affected, operation };
    this.sendSuccess(res, data, message, 200, meta, requestId);
  }
  
  /**
   * Send no content response
   */
  static sendNoContent(res: NextApiResponse): void {
    res.status(204).end();
  }
  
  /**
   * Calculate pagination metadata
   */
  static calculatePagination(
    total: number,
    page: number = 1,
    limit: number = 20
  ): PaginationMeta {
    const pages = Math.ceil(total / limit);
    
    return {
      page: Math.max(1, page),
      limit: Math.max(1, limit),
      total,
      pages: Math.max(1, pages)
    };
  }
  
  /**
   * Validate pagination parameters
   */
  static validatePagination(page?: any, limit?: any): { page: number; limit: number } {
    let validPage = 1;
    let validLimit = 20;
    
    if (page !== undefined) {
      const parsedPage = parseInt(String(page), 10);
      if (!isNaN(parsedPage) && parsedPage > 0 && parsedPage <= 10000) {
        validPage = parsedPage;
      }
    }
    
    if (limit !== undefined) {
      const parsedLimit = parseInt(String(limit), 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100) {
        validLimit = parsedLimit;
      }
    }
    
    return { page: validPage, limit: validLimit };
  }
  
  /**
   * Generate request ID for tracking
   */
  static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
  
  /**
   * Add CORS headers
   */
  static addCorsHeaders(res: NextApiResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  
  /**
   * Add cache headers
   */
  static addCacheHeaders(res: NextApiResponse, maxAge: number = 300): void {
    res.setHeader('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge}`);
    res.setHeader('Vary', 'Accept-Encoding');
  }
  
  /**
   * Add no-cache headers
   */
  static addNoCacheHeaders(res: NextApiResponse): void {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  /**
   * Handle OPTIONS request
   */
  static handleOptions(res: NextApiResponse): void {
    this.addCorsHeaders(res);
    res.status(204).end();
  }
  
  /**
   * Send file response
   */
  static sendFile(
    res: NextApiResponse,
    buffer: Buffer,
    filename: string,
    mimeType: string = 'application/octet-stream'
  ): void {
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.status(200).send(buffer);
  }
  
  /**
   * Send CSV response
   */
  static sendCSV(
    res: NextApiResponse,
    csvData: string,
    filename: string = 'export.csv'
  ): void {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(`\uFEFF${csvData}`); // Add BOM for Excel compatibility
  }
  
  /**
   * Send JSON download
   */
  static sendJSONDownload(
    res: NextApiResponse,
    data: any,
    filename: string = 'export.json'
  ): void {
    const jsonData = JSON.stringify(data, null, 2);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(jsonData);
  }
  
  /**
   * Send redirect response
   */
  static sendRedirect(
    res: NextApiResponse,
    url: string,
    permanent: boolean = false
  ): void {
    const statusCode = permanent ? 301 : 302;
    res.setHeader('Location', url);
    res.status(statusCode).end();
  }
  
  /**
   * Format response with timing
   */
  static withTiming<T>(
    data: T,
    startTime: number,
    cached: boolean = false
  ): { data: T; meta: { responseTime: number; cached: boolean } } {
    const responseTime = Date.now() - startTime;
    return {
      data,
      meta: {
        responseTime,
        cached
      }
    };
  }
  
  /**
   * Format validation errors for response
   */
  static formatValidationErrors(errors: Array<{ field: string; message: string }>): any {
    return {
      type: 'validation_error',
      errors: errors.reduce((acc, error) => {
        acc[error.field] = error.message;
        return acc;
      }, {} as Record<string, string>)
    };
  }
  
  /**
   * Sanitize data for response (remove sensitive fields)
   */
  static sanitizeData<T>(data: T, excludeFields: string[] = []): T {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    const defaultExcludeFields = ['password', 'secret', 'token', 'key', 'hash'];
    const fieldsToExclude = [...defaultExcludeFields, ...excludeFields];
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item, excludeFields)) as T;
    }
    
    const sanitized = { ...data } as any;
    
    for (const field of fieldsToExclude) {
      if (field in sanitized) {
        delete sanitized[field];
      }
    }
    
    // Recursively sanitize nested objects
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key], excludeFields);
      }
    }
    
    return sanitized;
  }
}

/**
 * Higher-order function for API route middleware
 */
export function withApiHelpers(
  handler: (req: any, res: any, helpers: typeof ResponseHelper) => Promise<void>
) {
  return async (req: any, res: any) => {
    const requestId = ResponseHelper.generateRequestId();
    
    // Add request ID to request object for logging
    req.requestId = requestId;
    
    // Add CORS headers
    ResponseHelper.addCorsHeaders(res);
    
    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
      return ResponseHelper.handleOptions(res);
    }
    
    try {
      await handler(req, res, ResponseHelper);
    } catch (error) {
      console.error(`API Error [${requestId}]:`, error);
      
      // Import ErrorHandler here to avoid circular dependency
      const { ErrorHandler } = await import('./error-handler');
      ErrorHandler.processError(res, error, requestId);
    }
  };
}
