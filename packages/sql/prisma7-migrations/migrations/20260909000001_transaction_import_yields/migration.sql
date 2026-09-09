CREATE TYPE "TransactionImportItemType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER', 'YIELD');

ALTER TABLE "TransactionImportItem"
ALTER COLUMN "type" TYPE "TransactionImportItemType"
USING "type"::text::"TransactionImportItemType";
