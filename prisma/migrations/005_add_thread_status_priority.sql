-- Add ThreadStatus and MessagePriority enums for MessageThread
-- This migration adds status and priority tracking to message threads

-- Create ThreadStatus enum
CREATE TYPE "ThreadStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- Create MessagePriority enum
CREATE TYPE "MessagePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- Add status column to MessageThread (default OPEN)
ALTER TABLE "MessageThread" 
ADD COLUMN "status" "ThreadStatus" NOT NULL DEFAULT 'OPEN';

-- Add priority column to MessageThread (default MEDIUM)
ALTER TABLE "MessageThread" 
ADD COLUMN "priority" "MessagePriority" NOT NULL DEFAULT 'MEDIUM';

-- Add assignedAdmin column to MessageThread
ALTER TABLE "MessageThread" 
ADD COLUMN "assignedAdmin" TEXT;

-- Create indexes for faster filtering
CREATE INDEX "MessageThread_status_idx" ON "MessageThread"("status");
CREATE INDEX "MessageThread_priority_idx" ON "MessageThread"("priority");

-- Comment for documentation
COMMENT ON COLUMN "MessageThread"."status" IS 'Current status of the thread (OPEN, IN_PROGRESS, RESOLVED, CLOSED)';
COMMENT ON COLUMN "MessageThread"."priority" IS 'Priority level of the thread (LOW, MEDIUM, HIGH, URGENT)';
COMMENT ON COLUMN "MessageThread"."assignedAdmin" IS 'Admin user assigned to handle this thread';
