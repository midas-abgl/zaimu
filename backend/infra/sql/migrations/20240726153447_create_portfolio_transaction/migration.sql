-- CreateTable
CREATE TABLE "PortfolioTransaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticker" VARCHAR(7) NOT NULL,
    "price" DECIMAL(6,2) NOT NULL,
    "quantity" SMALLINT NOT NULL,
    "totalFees" DECIMAL(7,2) NOT NULL,
    "date" DATE NOT NULL,
    "portfolioId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioTransaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PortfolioTransaction" ADD CONSTRAINT "PortfolioTransaction_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TRIGGER portfolio_transaction_updated_at
BEFORE UPDATE ON "PortfolioTransaction"
FOR EACH ROW EXECUTE FUNCTION updated_at();
