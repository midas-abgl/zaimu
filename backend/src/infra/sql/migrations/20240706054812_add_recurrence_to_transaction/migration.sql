-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "recurrence" VARCHAR(26),
ADD COLUMN     "repeatCount" SMALLINT, ADD CONSTRAINT "chk_repeatCount" CHECK ("repeatCount" IS NULL OR "repeatCount" > 1);
