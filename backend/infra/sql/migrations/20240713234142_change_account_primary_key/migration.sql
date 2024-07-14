/*
  Warnings:

  - The primary key for the `Account` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `accountId` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `destinationId` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `originId` on the `Transaction` table. All the data in the column will be lost.
  - Added the required column `account` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_accountId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_destinationId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_originId_fkey";

-- DropIndex
DROP INDEX "Account_company_type_key";

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "account" VARCHAR(70) NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "destinationAccount" VARCHAR(70), ADD COLUMN "originAccount" VARCHAR(70);

UPDATE "Event"
SET "account" = (
    SELECT "company"
    FROM "Account" a
    WHERE a.id = "Event".id
);

UPDATE "Transaction"
SET "destinationAccount" = (
    SELECT "company"
    FROM "Account" a
    WHERE a.id = "Transaction"."destinationId"
), "originAccount" = (
    SELECT "company"
    FROM "Account" a
    WHERE a.id = "Transaction"."originId"
);

WITH Dupes AS (
    SELECT
        *,
        ROW_NUMBER() OVER (PARTITION BY "company" ORDER BY "company") AS row_num
    FROM
        "Account"
)
DELETE FROM "Account" WHERE "id" IN (
    SELECT "id"
    FROM Dupes
    WHERE row_num > 1
);

-- AlterTable
ALTER TABLE "Account" DROP CONSTRAINT "Account_pkey",
DROP COLUMN "id",
DROP COLUMN "type",
ADD CONSTRAINT "Account_pkey" PRIMARY KEY ("company");

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "accountId";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "destinationId", DROP COLUMN "originId";

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_account_fkey" FOREIGN KEY ("account") REFERENCES "Account"("company") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_originAccount_fkey" FOREIGN KEY ("originAccount") REFERENCES "Account"("company") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_destinationAccount_fkey" FOREIGN KEY ("destinationAccount") REFERENCES "Account"("company") ON DELETE CASCADE ON UPDATE CASCADE;
