ALTER TABLE "Transaction" ADD COLUMN "externalId" VARCHAR(200);
CREATE INDEX "Transaction_externalId_idx" ON "Transaction"("externalId");

CREATE TYPE "TransactionImportProvider" AS ENUM ('MERCADO_PAGO');
CREATE TYPE "TransactionImportStatus" AS ENUM ('PENDING', 'APPROVED');

CREATE TABLE "TransactionImport" (
    "id" VARCHAR(36) NOT NULL DEFAULT cuid2(),
    "userId" VARCHAR(36) NOT NULL,
    "financialAccountId" VARCHAR(36) NOT NULL,
    "provider" "TransactionImportProvider" NOT NULL,
    "status" "TransactionImportStatus" NOT NULL DEFAULT 'PENDING',
    "fileName" VARCHAR(255) NOT NULL,
    "periodStart" DATE,
    "periodEnd" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransactionImport_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TransactionImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TransactionImport_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "TransactionImport_userId_status_createdAt_idx" ON "TransactionImport"("userId", "status", "createdAt");
CREATE INDEX "TransactionImport_financialAccountId_idx" ON "TransactionImport"("financialAccountId");

CREATE TABLE "TransactionImportItem" (
    "id" VARCHAR(36) NOT NULL DEFAULT cuid2(),
    "transactionImportId" VARCHAR(36) NOT NULL,
    "externalId" VARCHAR(200),
    "amount" DECIMAL(12,2) NOT NULL,
    "date" DATE NOT NULL,
    "time" TIME(3),
    "description" VARCHAR(1000),
    "storeName" VARCHAR(200),
    "type" "TransactionType" NOT NULL,
    "categoryId" VARCHAR(36),
    "originFinancialAccountId" VARCHAR(36),
    "destinationFinancialAccountId" VARCHAR(36),
    "isHidden" BOOLEAN NOT NULL DEFAULT FALSE,
    "isSelected" BOOLEAN NOT NULL DEFAULT TRUE,
    "balanceAfter" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransactionImportItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TransactionImportItem_importId_fkey" FOREIGN KEY ("transactionImportId") REFERENCES "TransactionImport"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TransactionImportItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TransactionImportItem_originId_fkey" FOREIGN KEY ("originFinancialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TransactionImportItem_destinationId_fkey" FOREIGN KEY ("destinationFinancialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "TransactionImportItem_importId_date_idx" ON "TransactionImportItem"("transactionImportId", "date");
CREATE INDEX "TransactionImportItem_externalId_idx" ON "TransactionImportItem"("externalId");
CREATE INDEX "TransactionImportItem_originId_idx" ON "TransactionImportItem"("originFinancialAccountId");
CREATE INDEX "TransactionImportItem_destinationId_idx" ON "TransactionImportItem"("destinationFinancialAccountId");
