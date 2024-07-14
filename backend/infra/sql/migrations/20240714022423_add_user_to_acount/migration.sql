/*
  Warnings:

  - The primary key for the `Account` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `account` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `destination` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `origin` on the `Transaction` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userEmail,company]` on the table `Account` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userEmail` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountId` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_account_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_destination_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_origin_fkey";

-- AlterTable
ALTER TABLE "Account" DROP CONSTRAINT "Account_pkey",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN     "userEmail" VARCHAR(320) NOT NULL DEFAULT 'temporary@example.com',
ADD CONSTRAINT "Account_pkey" PRIMARY KEY ("id");

UPDATE "Account"
SET "userEmail" = (SELECT "email" FROM "User" LIMIT 1);

ALTER TABLE "Account"
ALTER COLUMN "userEmail" SET DEFAULT NULL;

ALTER TABLE "Event" ADD COLUMN "accountId" UUID NOT NULL;

UPDATE "Event"
SET "accountId" = (
    SELECT a.id
    FROM "Account" a
	WHERE a.company = "Event"."account"
);

ALTER TABLE "Event" DROP COLUMN "account";


ALTER TABLE "Transaction" ADD COLUMN "destinationId" UUID, ADD COLUMN "originId" UUID;

UPDATE "Transaction"
SET "destinationId" = (
    SELECT a.id
    FROM "Account" a
    WHERE a.company = "Transaction"."destination"
), "originId" = (
    SELECT a.id
    FROM "Account" a
    WHERE a.company = "Transaction"."origin"
);

ALTER TABLE "Transaction" DROP COLUMN "destination", DROP COLUMN "origin";

-- CreateIndex
CREATE UNIQUE INDEX "Account_userEmail_company_key" ON "Account"("userEmail", "company");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userEmail_fkey" FOREIGN KEY ("userEmail") REFERENCES "User"("email") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_originId_fkey" FOREIGN KEY ("originId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
