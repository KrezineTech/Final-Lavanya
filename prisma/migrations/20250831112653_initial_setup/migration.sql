-- CreateEnum
CREATE TYPE "public"."FileType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "public"."BlogStatus" AS ENUM ('Draft', 'Published', 'Archived');

-- CreateEnum
CREATE TYPE "public"."PageStatus" AS ENUM ('Draft', 'Published');

-- CreateEnum
CREATE TYPE "public"."DynamicPageSection" AS ENUM ('HOME_HERO_SLIDER', 'HOME_VIDEO_SHOWCASE', 'HOME_MEET_ARTIST', 'HOME_CUSTOM_PAINTING_SECTION', 'ABOUT_PAGE_HEADER', 'ABOUT_CONTENT', 'SHARED_REVIEWS_HEADER', 'SHARED_BLOG_HEADER', 'SHARED_FAQ_HEADER', 'SHARED_CONTACT_HEADER');

-- CreateEnum
CREATE TYPE "public"."ReviewStatus" AS ENUM ('Pending', 'Approved', 'Rejected');

-- CreateEnum
CREATE TYPE "public"."MessageStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."MessageFolder" AS ENUM ('INBOX', 'SENT', 'TRASH', 'ARCHIVE', 'SPAM');

-- CreateEnum
CREATE TYPE "public"."AuthorRole" AS ENUM ('CUSTOMER', 'SELLER', 'SUPPORT', 'SYSTEM', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."DiscountStatus" AS ENUM ('Active', 'Scheduled', 'Expired', 'Draft');

-- CreateEnum
CREATE TYPE "public"."DiscountMethod" AS ENUM ('Code', 'Automatic');

-- CreateTable
CREATE TABLE "public"."Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "shortDescription" TEXT,
    "description" JSONB,
    "price" DOUBLE PRECISION,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "compareAtCents" INTEGER,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "sku" TEXT,
    "stock" INTEGER,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "inventoryManaged" BOOLEAN NOT NULL DEFAULT true,
    "weightGrams" INTEGER,
    "heightMm" INTEGER,
    "widthMm" INTEGER,
    "depthMm" INTEGER,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "ratingAverage" DOUBLE PRECISION,
    "numReviews" INTEGER DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "medium" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "style" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "materials" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "techniques" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "salePriceCents" INTEGER,
    "countrySpecificPrices" JSONB,
    "personalization" BOOLEAN NOT NULL DEFAULT false,
    "shippingProfile" TEXT,
    "returnPolicy" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "metadata" JSONB,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CategoryHierarchy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "image" TEXT,
    "description" TEXT,
    "parentId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryHierarchy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "image" TEXT,
    "description" TEXT,
    "categoryId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductCollection" (
    "productId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "sortOrder" INTEGER DEFAULT 0,

    CONSTRAINT "ProductCollection_pkey" PRIMARY KEY ("productId","collectionId")
);

-- CreateTable
CREATE TABLE "public"."Media" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" "public"."FileType" NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "productId" TEXT,
    "categoryId" TEXT,
    "collectionId" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "durationMs" INTEGER,
    "altText" TEXT,
    "title" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "checksum" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blogId" TEXT,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Blog" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "content" JSONB NOT NULL,
    "excerpt" TEXT,
    "author" TEXT NOT NULL,
    "status" "public"."BlogStatus" NOT NULL DEFAULT 'Draft',
    "featuredImage" TEXT,
    "metadata" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Page" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "status" "public"."PageStatus" NOT NULL DEFAULT 'Draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DynamicPage" (
    "id" TEXT NOT NULL,
    "section" "public"."DynamicPageSection" NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "description" TEXT,
    "buttonText" TEXT,
    "desktopImage" TEXT,
    "mobileImage" TEXT,
    "image" TEXT,
    "videoSource" TEXT,
    "paragraph1" TEXT,
    "paragraph2" TEXT,
    "designerImage" TEXT,
    "designerQuote" TEXT,
    "bannerImage" TEXT,
    "interiorImage" TEXT,
    "paragraphTexts" JSONB,
    "metaData" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DynamicPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Review" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerAvatar" TEXT,
    "productId" TEXT NOT NULL,
    "productName" TEXT,
    "productImage" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "public"."ReviewStatus" NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MessageThread" (
    "id" SERIAL NOT NULL,
    "subject" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderEmail" TEXT,
    "senderAvatar" TEXT,
    "isPreviousBuyer" BOOLEAN NOT NULL DEFAULT false,
    "isOrderHelp" BOOLEAN NOT NULL DEFAULT false,
    "folder" "public"."MessageFolder" NOT NULL DEFAULT 'INBOX',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "privateNote" TEXT,
    "mostRecentOrderId" TEXT,
    "totalPurchased" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT,

    CONSTRAINT "MessageThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConversationMessage" (
    "id" SERIAL NOT NULL,
    "threadId" INTEGER NOT NULL,
    "authorRole" "public"."AuthorRole" NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorAvatar" TEXT,
    "content" TEXT NOT NULL,
    "contentHtml" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Attachment" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "uploadedBy" TEXT,
    "conversationMessageId" INTEGER,
    "messageThreadId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuickReply" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "savedCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuickReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Label" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Label_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MessageLabel" (
    "id" SERIAL NOT NULL,
    "threadId" INTEGER NOT NULL,
    "labelId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Discount" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."DiscountStatus" NOT NULL DEFAULT 'Draft',
    "method" "public"."DiscountMethod" NOT NULL DEFAULT 'Code',
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "valueUnit" TEXT,
    "combinations" JSONB,
    "used" INTEGER NOT NULL DEFAULT 0,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "limitTotalUses" INTEGER,
    "limitPerUser" BOOLEAN DEFAULT false,
    "requirements" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "public"."Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "public"."Product"("sku");

-- CreateIndex
CREATE INDEX "Product_slug_idx" ON "public"."Product"("slug");

-- CreateIndex
CREATE INDEX "Product_sku_idx" ON "public"."Product"("sku");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "public"."Product"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryHierarchy_name_key" ON "public"."CategoryHierarchy"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryHierarchy_slug_key" ON "public"."CategoryHierarchy"("slug");

-- CreateIndex
CREATE INDEX "CategoryHierarchy_slug_idx" ON "public"."CategoryHierarchy"("slug");

-- CreateIndex
CREATE INDEX "CategoryHierarchy_name_idx" ON "public"."CategoryHierarchy"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_key" ON "public"."Collection"("slug");

-- CreateIndex
CREATE INDEX "Collection_categoryId_idx" ON "public"."Collection"("categoryId");

-- CreateIndex
CREATE INDEX "Collection_slug_idx" ON "public"."Collection"("slug");

-- CreateIndex
CREATE INDEX "ProductCollection_collectionId_idx" ON "public"."ProductCollection"("collectionId");

-- CreateIndex
CREATE INDEX "ProductCollection_productId_idx" ON "public"."ProductCollection"("productId");

-- CreateIndex
CREATE INDEX "Media_productId_idx" ON "public"."Media"("productId");

-- CreateIndex
CREATE INDEX "Media_categoryId_idx" ON "public"."Media"("categoryId");

-- CreateIndex
CREATE INDEX "Media_collectionId_idx" ON "public"."Media"("collectionId");

-- CreateIndex
CREATE INDEX "Media_isPrimary_idx" ON "public"."Media"("isPrimary");

-- CreateIndex
CREATE INDEX "Media_blogId_idx" ON "public"."Media"("blogId");

-- CreateIndex
CREATE UNIQUE INDEX "Blog_slug_key" ON "public"."Blog"("slug");

-- CreateIndex
CREATE INDEX "Blog_slug_idx" ON "public"."Blog"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Page_slug_key" ON "public"."Page"("slug");

-- CreateIndex
CREATE INDEX "DynamicPage_section_idx" ON "public"."DynamicPage"("section");

-- CreateIndex
CREATE INDEX "DynamicPage_isActive_idx" ON "public"."DynamicPage"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DynamicPage_section_sortOrder_key" ON "public"."DynamicPage"("section", "sortOrder");

-- CreateIndex
CREATE INDEX "Review_productId_idx" ON "public"."Review"("productId");

-- CreateIndex
CREATE INDEX "MessageThread_folder_read_idx" ON "public"."MessageThread"("folder", "read");

-- CreateIndex
CREATE INDEX "MessageThread_senderName_idx" ON "public"."MessageThread"("senderName");

-- CreateIndex
CREATE INDEX "MessageThread_mostRecentOrderId_idx" ON "public"."MessageThread"("mostRecentOrderId");

-- CreateIndex
CREATE INDEX "ConversationMessage_threadId_createdAt_idx" ON "public"."ConversationMessage"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "Attachment_conversationMessageId_idx" ON "public"."Attachment"("conversationMessageId");

-- CreateIndex
CREATE INDEX "Attachment_messageThreadId_idx" ON "public"."Attachment"("messageThreadId");

-- CreateIndex
CREATE INDEX "QuickReply_name_idx" ON "public"."QuickReply"("name");

-- CreateIndex
CREATE INDEX "MessageLabel_labelId_idx" ON "public"."MessageLabel"("labelId");

-- CreateIndex
CREATE INDEX "MessageLabel_threadId_idx" ON "public"."MessageLabel"("threadId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageLabel_threadId_labelId_key" ON "public"."MessageLabel"("threadId", "labelId");

-- CreateIndex
CREATE UNIQUE INDEX "Discount_code_key" ON "public"."Discount"("code");

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."CategoryHierarchy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CategoryHierarchy" ADD CONSTRAINT "CategoryHierarchy_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."CategoryHierarchy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Collection" ADD CONSTRAINT "Collection_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."CategoryHierarchy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductCollection" ADD CONSTRAINT "ProductCollection_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductCollection" ADD CONSTRAINT "ProductCollection_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "public"."Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Media" ADD CONSTRAINT "Media_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Media" ADD CONSTRAINT "Media_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."CategoryHierarchy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Media" ADD CONSTRAINT "Media_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "public"."Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Media" ADD CONSTRAINT "Media_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "public"."Blog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConversationMessage" ADD CONSTRAINT "ConversationMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "public"."MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attachment" ADD CONSTRAINT "Attachment_conversationMessageId_fkey" FOREIGN KEY ("conversationMessageId") REFERENCES "public"."ConversationMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attachment" ADD CONSTRAINT "Attachment_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "public"."MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MessageLabel" ADD CONSTRAINT "MessageLabel_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "public"."MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MessageLabel" ADD CONSTRAINT "MessageLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "public"."Label"("id") ON DELETE CASCADE ON UPDATE CASCADE;
