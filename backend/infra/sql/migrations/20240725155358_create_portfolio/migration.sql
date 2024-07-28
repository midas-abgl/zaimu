-- CreateTable
CREATE TABLE "Portfolio" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "stocks" JSONB,
    "userEmail" VARCHAR(320) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE FUNCTION portfolio_stocks_validation()
RETURNS TRIGGER AS $$
BEGIN
	IF NOT (
		NEW."stocks" ? 'allocation' AND
		jsonb_typeof(NEW."stocks"->'allocation') = 'number' AND
		(NEW."stocks"->>'allocation')::INTEGER >= 0 AND
		NEW."stocks" ? 'ticker' AND
		jsonb_typeof(NEW."stocks"->'ticker') = 'string' AND
		length(NEW."stocks"->>'ticker' <= 7) -- Max length 7
	) THEN
		RAISE EXCEPTION 'Validation error';
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stocks_validation
BEFORE INSERT OR UPDATE ON "Portfolio"
FOR EACH ROW
EXECUTE FUNCTION portfolio_stocks_validation();

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_userEmail_fkey" FOREIGN KEY ("userEmail") REFERENCES "User"("email") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER portfolio_updated_at
BEFORE UPDATE ON "Portfolio"
FOR EACH ROW EXECUTE FUNCTION updated_at();
