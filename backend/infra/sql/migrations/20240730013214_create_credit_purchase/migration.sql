/*
  Warnings:

  - A unique constraint covering the columns `[accountId,statementDate]` on the table `CreditCardStatement` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "CreditPurchase" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "description" VARCHAR(1000),
    "value" DECIMAL(7,2) NOT NULL,
	"date" DATE,
    "categories" VARCHAR(50)[],
    "statementId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditPurchase_pkey" PRIMARY KEY ("id")
);

CREATE TRIGGER credit_purchase_updated_at
BEFORE UPDATE ON "CreditPurchase"
FOR EACH ROW EXECUTE FUNCTION updated_at();

-- CreateIndex
CREATE UNIQUE INDEX "CreditCardStatement_accountId_statementDate_key" ON "CreditCardStatement"("accountId", "statementDate");

-- AddForeignKey
ALTER TABLE "CreditPurchase" ADD CONSTRAINT "CreditPurchase_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "CreditCardStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreditCardStatement" DROP COLUMN "amount";
