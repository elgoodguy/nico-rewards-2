-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopifyCustomerId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" REAL NOT NULL DEFAULT 0,
    "membershipTier" TEXT NOT NULL DEFAULT 'BRONZE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MembershipTier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "cashbackRate" REAL NOT NULL,
    "minSpent" REAL NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#808080',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PointTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "orderId" TEXT,
    "amount" REAL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PointTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RedemptionOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pointsCost" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Redemption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "pointsSpent" INTEGER NOT NULL,
    "discountCode" TEXT,
    "orderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME,
    CONSTRAINT "Redemption_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Redemption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "RedemptionOption" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "welcomeBonus" INTEGER NOT NULL DEFAULT 100,
    "referralBonus" INTEGER NOT NULL DEFAULT 200,
    "widgetColor" TEXT NOT NULL DEFAULT '#000000',
    "widgetPosition" TEXT NOT NULL DEFAULT 'bottom-right',
    "tierEvaluationDays" INTEGER NOT NULL DEFAULT 365,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_shopifyCustomerId_key" ON "Customer"("shopifyCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_shopifyCustomerId_shop_key" ON "Customer"("shopifyCustomerId", "shop");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipTier_name_shop_key" ON "MembershipTier"("name", "shop");

-- CreateIndex
CREATE INDEX "PointTransaction_customerId_idx" ON "PointTransaction"("customerId");

-- CreateIndex
CREATE INDEX "PointTransaction_shop_idx" ON "PointTransaction"("shop");

-- CreateIndex
CREATE INDEX "RedemptionOption_shop_idx" ON "RedemptionOption"("shop");

-- CreateIndex
CREATE INDEX "Redemption_customerId_idx" ON "Redemption"("customerId");

-- CreateIndex
CREATE INDEX "Redemption_shop_idx" ON "Redemption"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "AppConfig_shop_key" ON "AppConfig"("shop");
