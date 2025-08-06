-- AlterTable
ALTER TABLE "PortfolioTransaction" ALTER COLUMN "date" SET DEFAULT CURRENT_TIMESTAMP;

-- AddForeignKey
ALTER TABLE "PortfolioStock" ADD CONSTRAINT "PortfolioStock_ticker_fkey" FOREIGN KEY ("ticker") REFERENCES "Stock"("ticker") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioTransaction" ADD CONSTRAINT "PortfolioTransaction_ticker_fkey" FOREIGN KEY ("ticker") REFERENCES "Stock"("ticker") ON DELETE RESTRICT ON UPDATE CASCADE;
