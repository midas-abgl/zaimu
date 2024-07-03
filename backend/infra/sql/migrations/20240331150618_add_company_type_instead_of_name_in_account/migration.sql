/*
  Warnings:

  - You are about to drop the column `name` on the `Account` table. All the data in the column will be lost.
  - You are about to alter the column `description` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `VarChar` to `VarChar(1000)`.
  - A unique constraint covering the columns `[company,type]` on the table `Account` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `company` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Account` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_destinationId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_originId_fkey";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "name",
ADD COLUMN     "company" VARCHAR(70) NOT NULL,
ADD COLUMN     "type" VARCHAR(30) NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "description" SET DATA TYPE VARCHAR(1000);

-- CreateIndex
CREATE UNIQUE INDEX "Account_company_type_key" ON "Account"("company", "type");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_originId_fkey" FOREIGN KEY ("originId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
