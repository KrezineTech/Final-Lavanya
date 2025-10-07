-- Enhanced Messaging System Indexes for Performance
-- This migration adds optimized indexes for the existing messaging schema

-- Create indexes for efficient inbox queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_thread_folder_updated_read 
ON "MessageThread" (folder, "updatedAt" DESC, read) 
WHERE deleted = false;

-- Partial index for unread messages only (faster inbox queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_thread_unread_updated 
ON "MessageThread" ("updatedAt" DESC) 
WHERE read = false AND deleted = false AND folder = 'INBOX';

-- Index for full-text search on subject and sender
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_thread_search_text 
ON "MessageThread" USING gin(to_tsvector('english', subject || ' ' || "senderName"));

-- Index for conversation messages by thread and time
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_message_thread_created 
ON "ConversationMessage" ("threadId", "createdAt" DESC);

-- Index for admin filtering by sender email domain
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_thread_sender_email_domain 
ON "MessageThread" ((split_part("senderEmail", '@', 2))) 
WHERE "senderEmail" IS NOT NULL;

-- Index for order help requests
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_thread_order_help 
ON "MessageThread" ("isOrderHelp", "updatedAt" DESC) 
WHERE deleted = false;

-- Index for previous buyer messages
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_thread_previous_buyer 
ON "MessageThread" ("isPreviousBuyer", "updatedAt" DESC) 
WHERE deleted = false;

-- Add tenant isolation support (for future multi-tenancy)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_thread_tenant_folder 
ON "MessageThread" ("tenantId", folder, "updatedAt" DESC) 
WHERE deleted = false AND "tenantId" IS NOT NULL;

-- Index for quick reply usage analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quick_reply_usage 
ON "QuickReply" ("savedCount" DESC, "updatedAt" DESC);

-- Index for message attachments lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attachment_message_thread 
ON "Attachment" ("messageThreadId") 
WHERE "messageThreadId" IS NOT NULL;

-- Add constraint to ensure at least one contact method
ALTER TABLE "MessageThread" 
ADD CONSTRAINT check_contact_info 
CHECK ("senderEmail" IS NOT NULL OR "senderName" IS NOT NULL);

-- Add constraint for valid folder types
ALTER TABLE "MessageThread" 
ADD CONSTRAINT check_valid_folder 
CHECK (folder IN ('INBOX', 'SENT', 'TRASH', 'ARCHIVE', 'SPAM'));

-- Performance hint: Add statistics for better query planning
ANALYZE "MessageThread";
ANALYZE "ConversationMessage";
ANALYZE "Attachment";