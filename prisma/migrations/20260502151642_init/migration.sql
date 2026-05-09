-- CreateEnum
CREATE TYPE "ScanSourceType" AS ENUM ('image', 'social', 'qr');

-- CreateEnum
CREATE TYPE "StashItemType" AS ENUM ('document', 'link', 'image', 'video');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "displayName" TEXT,
    "schoolLabel" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceType" "ScanSourceType" NOT NULL,
    "sourceUrl" TEXT,
    "assetRef" TEXT,
    "mimeType" TEXT,
    "rawText" TEXT,
    "parsedEventJson" JSONB,
    "qrUrl" TEXT,
    "providerRawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StashItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scanItemId" TEXT,
    "itemType" "StashItemType" NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "detailLabel" TEXT,
    "assetRef" TEXT,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StashItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearnedFact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "factType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearnedFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileInsight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScanItem_userId_createdAt_idx" ON "ScanItem"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StashItem_scanItemId_key" ON "StashItem"("scanItemId");

-- CreateIndex
CREATE INDEX "StashItem_userId_createdAt_idx" ON "StashItem"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LearnedFact_userId_generatedAt_idx" ON "LearnedFact"("userId", "generatedAt");

-- CreateIndex
CREATE INDEX "ProfileInsight_userId_generatedAt_idx" ON "ProfileInsight"("userId", "generatedAt");

-- AddForeignKey
ALTER TABLE "ScanItem" ADD CONSTRAINT "ScanItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StashItem" ADD CONSTRAINT "StashItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StashItem" ADD CONSTRAINT "StashItem_scanItemId_fkey" FOREIGN KEY ("scanItemId") REFERENCES "ScanItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnedFact" ADD CONSTRAINT "LearnedFact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileInsight" ADD CONSTRAINT "ProfileInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
