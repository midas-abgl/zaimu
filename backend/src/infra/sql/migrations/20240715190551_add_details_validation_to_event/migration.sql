CREATE OR REPLACE FUNCTION event_details_validation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."type" = 'loan' THEN
        IF NOT (
            NEW."details" ? 'dueDate' AND
            jsonb_typeof(NEW."details"->'dueDate') = 'string' AND
            NEW."details"->>'dueDate' ~ '^\d{4}-\d{2}-\d{2}$' AND
            NEW."details" ? 'interestRate' AND
            jsonb_typeof(NEW."details"->'interestRate') = 'number' AND
            (NEW."details"->'interestRate')::FLOAT >= 0 AND
            NEW."details" ? 'months' AND
            jsonb_typeof(NEW."details"->'months') = 'number'
        ) THEN
            RAISE EXCEPTION 'Validation error';
        END IF;

        RETURN NEW;
    ELSIF NEW."type" = 'statement' THEN
        IF NOT (
            NEW."details" ? 'dueDate' AND
            jsonb_typeof(NEW."details"->'dueDate') = 'string' AND
            NEW."details"->>'dueDate' ~ '^\d{4}-\d{2}-\d{2}$'
        ) THEN
            RAISE EXCEPTION 'Validation error';
        END IF;

        RETURN NEW;
    END IF;

	RAISE 'Invalid event type';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER details_validation
BEFORE INSERT OR UPDATE ON "Event"
FOR EACH ROW
EXECUTE FUNCTION event_details_validation();
