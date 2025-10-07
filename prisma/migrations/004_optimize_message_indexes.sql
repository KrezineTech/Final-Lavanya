-- Optimize Message System Performance with Additional Indexes
-- This migration adds critical indexes to improve message fetching speed

-- Add indexes for MessageThread table
CREATE INDEX IF NOT EXISTS "MessageThread_senderEmail_deleted_updatedAt_idx" 
  ON "MessageThread"("senderEmail", "deleted", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS "MessageThread_deleted_updatedAt_idx" 
  ON "MessageThread"("deleted", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS "MessageThread_senderEmail_folder_read_idx" 
  ON "MessageThread"("senderEmail", "folder", "read");

-- Recreate ConversationMessage indexes with proper naming
DROP INDEX IF EXISTS "ConversationMessage_threadId_createdAt_idx";

CREATE INDEX IF NOT EXISTS "conversation_thread_created_idx" 
  ON "ConversationMessage"("threadId", "createdAt");

CREATE INDEX IF NOT EXISTS "conversation_thread_created_asc_idx" 
  ON "ConversationMessage"("threadId", "createdAt" ASC);

-- Add comment for documentation
COMMENT ON INDEX "MessageThread_senderEmail_deleted_updatedAt_idx" IS 'Optimizes customer inbox queries';
COMMENT ON INDEX "MessageThread_deleted_updatedAt_idx" IS 'Optimizes admin thread list queries';
COMMENT ON INDEX "conversation_thread_created_idx" IS 'Optimizes message fetching for threads';
COMMENT ON INDEX "conversation_thread_created_asc_idx" IS 'Optimizes chronological message ordering';
