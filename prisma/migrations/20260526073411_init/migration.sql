-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT,
    "schoolLabel" TEXT,
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ScanItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "assetRef" TEXT,
    "mimeType" TEXT,
    "rawText" TEXT,
    "parsedEventJson" JSONB,
    "qrUrl" TEXT,
    "providerRawJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScanItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StashItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "scanItemId" TEXT,
    "itemType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "detailLabel" TEXT,
    "assetRef" TEXT,
    "sourceUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StashItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StashItem_scanItemId_fkey" FOREIGN KEY ("scanItemId") REFERENCES "ScanItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LearnedFact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "factType" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LearnedFact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProfileInsight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProfileInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PostedFlyer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventDate" TEXT,
    "price" TEXT,
    "imageUrl" TEXT,
    "color" TEXT NOT NULL DEFAULT '#1a1230',
    "accent" TEXT NOT NULL DEFAULT '#9b72cf',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostedFlyer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FlyerEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flyerId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FlyerEvent_flyerId_fkey" FOREIGN KEY ("flyerId") REFERENCES "PostedFlyer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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

-- CreateIndex
CREATE INDEX "PostedFlyer_createdAt_idx" ON "PostedFlyer"("createdAt");

-- CreateIndex
CREATE INDEX "PostedFlyer_userId_idx" ON "PostedFlyer"("userId");

-- CreateIndex
CREATE INDEX "FlyerEvent_flyerId_action_createdAt_idx" ON "FlyerEvent"("flyerId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "FlyerEvent_flyerId_createdAt_idx" ON "FlyerEvent"("flyerId", "createdAt");
