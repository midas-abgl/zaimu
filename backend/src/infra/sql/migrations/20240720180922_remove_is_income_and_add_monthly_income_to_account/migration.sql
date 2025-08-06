/*
  Warnings:

  - You are about to drop the column `isIncome` on the `Account` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Account" DROP COLUMN "isIncome",
ADD COLUMN     "monthlyIncome" SMALLINT;
