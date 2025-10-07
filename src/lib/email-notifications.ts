/**
 * Email Notification System for Support Page
 * Handles email notifications for new contact messages and status updates
 */

import { ContactMessage } from '@prisma/client';

export interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'ses' | 'nodemailer';
  apiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  fromEmail: string;
  fromName: string;
  adminEmails: string[];
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface NotificationContext {
  message: ContactMessage;
  adminUser?: {
    name: string;
    email: string;
  };
  additionalInfo?: Record<string, any>;
}

export class EmailNotificationService {
  private config: EmailConfig;
  private templates: Map<string, EmailTemplate>;

  constructor(config: EmailConfig) {
    this.config = config;
    this.templates = new Map();
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    // New message notification template
    this.templates.set('new_message', {
      subject: 'New Support Message: {{subject}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin: 0;">New Support Message Received</h2>
          </div>
          
          <div style="background-color: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
            <h3 style="color: #495057; border-bottom: 1px solid #dee2e6; padding-bottom: 10px;">Message Details</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 120px;">From:</td>
                <td style="padding: 8px 0;">{{name}} ({{email}})</td>
              </tr>
              {{#if phone}}
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Phone:</td>
                <td style="padding: 8px 0;">{{phone}}</td>
              </tr>
              {{/if}}
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Subject:</td>
                <td style="padding: 8px 0;">{{subject}}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Category:</td>
                <td style="padding: 8px 0;"><span style="background-color: #e9ecef; padding: 2px 8px; border-radius: 4px;">{{category}}</span></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Received:</td>
                <td style="padding: 8px 0;">{{receivedAt}}</td>
              </tr>
            </table>
            
            <h4 style="color: #495057; margin-top: 20px; margin-bottom: 10px;">Message:</h4>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; white-space: pre-wrap;">{{message}}</div>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6;">
              <a href="{{adminUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">View in Admin Panel</a>
            </div>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 4px; font-size: 12px; color: #6c757d;">
            <p>This is an automated notification from your support system. Please do not reply to this email.</p>
          </div>
        </div>
      `,
      text: `
New Support Message Received

From: {{name}} ({{email}})
{{#if phone}}Phone: {{phone}}{{/if}}
Subject: {{subject}}
Category: {{category}}
Received: {{receivedAt}}

Message:
{{message}}

View in admin panel: {{adminUrl}}
      `
    });

    // Status update notification template
    this.templates.set('status_update', {
      subject: 'Support Message Status Updated: {{subject}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin: 0;">Support Message Status Updated</h2>
          </div>
          
          <div style="background-color: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
            <p>A support message has been updated:</p>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 120px;">Message ID:</td>
                <td style="padding: 8px 0;">{{messageId}}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Subject:</td>
                <td style="padding: 8px 0;">{{subject}}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">New Status:</td>
                <td style="padding: 8px 0;"><span style="background-color: {{statusColor}}; color: white; padding: 2px 8px; border-radius: 4px;">{{newStatus}}</span></td>
              </tr>
              {{#if adminUser}}
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Updated by:</td>
                <td style="padding: 8px 0;">{{adminUser.name}} ({{adminUser.email}})</td>
              </tr>
              {{/if}}
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Updated at:</td>
                <td style="padding: 8px 0;">{{updatedAt}}</td>
              </tr>
            </table>
            
            {{#if adminNotes}}
            <h4 style="color: #495057; margin-top: 20px; margin-bottom: 10px;">Admin Notes:</h4>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; white-space: pre-wrap;">{{adminNotes}}</div>
            {{/if}}
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6;">
              <a href="{{adminUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">View in Admin Panel</a>
            </div>
          </div>
        </div>
      `,
      text: `
Support Message Status Updated

Message ID: {{messageId}}
Subject: {{subject}}
New Status: {{newStatus}}
{{#if adminUser}}Updated by: {{adminUser.name}} ({{adminUser.email}}){{/if}}
Updated at: {{updatedAt}}

{{#if adminNotes}}
Admin Notes:
{{adminNotes}}
{{/if}}

View in admin panel: {{adminUrl}}
      `
    });

    // Assignment notification template
    this.templates.set('assignment', {
      subject: 'Support Message Assigned to You: {{subject}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin: 0;">Support Message Assigned</h2>
          </div>
          
          <div style="background-color: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
            <p>A support message has been assigned to you:</p>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 120px;">From:</td>
                <td style="padding: 8px 0;">{{name}} ({{email}})</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Subject:</td>
                <td style="padding: 8px 0;">{{subject}}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Category:</td>
                <td style="padding: 8px 0;">{{category}}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Priority:</td>
                <td style="padding: 8px 0;">{{priority}}</td>
              </tr>
            </table>
            
            <h4 style="color: #495057; margin-top: 20px; margin-bottom: 10px;">Message:</h4>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; white-space: pre-wrap;">{{message}}</div>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6;">
              <a href="{{adminUrl}}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Respond to Message</a>
            </div>
          </div>
        </div>
      `,
      text: `
Support Message Assigned to You

From: {{name}} ({{email}})
Subject: {{subject}}
Category: {{category}}
Priority: {{priority}}

Message:
{{message}}

Respond to message: {{adminUrl}}
      `
    });
  }

  /**
   * Send notification for new contact message
   */
  async notifyNewMessage(message: ContactMessage): Promise<void> {
    try {
      const template = this.templates.get('new_message');
      if (!template) {
        throw new Error('New message template not found');
      }

      const context = {
        name: message.name,
        email: message.email,
        phone: message.phone,
        subject: message.subject,
        message: message.message,
        category: message.category,
        receivedAt: new Date(message.createdAt).toLocaleString(),
        adminUrl: `${process.env.ADMIN_URL}/support?messageId=${message.id}`,
        messageId: message.id
      };

      const renderedEmail = this.renderTemplate(template, context);

      await this.sendEmail({
        to: this.config.adminEmails,
        subject: renderedEmail.subject,
        html: renderedEmail.html,
        text: renderedEmail.text
      });

      console.log(`New message notification sent for message ${message.id}`);
    } catch (error) {
      console.error('Failed to send new message notification:', error);
      throw error;
    }
  }

  /**
   * Send notification for status update
   */
  async notifyStatusUpdate(
    message: ContactMessage,
    oldStatus: string,
    adminUser?: { name: string; email: string }
  ): Promise<void> {
    try {
      const template = this.templates.get('status_update');
      if (!template) {
        throw new Error('Status update template not found');
      }

      const statusColors = {
        NEW: '#dc3545',
        READ: '#ffc107',
        RESOLVED: '#28a745'
      };

      const context = {
        messageId: message.id,
        subject: message.subject,
        newStatus: message.status,
        statusColor: statusColors[message.status as keyof typeof statusColors] || '#6c757d',
        adminUser,
        adminNotes: message.adminNotes,
        updatedAt: new Date(message.updatedAt).toLocaleString(),
        adminUrl: `${process.env.ADMIN_URL}/support?messageId=${message.id}`
      };

      const renderedEmail = this.renderTemplate(template, context);

      await this.sendEmail({
        to: this.config.adminEmails,
        subject: renderedEmail.subject,
        html: renderedEmail.html,
        text: renderedEmail.text
      });

      console.log(`Status update notification sent for message ${message.id}`);
    } catch (error) {
      console.error('Failed to send status update notification:', error);
      throw error;
    }
  }

  /**
   * Send assignment notification
   */
  async notifyAssignment(
    message: ContactMessage,
    assigneeEmail: string
  ): Promise<void> {
    try {
      const template = this.templates.get('assignment');
      if (!template) {
        throw new Error('Assignment template not found');
      }

      const context = {
        name: message.name,
        email: message.email,
        subject: message.subject,
        message: message.message,
        category: message.category,
        priority: 'Normal', // Default priority
        adminUrl: `${process.env.ADMIN_URL}/support?messageId=${message.id}`
      };

      const renderedEmail = this.renderTemplate(template, context);

      await this.sendEmail({
        to: [assigneeEmail],
        subject: renderedEmail.subject,
        html: renderedEmail.html,
        text: renderedEmail.text
      });

      console.log(`Assignment notification sent for message ${message.id} to ${assigneeEmail}`);
    } catch (error) {
      console.error('Failed to send assignment notification:', error);
      throw error;
    }
  }

  /**
   * Render email template with context
   */
  private renderTemplate(template: EmailTemplate, context: Record<string, any>): EmailTemplate {
    const renderString = (str: string): string => {
      return str.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const keys = key.trim().split('.');
        let value: any = context;
        
        for (const k of keys) {
          if (value && typeof value === 'object' && k in value) {
            value = value[k];
          } else {
            return match; // Return original if key not found
          }
        }
        
        return String(value || '');
      });
    };

    // Handle conditional blocks
    const renderConditional = (str: string): string => {
      return str.replace(/\{\{#if ([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
        const keys = condition.trim().split('.');
        let value: any = context;
        
        for (const k of keys) {
          if (value && typeof value === 'object' && k in value) {
            value = value[k];
          } else {
            value = null;
            break;
          }
        }
        
        return value ? content : '';
      });
    };

    return {
      subject: renderString(template.subject),
      html: renderConditional(renderString(template.html)),
      text: renderConditional(renderString(template.text))
    };
  }

  /**
   * Send email using configured provider
   */
  private async sendEmail(options: {
    to: string[];
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    switch (this.config.provider) {
      case 'smtp':
        await this.sendWithSMTP(options);
        break;
      case 'sendgrid':
        await this.sendWithSendGrid(options);
        break;
      case 'ses':
        await this.sendWithSES(options);
        break;
      default:
        throw new Error(`Unsupported email provider: ${this.config.provider}`);
    }
  }

  /**
   * Send email using SMTP (placeholder implementation)
   */
  private async sendWithSMTP(options: {
    to: string[];
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    // Only run on server side
    if (typeof window !== 'undefined') {
      throw new Error('Email sending is only available on server side');
    }

    // Log email details since nodemailer is not installed
    console.log('📧 Email notification (SMTP):', {
      to: options.to,
      subject: options.subject,
      provider: 'SMTP',
      smtp: {
        host: this.config.smtpHost,
        port: this.config.smtpPort
      },
      preview: options.text.slice(0, 100) + '...'
    });

    // In a real implementation, you would install nodemailer:
    // npm install nodemailer @types/nodemailer
    // Then uncomment the code below:
    
    /*
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransporter({
      host: this.config.smtpHost,
      port: this.config.smtpPort,
      secure: this.config.smtpPort === 465,
      auth: {
        user: this.config.smtpUser,
        pass: this.config.smtpPass
      }
    });

    await transporter.sendMail({
      from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
      to: options.to.join(', '),
      subject: options.subject,
      text: options.text,
      html: options.html
    });
    */
  }

  /**
   * Send email using SendGrid
   */
  private async sendWithSendGrid(options: {
    to: string[];
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    if (!this.config.apiKey) {
      console.log('📧 Email notification (SendGrid - no API key):', {
        to: options.to,
        subject: options.subject,
        provider: 'SendGrid'
      });
      return;
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{
            to: options.to.map(email => ({ email }))
          }],
          from: {
            email: this.config.fromEmail,
            name: this.config.fromName
          },
          subject: options.subject,
          content: [
            {
              type: 'text/plain',
              value: options.text
            },
            {
              type: 'text/html',
              value: options.html
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`SendGrid API error: ${response.status}`);
      }

      console.log('📧 Email sent successfully via SendGrid to:', options.to);
    } catch (error) {
      console.error('Failed to send email via SendGrid:', error);
      console.log('📧 Email details that failed to send:', {
        to: options.to,
        subject: options.subject,
        provider: 'SendGrid'
      });
      throw error;
    }
  }

  /**
   * Send email using AWS SES
   */
  private async sendWithSES(options: {
    to: string[];
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    // AWS SES implementation would go here
    // This is a placeholder for SES integration
    throw new Error('AWS SES implementation not yet available');
  }
}

// Factory function to create email service
export function createEmailService(): EmailNotificationService | null {
  if (!process.env.EMAIL_NOTIFICATIONS_ENABLED) {
    return null;
  }

  const config: EmailConfig = {
    provider: (process.env.EMAIL_PROVIDER as any) || 'smtp',
    apiKey: process.env.EMAIL_API_KEY,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: parseInt(process.env.SMTP_PORT || '587'),
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    fromEmail: process.env.FROM_EMAIL || 'noreply@example.com',
    fromName: process.env.FROM_NAME || 'Support System',
    adminEmails: process.env.ADMIN_EMAILS?.split(',') || []
  };

  return new EmailNotificationService(config);
}

export default EmailNotificationService;
