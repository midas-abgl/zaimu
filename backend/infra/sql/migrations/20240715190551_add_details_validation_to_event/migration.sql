CREATE EXTENSION pg_jsonschema;

CREATE OR REPLACE FUNCTION event_details_validation()
RETURNS TRIGGER AS $$
BEGIN
	IF NEW."type" = 'loan' THEN
		IF NOT jsonb_matches_schema(
			'{
				"type": "object",
				"properties": {
					"fee": {
						"type": "number"
					},
					"interestRate": {
						"type": "number"
					},
					"months": {
						"type": "integer"
					},
				},
				"required": ["interestRate", "months"],
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
						"format": "date-time",
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

CREATE TRIGGER details_validation
BEFORE UPDATE ON "Event"
FOR EACH ROW
EXECUTE FUNCTION event_details_validation();
