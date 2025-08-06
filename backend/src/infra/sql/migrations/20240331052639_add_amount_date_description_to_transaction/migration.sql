/*
  Warnings:

  - Added the required column `amount` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `date` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "amount" DECIMAL(8,3) NOT NULL,
ADD COLUMN     "date" TIMESTAMPTZ NOT NULL,
ADD COLUMN     "description" VARCHAR;
