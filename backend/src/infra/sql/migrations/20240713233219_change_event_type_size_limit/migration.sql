/*
  Warnings:

  - You are about to alter the column `type` on the `Event` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `VarChar(15)`.

*/
-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "type" SET DATA TYPE VARCHAR(15);
