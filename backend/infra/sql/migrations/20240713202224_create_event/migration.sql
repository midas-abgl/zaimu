-- CreateTable
CREATE TABLE "Event" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(8,2) NOT NULL,
    "date" TIMESTAMPTZ NOT NULL,
    "description" VARCHAR(1000),
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id"),
	CONSTRAINT "Event_type_check" CHECK ("type" IN ('loan', 'statement'))
);

CREATE TRIGGER event_updated_at BEFORE
UPDATE
	ON "Event" FOR EACH ROW EXECUTE FUNCTION updated_at();
