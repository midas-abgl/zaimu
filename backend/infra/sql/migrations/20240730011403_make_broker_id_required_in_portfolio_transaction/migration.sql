/*
  Warnings:

  - Made the column `brokerId` on table `PortfolioTransaction` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "PortfolioTransaction" DROP CONSTRAINT "PortfolioTransaction_brokerId_fkey";

-- AlterTable
ALTER TABLE "PortfolioTransaction" ALTER COLUMN "brokerId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "PortfolioTransaction" ADD CONSTRAINT "PortfolioTransaction_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
