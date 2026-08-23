-- Preserve every existing relation while allowing both legacy UUIDs and new CUID2 ids.
CREATE TEMP TABLE "_zaimu_foreign_keys" AS
SELECT
    conrelid::regclass::text AS table_name,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'f' AND connamespace = 'public'::regnamespace;

DO $$
DECLARE foreign_key RECORD;
BEGIN
    FOR foreign_key IN SELECT * FROM "_zaimu_foreign_keys" LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', foreign_key.table_name, foreign_key.constraint_name);
    END LOOP;
END $$;

DO $$
DECLARE id_column RECORD;
BEGIN
    FOR id_column IN
        SELECT table_schema, table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND data_type = 'uuid'
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ALTER COLUMN %I DROP DEFAULT',
            id_column.table_schema,
            id_column.table_name,
            id_column.column_name
        );
        EXECUTE format(
            'ALTER TABLE %I.%I ALTER COLUMN %I TYPE VARCHAR(36) USING %I::text',
            id_column.table_schema,
            id_column.table_name,
            id_column.column_name,
            id_column.column_name
        );
    END LOOP;
END $$;

DO $$
DECLARE id_column RECORD;
BEGIN
    FOR id_column IN
        SELECT table_schema, table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND character_maximum_length = 24
          AND (column_name = 'id' OR column_name LIKE '%Id')
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ALTER COLUMN %I TYPE VARCHAR(36)',
            id_column.table_schema,
            id_column.table_name,
            id_column.column_name
        );
    END LOOP;
END $$;

DO $$
DECLARE primary_id RECORD;
BEGIN
    FOR primary_id IN
        SELECT namespace.nspname AS table_schema, relation.relname AS table_name, attribute.attname AS column_name
        FROM pg_constraint constraint_definition
        JOIN pg_class relation ON relation.oid = constraint_definition.conrelid
        JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
        JOIN pg_attribute attribute
          ON attribute.attrelid = relation.oid
         AND attribute.attnum = ANY(constraint_definition.conkey)
        WHERE constraint_definition.contype = 'p'
          AND namespace.nspname = 'public'
          AND attribute.attname = 'id'
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ALTER COLUMN %I SET DEFAULT cuid2()',
            primary_id.table_schema,
            primary_id.table_name,
            primary_id.column_name
        );
    END LOOP;
END $$;

DO $$
DECLARE foreign_key RECORD;
BEGIN
    FOR foreign_key IN SELECT * FROM "_zaimu_foreign_keys" LOOP
        EXECUTE format(
            'ALTER TABLE %s ADD CONSTRAINT %I %s',
            foreign_key.table_name,
            foreign_key.constraint_name,
            foreign_key.definition
        );
    END LOOP;
END $$;

DROP TABLE "_zaimu_foreign_keys";

ALTER TYPE "AccountType" RENAME TO "FinancialAccountType";
ALTER TABLE "Account" RENAME TO "FinancialAccount";
ALTER TABLE "CreditCard" RENAME COLUMN "accountId" TO "financialAccountId";
ALTER TABLE "LoanPayment" RENAME COLUMN "accountId" TO "financialAccountId";
ALTER TABLE "SalaryPayment" RENAME COLUMN "accountId" TO "financialAccountId";
ALTER TABLE "Transaction" RENAME COLUMN "originId" TO "originFinancialAccountId";
ALTER TABLE "Transaction" RENAME COLUMN "destinationId" TO "destinationFinancialAccountId";

ALTER TABLE "User" RENAME TO "user";
ALTER TABLE "user" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE "user" ADD COLUMN "image" VARCHAR(2048);
UPDATE "user"
SET "name" = COALESCE(NULLIF(BTRIM("name"), ''), SPLIT_PART("email", '@', 1));
ALTER TABLE "user" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "user" ALTER COLUMN "emailVerified" SET DEFAULT FALSE;

CREATE TABLE "session" (
    "id" VARCHAR(36) NOT NULL DEFAULT cuid2(),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" VARCHAR(512) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(1024),
    "userId" VARCHAR(36) NOT NULL,
    CONSTRAINT "session_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "session_token_key" ON "session"("token");
CREATE INDEX "session_userId_idx" ON "session"("userId");

CREATE TABLE "account" (
    "id" VARCHAR(36) NOT NULL DEFAULT cuid2(),
    "accountId" VARCHAR(320) NOT NULL,
    "providerId" VARCHAR(100) NOT NULL,
    "userId" VARCHAR(36) NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "account_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");
CREATE INDEX "account_userId_idx" ON "account"("userId");

INSERT INTO "account" ("accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
SELECT "id", 'credential', "id", "password", "createdAt", "updatedAt"
FROM "user";

ALTER TABLE "user" DROP COLUMN "password";

CREATE TABLE "verification" (
    "id" VARCHAR(36) NOT NULL DEFAULT cuid2(),
    "identifier" VARCHAR(320) NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");
