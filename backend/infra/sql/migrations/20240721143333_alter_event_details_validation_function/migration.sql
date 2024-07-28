CREATE OR REPLACE FUNCTION event_details_validation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."type" = 'loan' THEN
        IF NOT (
            NEW."details" ? 'dueDate' AND
            jsonb_typeof(NEW."details"->'dueDate') = 'number' AND
            (NEW."details"->'dueDate')::INTEGER >= 1 AND
            (NEW."details"->'dueDate')::INTEGER <= 31 AND
            NEW."details" ? 'installment' AND
            jsonb_typeof(NEW."details"->'installment') = 'number' AND
            (NEW."details"->'installment')::FLOAT >= 1 AND
            NEW."details" ? 'months' AND
            jsonb_typeof(NEW."details"->'months') = 'number' AND
            (NEW."details"->'months')::INTEGER >= 1
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
