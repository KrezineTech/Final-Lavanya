import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { supportLogger } from '@/lib/logger';
import { createEmailService } from '@/lib/email-notifications';

const prisma = new PrismaClient();
const emailService = createEmailService();

// Rate limiting store (in production, use Redis or similar)
const rateLimit = new Map<string, { count: number; resetTime: number }>();

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email format').max(200),
  phone: z.string().optional().transform(val => val === '' ? undefined : val),
  subject: z.string().min(1, 'Subject is required').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000),
  category: z.enum(['GENERAL', 'SUPPORT', 'SALES', 'COMMISSION', 'FEEDBACK', 'ORDER_INQUIRY']).optional().default('GENERAL'),
});

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 5; // 5 requests per 15 minutes

  const current = rateLimit.get(ip);
  
  if (!current || now > current.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false;
  }
  
  current.count++;
  return true;
}

function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0] : req.connection.remoteAddress;
  return ip || 'unknown';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIP = getClientIP(req);
  const userAgent = req.headers['user-agent'] || '';

  try {
    // Rate limiting
    if (!checkRateLimit(clientIP)) {
      supportLogger.logRateLimit({
        ipAddress: clientIP,
        endpoint: '/api/contact',
        attempts: 6, // Over limit
        windowMs: 15 * 60 * 1000
      });
      
      return res.status(429).json({ 
        error: 'Too many requests. Please try again later.',
        retryAfter: 900 // 15 minutes in seconds
      });
    }

    // Validate input
    const validation = contactSchema.safeParse(req.body);
    if (!validation.success) {
      supportLogger.logError('Contact form validation failed', {
        action: 'contact_form_validation_failed',
        additionalInfo: {
          ipAddress: clientIP,
          userAgent,
          validationErrors: validation.error.errors
        }
      });
      
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors
      });
    }

    const { name, email, phone, subject, message, category } = validation.data;

    // Save to database
    const contactMessage = await prisma.contactMessage.create({
      data: {
        name,
        email,
        phone,
        subject,
        message,
        category,
        ipAddress: clientIP,
        userAgent: userAgent,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'website',
          userAgent: userAgent,
          referer: req.headers.referer || null
        }
      }
    });

    // Log successful submission
    supportLogger.logContactSubmission(contactMessage.id, {
      category,
      email,
      ipAddress: clientIP,
      userAgent
    });

    // Send email notification (async, don't wait for it)
    if (emailService) {
      emailService.notifyNewMessage(contactMessage).catch(error => {
        supportLogger.logError('Failed to send email notification', {
          action: 'email_notification_failed',
          messageId: contactMessage.id,
          additionalInfo: { error: error.message }
        });
      });
    }

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you soon.',
      id: contactMessage.id
    });

  } catch (error) {
    supportLogger.logError(error as Error, {
      action: 'contact_form_submission_error',
      additionalInfo: {
        ipAddress: clientIP,
        userAgent,
        requestBody: req.body
      }
    });
    
    res.status(500).json({
      error: 'Internal server error. Please try again later.'
    });
  }
}
