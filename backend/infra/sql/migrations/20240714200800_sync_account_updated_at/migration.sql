CREATE OR REPLACE FUNCTION update_account(account_id UUID, updated_at TIMESTAMPTZ)
RETURNS VOID AS $$
BEGIN
	UPDATE "Account"
	SET "updatedAt" = updated_at
	WHERE id = account_id;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'Account with id % does not exist', account_id;
	END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_account_event_del()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_account(OLD."accountId", CURRENT_TIMESTAMP);

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_account_event()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_account(NEW."accountId", NEW."updatedAt");

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_account_sync_del
AFTER DELETE ON "Event"
FOR EACH ROW
EXECUTE FUNCTION update_account_event_del();

CREATE TRIGGER event_account_sync_ins
AFTER INSERT ON "Event"
FOR EACH ROW
EXECUTE FUNCTION update_account_event();

CREATE TRIGGER event_account_sync_up
AFTER UPDATE ON "Event"
FOR EACH ROW
EXECUTE FUNCTION update_account_event();

CREATE OR REPLACE FUNCTION update_account_transaction_del()
RETURNS TRIGGER AS $$
BEGIN
	IF OLD."destinationId" IS NOT NULL THEN
    	PERFORM update_account(OLD."destinationId", CURRENT_TIMESTAMP);
	END IF;

	IF OLD."originId" IS NOT NULL THEN
    	PERFORM update_account(OLD."originId", CURRENT_TIMESTAMP);
	END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_account_transaction()
RETURNS TRIGGER AS $$
BEGIN
	IF NEW."destinationId" IS NOT NULL THEN
    	PERFORM update_account(NEW."destinationId", NEW."updatedAt");
	END IF;

	IF NEW."originId" IS NOT NULL THEN
    	PERFORM update_account(NEW."originId", NEW."updatedAt");
	END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transaction_account_sync_del
AFTER DELETE ON "Transaction"
FOR EACH ROW
EXECUTE FUNCTION update_account_transaction_del();

CREATE TRIGGER transaction_account_sync_ins
AFTER INSERT ON "Transaction"
FOR EACH ROW
EXECUTE FUNCTION update_account_transaction();

CREATE TRIGGER transaction_account_sync_up
AFTER UPDATE ON "Transaction"
FOR EACH ROW
EXECUTE FUNCTION update_account_transaction();
