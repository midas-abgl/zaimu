CREATE OR REPLACE FUNCTION account_credit_card_validation()
RETURNS TRIGGER AS $$
BEGIN
	IF NOT (NEW."creditCard" ? 'workingDueDate') THEN
		NEW."creditCard" = jsonb_set(NEW."creditCard", '{workingDueDate}', 'false');
	END IF;

	IF NOT (
		NEW."creditCard" ? 'limit' AND
		jsonb_typeof(NEW."creditCard"->'limit') = 'number' AND
		(NEW."creditCard"->>'limit')::INTEGER > 0 AND
		NEW."creditCard" ? 'statementDate' AND
		jsonb_typeof(NEW."creditCard"->'statementDate') = 'number' AND
		(NEW."creditCard"->>'statementDate')::INTEGER >= 1 AND
		(NEW."creditCard"->>'statementDate')::INTEGER <= 31 AND
		NEW."creditCard" ? 'workingDueDate' AND
		jsonb_typeof(NEW."creditCard"->'workingDueDate') = 'boolean'
	) THEN
		RAISE EXCEPTION 'Validation error';
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

UPDATE "Account"
SET "creditCard" = jsonb_set("creditCard", '{workingDueDate}', 'false')
WHERE NOT ("creditCard" ? 'workingDueDate');
