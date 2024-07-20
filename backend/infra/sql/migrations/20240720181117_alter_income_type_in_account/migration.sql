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
	IF NOT jsonb_matches_schema(
			'{
				"type": "object",
				"properties": {
					"amount": {
						"minimum": 0,
						"type": "number"
					},
					"frequency": {
						"maxLength": 7,
						"type": "string"
					}
				},
				"required": ["amount", "frequency"],
				"additionalProperties": false
			}',
			NEW."income"
		) THEN
			RAISE 'Validation error';
		END IF;

        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER income_validation
BEFORE UPDATE ON "Account"
FOR EACH ROW
EXECUTE FUNCTION account_income_validation();
