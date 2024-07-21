CREATE OR REPLACE FUNCTION event_details_validation()
RETURNS TRIGGER AS $$
BEGIN
	IF NEW."type" = 'loan' THEN
		IF NOT jsonb_matches_schema(
			'{
				"type": "object",
				"properties": {
					"dueDate": {
						"minValue": 1,
						"maxValue": 31,
						"type": "integer"
					},
					"installment": {
						"type": "number"
					},
					"months": {
						"minValue": 1,
						"type": "integer"
					},
				},
				"required": ["dueDate", "installment", "months"],
				"additionalProperties": false
			}',
			NEW."details"
		) THEN
			RAISE 'Validation error';
		END IF;

        RETURN NEW;
	ELSIF NEW."type" = 'statement' THEN
		IF NOT jsonb_matches_schema(
			'{
				"type": "object",
				"properties": {
					"dueDate": {
						"format": "date",
						"type": "string"
					}
				},
				"required": ["dueDate"],
				"additionalProperties": false
			}',
			NEW."details"
		) THEN
			RAISE 'Validation error';
		END IF;

        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;
