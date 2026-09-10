ALTER TABLE "DebtSplit" ADD COLUMN "transactionImportItemId" VARCHAR(36);

CREATE UNIQUE INDEX "DebtSplit_transactionImportItemId_key" ON "DebtSplit"("transactionImportItemId");

ALTER TABLE "DebtSplit"
ADD CONSTRAINT "DebtSplit_transactionImportItemId_fkey"
FOREIGN KEY ("transactionImportItemId") REFERENCES "TransactionImportItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
