/*
  Warnings:

  - You are about to drop the column `monthlyIncome` on the `Account` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Account" DROP COLUMN "monthlyIncome",
ADD COLUMN "income" JSONB;

CREATE OR REPLACE FUNCTION account_income_validation()
RETURNS TRIGGER AS $$
BEGIN
	IF NOT (
		NEW."income" ? 'amount' AND
		jsonb_typeof(NEW."income"->'amount') = 'number' AND
		(NEW."income"->>'amount')::FLOAT > 0 AND
		NEW."income" ? 'frequency' AND
		jsonb_typeof(NEW."income"->'frequency') = 'string' AND
		NEW."income"->>'frequency' IN ('weekly', 'monthly')
	) THEN
		RAISE EXCEPTION 'Validation error';
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER income_validation
BEFORE INSERT OR UPDATE ON "Account"
FOR EACH ROW
EXECUTE FUNCTION account_income_validation();
