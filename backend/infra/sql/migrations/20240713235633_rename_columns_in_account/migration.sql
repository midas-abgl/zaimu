/*
  Warnings:

  - You are about to drop the column `destinationAccount` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `originAccount` on the `Transaction` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_destinationAccount_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_originAccount_fkey";

ALTER TABLE "Transaction" ADD COLUMN "destination" VARCHAR(70), ADD COLUMN "origin" VARCHAR(70);

UPDATE "Transaction"
SET "destination" = "destinationAccount",
"origin" = "originAccount";

ALTER TABLE "Transaction" DROP COLUMN "destinationAccount", DROP COLUMN "originAccount";

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_origin_fkey" FOREIGN KEY ("origin") REFERENCES "Account"("company") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_destination_fkey" FOREIGN KEY ("destination") REFERENCES "Account"("company") ON DELETE CASCADE ON UPDATE CASCADE;
