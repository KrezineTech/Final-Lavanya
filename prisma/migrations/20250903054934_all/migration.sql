/*
  Warnings:

  - Made the column `slug` on table `Product` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "public"."ContactStatus" AS ENUM ('NEW', 'READ', 'RESOLVED');

-- CreateEnum
CREATE TYPE "public"."ContactCategory" AS ENUM ('GENERAL', 'SUPPORT', 'SALES', 'COMMISSION', 'FEEDBACK', 'ORDER_INQUIRY');

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "isVideoIntegratedVisible" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "slug" SET NOT NULL;

-- CreateTable
CREATE TABLE "public"."Faq" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContactMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" "public"."ContactCategory" NOT NULL DEFAULT 'GENERAL',
    "status" "public"."ContactStatus" NOT NULL DEFAULT 'NEW',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "adminNotes" TEXT,
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Faq_title_key" ON "public"."Faq"("title");

-- CreateIndex
CREATE INDEX "Faq_title_idx" ON "public"."Faq"("title");

-- CreateIndex
CREATE INDEX "Faq_isVisible_idx" ON "public"."Faq"("isVisible");

-- CreateIndex
CREATE INDEX "Faq_title_sortOrder_idx" ON "public"."Faq"("title", "sortOrder");

-- CreateIndex
CREATE INDEX "ContactMessage_status_idx" ON "public"."ContactMessage"("status");

-- CreateIndex
CREATE INDEX "ContactMessage_category_idx" ON "public"."ContactMessage"("category");

-- CreateIndex
CREATE INDEX "ContactMessage_email_idx" ON "public"."ContactMessage"("email");

-- CreateIndex
CREATE INDEX "ContactMessage_createdAt_idx" ON "public"."ContactMessage"("createdAt");
