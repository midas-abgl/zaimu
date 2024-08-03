-- AlterTable
ALTER TABLE "PortfolioTransaction" ALTER COLUMN "totalFees" DROP NOT NULL,
ALTER COLUMN "totalFees" DROP DEFAULT;
