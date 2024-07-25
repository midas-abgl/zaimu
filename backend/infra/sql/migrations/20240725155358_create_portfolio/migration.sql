-- CreateTable
CREATE TABLE "Portfolio" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "stocks" JSONB,
    "userEmail" VARCHAR(320) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id"),
	CONSTRAINT "stocks_validation" CHECK (
        jsonb_matches_schema(
			'{
				"type": "array",
				"items": {
					"type": "object",
					"properties": {
						"allocation": {
							"type": "number"
						},
						"ticker": {
							"type": "string"
						}
					},
					"required": ["allocation", "ticker"],
					"additionalProperties": false
				}
			}',
            "stocks"
        )
	)
);

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_userEmail_fkey" FOREIGN KEY ("userEmail") REFERENCES "User"("email") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER portfolio_updated_at
BEFORE UPDATE ON "Portfolio"
FOR EACH ROW EXECUTE FUNCTION updated_at();
