ALTER TABLE "Portfolio" DROP COLUMN "stocks";
DROP TRIGGER stocks_validation ON "Portfolio";
DROP FUNCTION portfolio_stocks_validation;

-- CreateTable
CREATE TABLE "PortfolioStock" (
    "portfolioId" UUID NOT NULL,
    "ticker" VARCHAR(7) NOT NULL,
    "allocation" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioStock_pkey" PRIMARY KEY ("portfolioId","ticker")
);

CREATE TRIGGER portfolio_stock_updated_at
BEFORE UPDATE ON "PortfolioStock"
FOR EACH ROW EXECUTE FUNCTION updated_at();

-- CreateTable
CREATE TABLE "Stock" (
    "ticker" VARCHAR(7) NOT NULL,
    "pastTickers" VARCHAR(7)[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("ticker")
);

CREATE TRIGGER stock_updated_at
BEFORE UPDATE ON "Stock"
FOR EACH ROW EXECUTE FUNCTION updated_at();

-- AddForeignKey
ALTER TABLE "PortfolioStock" ADD CONSTRAINT "PortfolioStock_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
