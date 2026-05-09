-- CreateTable
CREATE TABLE "PostedFlyer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventDate" TEXT,
    "price" TEXT,
    "imageUrl" TEXT,
    "color" TEXT NOT NULL DEFAULT '#1a1230',
    "accent" TEXT NOT NULL DEFAULT '#9b72cf',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostedFlyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlyerEvent" (
    "id" TEXT NOT NULL,
    "flyerId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlyerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostedFlyer_createdAt_idx" ON "PostedFlyer"("createdAt");

-- CreateIndex
CREATE INDEX "PostedFlyer_userId_idx" ON "PostedFlyer"("userId");

-- CreateIndex
CREATE INDEX "FlyerEvent_flyerId_action_createdAt_idx" ON "FlyerEvent"("flyerId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "FlyerEvent_flyerId_createdAt_idx" ON "FlyerEvent"("flyerId", "createdAt");

-- AddForeignKey
ALTER TABLE "PostedFlyer" ADD CONSTRAINT "PostedFlyer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlyerEvent" ADD CONSTRAINT "FlyerEvent_flyerId_fkey" FOREIGN KEY ("flyerId") REFERENCES "PostedFlyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
