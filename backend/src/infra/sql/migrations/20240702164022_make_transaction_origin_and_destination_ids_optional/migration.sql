-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "originId" DROP NOT NULL,
ALTER COLUMN "destinationId" DROP NOT NULL,
ADD CONSTRAINT "chk_Transaction_origin_destination" CHECK ("originId" IS NOT NULL OR "destinationId" IS NOT NULL);
