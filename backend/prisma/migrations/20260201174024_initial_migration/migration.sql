-- CreateEnum
CREATE TYPE "public"."AmortizationType" AS ENUM ('PRICE', 'SAC', 'SACRE');

-- CreateEnum
CREATE TYPE "public"."AdvanceType" AS ENUM ('FRONT', 'BACK');

-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "public"."RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('DEBIT', 'CREDIT', 'PIX', 'CASH', 'TRANSFER', 'BOLETO');

-- CreateEnum
CREATE TYPE "public"."AccountType" AS ENUM ('CHECKING', 'SAVINGS', 'INVESTMENT', 'CASH', 'CREDIT_CARD');

-- CreateTable
CREATE TABLE "public"."CreditCard" (
    "id" UUID NOT NULL DEFAULT cuid2(),
    "accountId" UUID NOT NULL,
    "creditLimit" DECIMAL(12,2) NOT NULL,
    "statementDay" SMALLINT NOT NULL,
    "dueDay" SMALLINT NOT NULL,
    "workingDueDate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CreditCardHistory" (
    "id" UUID NOT NULL DEFAULT cuid2(),
    "creditCardId" UUID NOT NULL,
    "field" VARCHAR(50) NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditCardHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CreditCardStatement" (
    "id" UUID NOT NULL DEFAULT cuid2(),
    "creditCardId" UUID NOT NULL,
    "statementDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditCardStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CreditPurchase" (
    "id" UUID NOT NULL DEFAULT cuid2(),
    "statementId" UUID NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "installments" SMALLINT NOT NULL DEFAULT 1,
    "currentInstallment" SMALLINT NOT NULL DEFAULT 1,
    "installmentAmount" DECIMAL(12,2) NOT NULL,
    "purchaseDate" DATE NOT NULL,
    "categoryId" UUID,
    "parentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CreditPurchaseHistory" (
    "id" UUID NOT NULL DEFAULT cuid2(),
    "creditPurchaseId" UUID NOT NULL,
    "field" VARCHAR(50) NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditPurchaseHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Loan" (
    "id" UUID NOT NULL DEFAULT cuid2(),
    "userId" UUID NOT NULL,
    "lender" VARCHAR(100) NOT NULL,
    "principalAmount" DECIMAL(12,2) NOT NULL,
    "interestRate" DECIMAL(5,4) NOT NULL,
    "totalInstallments" SMALLINT NOT NULL,
    "installmentAmount" DECIMAL(12,2) NOT NULL,
    "dueDay" SMALLINT NOT NULL,
    "startDate" DATE NOT NULL,
    "firstDueDate" DATE NOT NULL,
    "description" VARCHAR(500),
    "amortization" "public"."AmortizationType" NOT NULL DEFAULT 'PRICE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LoanPayment" (
    "id" UUID NOT NULL DEFAULT cuid2(),
    "loanId" UUID NOT NULL,
    "accountId" UUID,
    "installmentNumber" SMALLINT NOT NULL,
    "principalPaid" DECIMAL(12,2) NOT NULL,
    "interestPaid" DECIMAL(12,2) NOT NULL,
    "totalPaid" DECIMAL(12,2) NOT NULL,
    "dueDate" DATE NOT NULL,
    "paidDate" DATE,
    "isAdvanced" BOOLEAN NOT NULL DEFAULT false,
    "advanceType" "public"."AdvanceType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LoanHistory" (
    "id" UUID NOT NULL DEFAULT cuid2(),
    "loanId" UUID NOT NULL,
    "field" VARCHAR(50) NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Transaction" (
    "id" UUID NOT NULL DEFAULT cuid2(),
    "amount" DECIMAL(12,2) NOT NULL,
    "date" DATE NOT NULL,
    "description" VARCHAR(1000),
    "type" "public"."TransactionType" NOT NULL DEFAULT 'EXPENSE',
    "categoryId" UUID,
    "recurrenceId" UUID,
    "originId" UUID,
    "destinationId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TransactionHistory" (
    "id" UUID NOT NULL DEFAULT cuid2(),
    "transactionId" UUID NOT NULL,
    "field" VARCHAR(50) NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" UUID NOT NULL DEFAULT cuid2(),
    "userId" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "color" VARCHAR(7),
    "icon" VARCHAR(50),
    "parentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecurringPayment" (
    "id" UUID NOT NULL DEFAULT cuid2(),
    "userId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "frequency" "public"."RecurrenceFrequency" NOT NULL,
    "dayOfMonth" SMALLINT,
    "dayOfWeek" SMALLINT,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "categoryId" UUID,
    "paymentMethod" "public"."PaymentMethod" NOT NULL DEFAULT 'DEBIT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecurringPaymentHistory" (
    "id" UUID NOT NULL DEFAULT cuid2(),
    "recurringPaymentId" UUID NOT NULL,
    "field" VARCHAR(50) NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringPaymentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Salary" (
    "id" UUID NOT NULL DEFAULT cuid2(),
    "userId" UUID NOT NULL,
    "source" VARCHAR(100) NOT NULL,
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "frequency" "public"."RecurrenceFrequency" NOT NULL DEFAULT 'MONTHLY',
    "payDay" SMALLINT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Salary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SalaryPayment" (
    "id" UUID NOT NULL DEFAULT cuid2(),
    "salaryId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" DATE NOT NULL,
    "notes" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SalaryHistory" (
    "id" UUID NOT NULL DEFAULT cuid2(),
    "salaryId" UUID NOT NULL,
    "field" VARCHAR(50) NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Debt" (
    "id" UUID NOT NULL DEFAULT cuid2(),
    "userId" UUID NOT NULL,
    "personName" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" VARCHAR(500),
    "isOwedToMe" BOOLEAN NOT NULL DEFAULT true,
    "date" DATE NOT NULL,
    "dueDate" DATE,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DebtHistory" (
    "id" UUID NOT NULL DEFAULT cuid2(),
    "debtId" UUID NOT NULL,
    "field" VARCHAR(50) NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Subscription" (
    "id" UUID NOT NULL DEFAULT cuid2(),
    "userId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "billingDay" SMALLINT NOT NULL,
    "frequency" "public"."RecurrenceFrequency" NOT NULL DEFAULT 'MONTHLY',
    "paymentMethod" "public"."PaymentMethod" NOT NULL DEFAULT 'CREDIT',
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubscriptionHistory" (
    "id" UUID NOT NULL DEFAULT cuid2(),
    "subscriptionId" UUID NOT NULL,
    "field" VARCHAR(50) NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" UUID NOT NULL DEFAULT cuid2(),
    "email" VARCHAR(320) NOT NULL,
    "password" VARCHAR(128) NOT NULL,
    "name" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" UUID NOT NULL DEFAULT cuid2(),
    "userId" UUID NOT NULL,
    "name" VARCHAR(70) NOT NULL,
    "type" "public"."AccountType" NOT NULL DEFAULT 'CHECKING',
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditCard_accountId_key" ON "public"."CreditCard"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditCardStatement_creditCardId_statementDate_key" ON "public"."CreditCardStatement"("creditCardId", "statementDate");

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_name_key" ON "public"."Category"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_userId_name_key" ON "public"."Account"("userId", "name");

-- AddForeignKey
ALTER TABLE "public"."CreditCard" ADD CONSTRAINT "CreditCard_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CreditCardHistory" ADD CONSTRAINT "CreditCardHistory_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "public"."CreditCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CreditCardStatement" ADD CONSTRAINT "CreditCardStatement_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "public"."CreditCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CreditPurchase" ADD CONSTRAINT "CreditPurchase_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "public"."CreditCardStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CreditPurchase" ADD CONSTRAINT "CreditPurchase_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CreditPurchase" ADD CONSTRAINT "CreditPurchase_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."CreditPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CreditPurchaseHistory" ADD CONSTRAINT "CreditPurchaseHistory_creditPurchaseId_fkey" FOREIGN KEY ("creditPurchaseId") REFERENCES "public"."CreditPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Loan" ADD CONSTRAINT "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoanPayment" ADD CONSTRAINT "LoanPayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "public"."Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoanPayment" ADD CONSTRAINT "LoanPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoanHistory" ADD CONSTRAINT "LoanHistory_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "public"."Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_recurrenceId_fkey" FOREIGN KEY ("recurrenceId") REFERENCES "public"."RecurringPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_originId_fkey" FOREIGN KEY ("originId") REFERENCES "public"."Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "public"."Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TransactionHistory" ADD CONSTRAINT "TransactionHistory_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecurringPayment" ADD CONSTRAINT "RecurringPayment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecurringPaymentHistory" ADD CONSTRAINT "RecurringPaymentHistory_recurringPaymentId_fkey" FOREIGN KEY ("recurringPaymentId") REFERENCES "public"."RecurringPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Salary" ADD CONSTRAINT "Salary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SalaryPayment" ADD CONSTRAINT "SalaryPayment_salaryId_fkey" FOREIGN KEY ("salaryId") REFERENCES "public"."Salary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SalaryPayment" ADD CONSTRAINT "SalaryPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SalaryHistory" ADD CONSTRAINT "SalaryHistory_salaryId_fkey" FOREIGN KEY ("salaryId") REFERENCES "public"."Salary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Debt" ADD CONSTRAINT "Debt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DebtHistory" ADD CONSTRAINT "DebtHistory_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "public"."Debt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubscriptionHistory" ADD CONSTRAINT "SubscriptionHistory_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
