-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "creditCard" JSONB,
ADD COLUMN     "creditLine" INTEGER;

CREATE OR REPLACE FUNCTION account_credit_card_validation()
RETURNS TRIGGER AS $$
BEGIN
	IF NOT (
		NEW."creditCard" ? 'limit' AND
		jsonb_typeof(NEW."creditCard"->'limit') = 'number' AND
		(NEW."creditCard"->>'limit')::INTEGER > 0 AND
		NEW."creditCard" ? 'statementDate' AND
		jsonb_typeof(NEW."creditCard"->'statementDate') = 'number' AND
		(NEW."creditCard"->>'statementDate')::INTEGER >= 1 AND
		(NEW."creditCard"->>'statementDate')::INTEGER <= 31
	) THEN
		RAISE EXCEPTION 'Validation error';
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER credit_card_validation
BEFORE INSERT OR UPDATE ON "Account"
FOR EACH ROW
EXECUTE FUNCTION account_credit_card_validation();
