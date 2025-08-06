-- AlterTable
ALTER TABLE "PortfolioTransaction" ADD COLUMN     "brokerId" UUID;

-- CreateTable
CREATE TABLE "Broker" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Broker_pkey" PRIMARY KEY ("id")
);

CREATE TRIGGER broker_updated_at
BEFORE UPDATE ON "Broker"
FOR EACH ROW EXECUTE FUNCTION updated_at();

-- AddForeignKey
ALTER TABLE "PortfolioTransaction" ADD CONSTRAINT "PortfolioTransaction_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE SET NULL ON UPDATE CASCADE;
