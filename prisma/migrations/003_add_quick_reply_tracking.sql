-- Add quick reply tracking to conversation messages
-- This allows tracking which messages were sent using quick reply templates

-- Add quickReplyId column to ConversationMessage table
ALTER TABLE "ConversationMessage" 
ADD COLUMN IF NOT EXISTS "quickReplyId" INTEGER;

-- Create foreign key constraint to QuickReply table
ALTER TABLE "ConversationMessage" 
ADD CONSTRAINT "ConversationMessage_quickReplyId_fkey" 
FOREIGN KEY ("quickReplyId") 
REFERENCES "QuickReply"("id") 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS "ConversationMessage_quickReplyId_idx" 
ON "ConversationMessage"("quickReplyId");

-- Add comment to explain the column
COMMENT ON COLUMN "ConversationMessage"."quickReplyId" IS 'Reference to QuickReply if this message was sent using a quick reply template';
