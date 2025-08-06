CREATE TABLE "CreditCardStatement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "description" VARCHAR(1000),
    "accountId" UUID NOT NULL,
    "amount" DECIMAL(8,2) NOT NULL,
    "statementDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditCardStatement_pkey" PRIMARY KEY ("id")
);

CREATE TRIGGER credit_card_statement_updated_at
BEFORE UPDATE ON "CreditCardStatement"
FOR EACH ROW EXECUTE FUNCTION updated_at();

CREATE TABLE "Loan" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "accountId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(8,2) NOT NULL,
    "installment" DECIMAL(8,2) NOT NULL,
    "months" SMALLINT NOT NULL,
    "dueDate" SMALLINT NOT NULL,
    "description" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id"),
	CONSTRAINT "dueDate_chk" CHECK ("dueDate" >= 1 AND "dueDate" <= 31),
	CONSTRAINT "installment_chk" CHECK ("installment" >= 1),
	CONSTRAINT "months_chk" CHECK ("months" >= 1)
);

CREATE TRIGGER loan_updated_at
BEFORE UPDATE ON "Loan"
FOR EACH ROW EXECUTE FUNCTION updated_at();

INSERT INTO "CreditCardStatement" ("id", "description", "accountId", "amount", "statementDate", "dueDate", "createdAt", "updatedAt")
SELECT
    "id",
    "description",
    "accountId",
    "amount",
    "date"::DATE,
    ("details"->>'dueDate')::DATE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Event"
WHERE "type" = 'statement';

INSERT INTO "Loan" ("id", "accountId", "date", "amount", "installment", "months", "dueDate", "description", "createdAt", "updatedAt")
SELECT
    "id",
    "accountId",
    "date"::DATE,
    "amount",
    ("details"->>'installment')::DECIMAL(8,2),
    ("details"->>'months')::SMALLINT,
    ("details"->>'dueDate')::SMALLINT,
    "description",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Event"
WHERE "type" = 'loan';

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_accountId_fkey";

-- DropForeignKey
ALTER TABLE "LoanPayment" DROP CONSTRAINT "LoanPayment_loanId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_eventId_fkey";

-- DropTable
DROP TABLE "Event";

DROP FUNCTION event_details_validation;

CREATE OR REPLACE FUNCTION create_loan_payments()
RETURNS TRIGGER AS $$
DECLARE
    i INTEGER;
    current_due_date DATE;
BEGIN
    current_due_date := make_date(
		EXTRACT(YEAR FROM NEW."date")::INTEGER,
		EXTRACT(MONTH FROM NEW."date")::INTEGER,
		(NEW."dueDate")::INTEGER
	);

    FOR i IN 1..NEW."months" LOOP
        current_due_date := current_due_date + INTERVAL '1 month';

        INSERT INTO "LoanPayment" ("amount", "date", "loanId")
        VALUES (NEW."installment", current_due_date, NEW."id");
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_loan_payments
AFTER INSERT ON "Loan"
FOR EACH ROW
EXECUTE FUNCTION create_loan_payments();

-- AddForeignKey
ALTER TABLE "CreditCardStatement" ADD CONSTRAINT "CreditCardStatement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CreditCardStatement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
