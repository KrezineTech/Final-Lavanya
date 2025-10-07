/**
 * Rate Limiting Middleware for Messaging API
 * 
 * Implements rate limiting to prevent abuse and ensure fair usage.
 * Uses in-memory store for development, can be extended to Redis for production.
 */

import { NextRequest, NextResponse } from 'next/server';

// Rate limit configuration
interface RateLimitConfig {
  windowMs: number;    // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;    // Custom error message
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// In-memory store for rate limiting (use Redis in production)
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  }
}

const store: RateLimitStore = {};

// Default configurations for different endpoint types
export const RATE_LIMIT_CONFIGS = {
  // Customer endpoints - more lenient
  CUSTOMER_READ: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,          // 100 requests per 15 minutes
    message: 'Too many requests. Please try again later.'
  },
  
  CUSTOMER_WRITE: {
    windowMs: 15 * 60 * 1000, // 15 minutes  
    maxRequests: 30,           // 30 writes per 15 minutes
    message: 'Too many messages sent. Please wait before sending more.'
  },
  
  // Admin endpoints - more strict
  ADMIN_READ: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 200,          // 200 requests per 15 minutes
    message: 'Admin rate limit exceeded. Please try again later.'
  },
  
  ADMIN_WRITE: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,          // 100 writes per 15 minutes  
    message: 'Admin write rate limit exceeded. Please try again later.'
  },
  
  // File upload - very strict
  FILE_UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,           // 10 uploads per hour
    message: 'File upload limit exceeded. Please try again later.'
  },
  
  // Authentication endpoints - strict
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,            // 5 auth attempts per 15 minutes
    message: 'Too many authentication attempts. Please try again later.'
  }
} as const;

/**
 * Generate a unique key for rate limiting based on IP and endpoint
 */
function generateKey(request: NextRequest, endpoint: string): string {
  // Get client IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  
  // Include user agent for additional uniqueness
  const userAgent = request.headers.get('user-agent') || '';
  const userAgentHash = Buffer.from(userAgent).toString('base64').slice(0, 8);
  
  return `${ip}:${endpoint}:${userAgentHash}`;
}

/**
 * Clean expired entries from store
 */
function cleanExpiredEntries(): void {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime <= now) {
      delete store[key];
    }
  }
}

/**
 * Rate limiting middleware factory
 */
export function createRateLimit(config: RateLimitConfig) {
  return function rateLimit(request: NextRequest, endpoint: string): NextResponse | null {
    // Clean expired entries periodically (every 100 requests)
    if (Math.random() < 0.01) {
      cleanExpiredEntries();
    }
    
    const key = generateKey(request, endpoint);
    const now = Date.now();
    
    // Get or create rate limit entry
    let entry = store[key];
    
    if (!entry || entry.resetTime <= now) {
      // Create new entry or reset expired entry
      entry = store[key] = {
        count: 0,
        resetTime: now + config.windowMs
      };
    }
    
    // Increment counter
    entry.count++;
    
    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      const resetInSeconds = Math.ceil((entry.resetTime - now) / 1000);
      
      return NextResponse.json(
        {
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: config.message || 'Rate limit exceeded',
          retryAfter: resetInSeconds,
          limit: config.maxRequests,
          windowMs: config.windowMs
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': entry.resetTime.toString(),
            'Retry-After': resetInSeconds.toString()
          }
        }
      );
    }
    
    // Add rate limit headers to successful requests
    const remaining = config.maxRequests - entry.count;
    
    // Return null to indicate request should proceed, but add headers via response
    return null; // Will be handled by the calling code to add headers
  };
}

/**
 * Get rate limit headers for successful responses
 */
export function getRateLimitHeaders(request: NextRequest, endpoint: string, config: RateLimitConfig): Record<string, string> {
  const key = generateKey(request, endpoint);
  const entry = store[key];
  
  if (!entry) {
    return {
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': config.maxRequests.toString(),
      'X-RateLimit-Reset': (Date.now() + config.windowMs).toString()
    };
  }
  
  const remaining = Math.max(0, config.maxRequests - entry.count);
  
  return {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': entry.resetTime.toString()
  };
}

/**
 * Easy-to-use rate limiting decorators for common cases
 */
export const rateLimiters = {
  customerRead: createRateLimit(RATE_LIMIT_CONFIGS.CUSTOMER_READ),
  customerWrite: createRateLimit(RATE_LIMIT_CONFIGS.CUSTOMER_WRITE),
  adminRead: createRateLimit(RATE_LIMIT_CONFIGS.ADMIN_READ),
  adminWrite: createRateLimit(RATE_LIMIT_CONFIGS.ADMIN_WRITE),
  fileUpload: createRateLimit(RATE_LIMIT_CONFIGS.FILE_UPLOAD),
  auth: createRateLimit(RATE_LIMIT_CONFIGS.AUTH)
};

/**
 * Utility function to apply rate limiting to API route handlers
 */
export function withRateLimit<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  config: RateLimitConfig,
  endpoint: string
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    // Apply rate limiting
    const rateLimit = createRateLimit(config);
    const rateLimitResult = rateLimit(request, endpoint);
    
    if (rateLimitResult) {
      // Rate limit exceeded
      return rateLimitResult;
    }
    
    // Execute the original handler
    const response = await handler(request, ...args);
    
    // Add rate limit headers to successful responses
    const headers = getRateLimitHeaders(request, endpoint, config);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  };
}

/**
 * Middleware to check if client is likely a bot or suspicious
 */
export function detectSuspiciousActivity(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent') || '';
  
  // Common bot patterns (extend as needed)
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python-requests/i,
    /postman/i
  ];
  
  // Check for missing common headers
  const hasCommonHeaders = request.headers.get('accept') && request.headers.get('accept-language');
  
  // Check for bot patterns
  const isBotUserAgent = botPatterns.some(pattern => pattern.test(userAgent));
  
  return isBotUserAgent || !hasCommonHeaders;
}

/**
 * Get rate limit status for monitoring
 */
export function getRateLimitStats(): {
  totalKeys: number;
  entries: Array<{
    key: string;
    count: number;
    resetTime: number;
    remaining: number;
  }>;
} {
  cleanExpiredEntries();
  
  const entries = Object.entries(store).map(([key, value]) => ({
    key: key.split(':')[0] + ':***', // Hide full key for privacy
    count: value.count,
    resetTime: value.resetTime,
    remaining: Math.max(0, RATE_LIMIT_CONFIGS.CUSTOMER_READ.maxRequests - value.count)
  }));
  
  return {
    totalKeys: Object.keys(store).length,
    entries
  };
}

/**
 * Reset rate limit for a specific IP (admin function)
 */
export function resetRateLimit(ip: string, endpoint?: string): boolean {
  let resetCount = 0;
  
  for (const key in store) {
    if (key.startsWith(ip) && (!endpoint || key.includes(endpoint))) {
      delete store[key];
      resetCount++;
    }
  }
  
  return resetCount > 0;
}

export default {
  createRateLimit,
  rateLimiters,
  withRateLimit,
  getRateLimitHeaders,
  detectSuspiciousActivity,
  getRateLimitStats,
  resetRateLimit,
  RATE_LIMIT_CONFIGS
};