-- CreateTable
CREATE TABLE "LoanPayment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "amount" DECIMAL(8,2) NOT NULL,
    "date" DATE NOT NULL,
    "loanId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanPayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TRIGGER loan_payment_updated_at
BEFORE UPDATE ON "LoanPayment"
FOR EACH ROW EXECUTE FUNCTION updated_at();

CREATE OR REPLACE FUNCTION create_loan_payments()
RETURNS TRIGGER AS $$
DECLARE
    i INTEGER;
    current_due_date DATE;
    amount FLOAT;
    months INTEGER;
BEGIN
	IF NEW."type" != 'loan' THEN
		RETURN NEW;
    END IF;

    current_due_date := make_date(
		EXTRACT(YEAR FROM NEW."date")::INTEGER,
		EXTRACT(MONTH FROM NEW."date")::INTEGER,
		(NEW."details"->'dueDate')::INTEGER
	);
    amount := (NEW."details"->'installment')::FLOAT;
    months := (NEW."details"->'months')::INTEGER;

    FOR i IN 1..months LOOP
        current_due_date := current_due_date + INTERVAL '1 month';

        INSERT INTO "LoanPayment" ("amount", "date", "loanId")
        VALUES (amount, current_due_date, NEW."id");
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_create_loan_payments
AFTER INSERT ON "Event"
FOR EACH ROW
EXECUTE FUNCTION create_loan_payments();
