-- AlterTable
ALTER TABLE "public"."Portfolio" ADD COLUMN     "description" TEXT,
ADD COLUMN     "strategy" TEXT,
ALTER COLUMN "name" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."PortfolioStockGroup" ADD COLUMN     "description" TEXT,
ADD COLUMN     "strategy" TEXT;
