#!/usr/bin/env -S node
import { col, fn, lit, Migration, MigrationCLI, primaryKey, rawSql } from "@prisma/orm-postgres/migration";
import type { Contract as End } from "../../snapshots/7ba8ce9bb6a6d0056a2ed6d434753d6a5b01af68f510a6e41e2ca1f5be22116f/contract";
import endContract from "../../snapshots/7ba8ce9bb6a6d0056a2ed6d434753d6a5b01af68f510a6e41e2ca1f5be22116f/contract.json" with {
	type: "json",
};

export default class M extends Migration<never, End> {
	override readonly endContractJson = endContract;

	override get operations() {
		return [
			this.createSchema({ schema: "public" }),
			rawSql({
				execute: [{ description: "Enable pgcrypto", sql: "CREATE EXTENSION IF NOT EXISTS pgcrypto" }],
				id: "extension.pgcrypto",
				label: 'Enable extension "pgcrypto"',
				operationClass: "additive",
				postcheck: [
					{
						description: "pgcrypto is enabled",
						sql: "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') AS ok",
					},
				],
				precheck: [
					{
						description: "pgcrypto is not enabled",
						sql: "SELECT NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') AS ok",
					},
				],
				target: { id: "postgres" },
			}),
			rawSql({
				execute: [
					{
						description: "Create cuid2",
						sql: `CREATE OR REPLACE FUNCTION public.cuid2()
RETURNS uuid
LANGUAGE sql
VOLATILE
AS $$
  SELECT gen_random_uuid()
$$`,
					},
				],
				id: "function.cuid2",
				label: 'Create function "cuid2"',
				operationClass: "additive",
				postcheck: [
					{
						description: "cuid2 is defined with the expected signature",
						sql: "SELECT EXISTS (SELECT 1 FROM pg_proc WHERE oid = to_regprocedure('public.cuid2()') AND prorettype = 'uuid'::regtype) AS ok",
					},
				],
				precheck: [
					{
						description: "cuid2 is not defined with the expected signature",
						sql: "SELECT NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid = to_regprocedure('public.cuid2()') AND prorettype = 'uuid'::regtype) AS ok",
					},
				],
				target: { id: "postgres" },
			}),
			this.createNativeEnumType({
				members: ["FRONT", "BACK"],
				schema: "public",
				typeName: "AdvanceType",
			}),
			this.createNativeEnumType({
				members: ["PRICE", "SAC", "SACRE"],
				schema: "public",
				typeName: "AmortizationType",
			}),
			this.createNativeEnumType({
				members: ["CHECKING", "SAVINGS", "INVESTMENT", "CASH", "CREDIT_CARD"],
				schema: "public",
				typeName: "FinancialAccountType",
			}),
			this.createNativeEnumType({
				members: ["DEBIT", "CREDIT", "PIX", "CASH", "TRANSFER", "BOLETO"],
				schema: "public",
				typeName: "PaymentMethod",
			}),
			this.createNativeEnumType({
				members: ["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"],
				schema: "public",
				typeName: "RecurrenceFrequency",
			}),
			this.createNativeEnumType({
				members: ["INCOME", "EXPENSE", "TRANSFER"],
				schema: "public",
				typeName: "TransactionType",
			}),
			this.createTable({
				columns: [
					col("color", "character varying(7)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 7 } },
					}),
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("icon", "character varying(50)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 50 } },
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("name", "character varying(50)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 50 } },
						notNull: true,
					}),
					col("parentId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
					}),
					col("updatedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("userId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "Category_pkey" })],
				schema: "public",
				table: "Category",
			}),
			this.createTable({
				columns: [
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("creditLimit", "numeric(12,2)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
						notNull: true,
					}),
					col("dueDay", "int2", { codecRef: { codecId: "pg/int2@1" }, notNull: true }),
					col("financialAccountId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("statementDay", "int2", { codecRef: { codecId: "pg/int2@1" }, notNull: true }),
					col("updatedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("workingDueDate", "bool", {
						codecRef: { codecId: "pg/bool@1" },
						default: lit(false),
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "CreditCard_pkey" })],
				schema: "public",
				table: "CreditCard",
			}),
			this.createTable({
				columns: [
					col("changedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("creditCardId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
					col("field", "character varying(50)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 50 } },
						notNull: true,
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("newValue", "text", { codecRef: { codecId: "pg/text@1" } }),
					col("oldValue", "text", { codecRef: { codecId: "pg/text@1" } }),
				],
				constraints: [primaryKey(["id"], { name: "CreditCardHistory_pkey" })],
				schema: "public",
				table: "CreditCardHistory",
			}),
			this.createTable({
				columns: [
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("creditCardId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
					col("dueDate", "date", { codecRef: { codecId: "pg/date@1" }, notNull: true }),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("isPaid", "bool", {
						codecRef: { codecId: "pg/bool@1" },
						default: lit(false),
						notNull: true,
					}),
					col("paidAmount", "numeric(12,2)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
						default: fn("0"),
						notNull: true,
					}),
					col("statementDate", "date", { codecRef: { codecId: "pg/date@1" }, notNull: true }),
					col("totalAmount", "numeric(12,2)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
						default: fn("0"),
						notNull: true,
					}),
					col("updatedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "CreditCardStatement_pkey" })],
				schema: "public",
				table: "CreditCardStatement",
			}),
			this.createTable({
				columns: [
					col("categoryId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
					}),
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("currentInstallment", "int2", {
						codecRef: { codecId: "pg/int2@1" },
						default: lit(1),
						notNull: true,
					}),
					col("description", "character varying(500)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 500 } },
						notNull: true,
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("installmentAmount", "numeric(12,2)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
						notNull: true,
					}),
					col("installments", "int2", {
						codecRef: { codecId: "pg/int2@1" },
						default: lit(1),
						notNull: true,
					}),
					col("parentId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
					}),
					col("purchaseDate", "date", { codecRef: { codecId: "pg/date@1" }, notNull: true }),
					col("statementId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
					col("totalAmount", "numeric(12,2)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
						notNull: true,
					}),
					col("updatedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "CreditPurchase_pkey" })],
				schema: "public",
				table: "CreditPurchase",
			}),
			this.createTable({
				columns: [
					col("changedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("creditPurchaseId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
					col("field", "character varying(50)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 50 } },
						notNull: true,
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("newValue", "text", { codecRef: { codecId: "pg/text@1" } }),
					col("oldValue", "text", { codecRef: { codecId: "pg/text@1" } }),
				],
				constraints: [primaryKey(["id"], { name: "CreditPurchaseHistory_pkey" })],
				schema: "public",
				table: "CreditPurchaseHistory",
			}),
			this.createTable({
				columns: [
					col("amount", "numeric(12,2)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
						notNull: true,
					}),
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("date", "date", { codecRef: { codecId: "pg/date@1" }, notNull: true }),
					col("description", "character varying(500)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 500 } },
					}),
					col("dueDate", "date", { codecRef: { codecId: "pg/date@1" } }),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("isOwedToMe", "bool", {
						codecRef: { codecId: "pg/bool@1" },
						default: lit(true),
						notNull: true,
					}),
					col("isPaid", "bool", {
						codecRef: { codecId: "pg/bool@1" },
						default: lit(false),
						notNull: true,
					}),
					col("paidDate", "date", { codecRef: { codecId: "pg/date@1" } }),
					col("personName", "character varying(100)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 100 } },
						notNull: true,
					}),
					col("updatedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("userId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "Debt_pkey" })],
				schema: "public",
				table: "Debt",
			}),
			this.createTable({
				columns: [
					col("changedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("debtId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
					col("field", "character varying(50)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 50 } },
						notNull: true,
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("newValue", "text", { codecRef: { codecId: "pg/text@1" } }),
					col("oldValue", "text", { codecRef: { codecId: "pg/text@1" } }),
				],
				constraints: [primaryKey(["id"], { name: "DebtHistory_pkey" })],
				schema: "public",
				table: "DebtHistory",
			}),
			this.createTable({
				columns: [
					col("balance", "numeric(12,2)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
						default: fn("0"),
						notNull: true,
					}),
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("name", "character varying(70)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 70 } },
						notNull: true,
					}),
					col("type", '"FinancialAccountType"', {
						codecRef: { codecId: "pg/enum@1", typeParams: { typeName: "FinancialAccountType" } },
						default: lit("CHECKING"),
						notNull: true,
					}),
					col("updatedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("userId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "Account_pkey" })],
				schema: "public",
				table: "FinancialAccount",
			}),
			this.createTable({
				columns: [
					col("amortization", '"AmortizationType"', {
						codecRef: { codecId: "pg/enum@1", typeParams: { typeName: "AmortizationType" } },
						default: lit("PRICE"),
						notNull: true,
					}),
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("description", "character varying(500)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 500 } },
					}),
					col("dueDay", "int2", { codecRef: { codecId: "pg/int2@1" }, notNull: true }),
					col("firstDueDate", "date", { codecRef: { codecId: "pg/date@1" }, notNull: true }),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("installmentAmount", "numeric(12,2)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
						notNull: true,
					}),
					col("interestRate", "numeric(5,4)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 5, scale: 4 } },
						notNull: true,
					}),
					col("lender", "character varying(100)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 100 } },
						notNull: true,
					}),
					col("principalAmount", "numeric(12,2)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
						notNull: true,
					}),
					col("startDate", "date", { codecRef: { codecId: "pg/date@1" }, notNull: true }),
					col("totalInstallments", "int2", { codecRef: { codecId: "pg/int2@1" }, notNull: true }),
					col("updatedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("userId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "Loan_pkey" })],
				schema: "public",
				table: "Loan",
			}),
			this.createTable({
				columns: [
					col("changedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("field", "character varying(50)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 50 } },
						notNull: true,
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("loanId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
					col("newValue", "text", { codecRef: { codecId: "pg/text@1" } }),
					col("oldValue", "text", { codecRef: { codecId: "pg/text@1" } }),
				],
				constraints: [primaryKey(["id"], { name: "LoanHistory_pkey" })],
				schema: "public",
				table: "LoanHistory",
			}),
			this.createTable({
				columns: [
					col("advanceType", '"AdvanceType"', {
						codecRef: { codecId: "pg/enum@1", typeParams: { typeName: "AdvanceType" } },
					}),
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("dueDate", "date", { codecRef: { codecId: "pg/date@1" }, notNull: true }),
					col("financialAccountId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("installmentNumber", "int2", { codecRef: { codecId: "pg/int2@1" }, notNull: true }),
					col("interestPaid", "numeric(12,2)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
						notNull: true,
					}),
					col("isAdvanced", "bool", {
						codecRef: { codecId: "pg/bool@1" },
						default: lit(false),
						notNull: true,
					}),
					col("loanId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
					col("paidDate", "date", { codecRef: { codecId: "pg/date@1" } }),
					col("principalPaid", "numeric(12,2)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
						notNull: true,
					}),
					col("totalPaid", "numeric(12,2)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
						notNull: true,
					}),
					col("updatedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "LoanPayment_pkey" })],
				schema: "public",
				table: "LoanPayment",
			}),
			this.createTable({
				columns: [
					col("amount", "numeric(12,2)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
						notNull: true,
					}),
					col("categoryId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
					}),
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("dayOfMonth", "int2", { codecRef: { codecId: "pg/int2@1" } }),
					col("dayOfWeek", "int2", { codecRef: { codecId: "pg/int2@1" } }),
					col("endDate", "date", { codecRef: { codecId: "pg/date@1" } }),
					col("frequency", '"RecurrenceFrequency"', {
						codecRef: { codecId: "pg/enum@1", typeParams: { typeName: "RecurrenceFrequency" } },
						notNull: true,
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("isActive", "bool", {
						codecRef: { codecId: "pg/bool@1" },
						default: lit(true),
						notNull: true,
					}),
					col("name", "character varying(100)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 100 } },
						notNull: true,
					}),
					col("paymentMethod", '"PaymentMethod"', {
						codecRef: { codecId: "pg/enum@1", typeParams: { typeName: "PaymentMethod" } },
						default: lit("DEBIT"),
						notNull: true,
					}),
					col("startDate", "date", { codecRef: { codecId: "pg/date@1" }, notNull: true }),
					col("updatedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("userId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "RecurringPayment_pkey" })],
				schema: "public",
				table: "RecurringPayment",
			}),
			this.createTable({
				columns: [
					col("changedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("field", "character varying(50)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 50 } },
						notNull: true,
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("newValue", "text", { codecRef: { codecId: "pg/text@1" } }),
					col("oldValue", "text", { codecRef: { codecId: "pg/text@1" } }),
					col("recurringPaymentId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "RecurringPaymentHistory_pkey" })],
				schema: "public",
				table: "RecurringPaymentHistory",
			}),
			this.createTable({
				columns: [
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("endDate", "date", { codecRef: { codecId: "pg/date@1" } }),
					col("frequency", '"RecurrenceFrequency"', {
						codecRef: { codecId: "pg/enum@1", typeParams: { typeName: "RecurrenceFrequency" } },
						default: lit("MONTHLY"),
						notNull: true,
					}),
					col("grossAmount", "numeric(12,2)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
						notNull: true,
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("isActive", "bool", {
						codecRef: { codecId: "pg/bool@1" },
						default: lit(true),
						notNull: true,
					}),
					col("netAmount", "numeric(12,2)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
						notNull: true,
					}),
					col("payDay", "int2", { codecRef: { codecId: "pg/int2@1" }, notNull: true }),
					col("source", "character varying(100)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 100 } },
						notNull: true,
					}),
					col("startDate", "date", { codecRef: { codecId: "pg/date@1" }, notNull: true }),
					col("updatedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("userId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "Salary_pkey" })],
				schema: "public",
				table: "Salary",
			}),
			this.createTable({
				columns: [
					col("changedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("field", "character varying(50)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 50 } },
						notNull: true,
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("newValue", "text", { codecRef: { codecId: "pg/text@1" } }),
					col("oldValue", "text", { codecRef: { codecId: "pg/text@1" } }),
					col("salaryId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "SalaryHistory_pkey" })],
				schema: "public",
				table: "SalaryHistory",
			}),
			this.createTable({
				columns: [
					col("amount", "numeric(12,2)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
						notNull: true,
					}),
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("date", "date", { codecRef: { codecId: "pg/date@1" }, notNull: true }),
					col("financialAccountId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("notes", "character varying(500)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 500 } },
					}),
					col("salaryId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "SalaryPayment_pkey" })],
				schema: "public",
				table: "SalaryPayment",
			}),
			this.createTable({
				columns: [
					col("amount", "numeric(12,2)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
						notNull: true,
					}),
					col("billingDay", "int2", { codecRef: { codecId: "pg/int2@1" }, notNull: true }),
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("endDate", "date", { codecRef: { codecId: "pg/date@1" } }),
					col("frequency", '"RecurrenceFrequency"', {
						codecRef: { codecId: "pg/enum@1", typeParams: { typeName: "RecurrenceFrequency" } },
						default: lit("MONTHLY"),
						notNull: true,
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("isActive", "bool", {
						codecRef: { codecId: "pg/bool@1" },
						default: lit(true),
						notNull: true,
					}),
					col("name", "character varying(100)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 100 } },
						notNull: true,
					}),
					col("paymentMethod", '"PaymentMethod"', {
						codecRef: { codecId: "pg/enum@1", typeParams: { typeName: "PaymentMethod" } },
						default: lit("CREDIT"),
						notNull: true,
					}),
					col("startDate", "date", { codecRef: { codecId: "pg/date@1" }, notNull: true }),
					col("updatedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("userId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "Subscription_pkey" })],
				schema: "public",
				table: "Subscription",
			}),
			this.createTable({
				columns: [
					col("changedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("field", "character varying(50)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 50 } },
						notNull: true,
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("newValue", "text", { codecRef: { codecId: "pg/text@1" } }),
					col("oldValue", "text", { codecRef: { codecId: "pg/text@1" } }),
					col("subscriptionId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "SubscriptionHistory_pkey" })],
				schema: "public",
				table: "SubscriptionHistory",
			}),
			this.createTable({
				columns: [
					col("amount", "numeric(12,2)", {
						codecRef: { codecId: "pg/numeric@1", typeParams: { precision: 12, scale: 2 } },
						notNull: true,
					}),
					col("categoryId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
					}),
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("date", "date", { codecRef: { codecId: "pg/date@1" }, notNull: true }),
					col("description", "character varying(1000)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 1000 } },
					}),
					col("destinationFinancialAccountId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("originFinancialAccountId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
					}),
					col("recurrenceId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
					}),
					col("type", '"TransactionType"', {
						codecRef: { codecId: "pg/enum@1", typeParams: { typeName: "TransactionType" } },
						default: lit("EXPENSE"),
						notNull: true,
					}),
					col("updatedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "Transaction_pkey" })],
				schema: "public",
				table: "Transaction",
			}),
			this.createTable({
				columns: [
					col("changedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("field", "character varying(50)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 50 } },
						notNull: true,
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("newValue", "text", { codecRef: { codecId: "pg/text@1" } }),
					col("oldValue", "text", { codecRef: { codecId: "pg/text@1" } }),
					col("transactionId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "TransactionHistory_pkey" })],
				schema: "public",
				table: "TransactionHistory",
			}),
			this.createTable({
				columns: [
					col("accessToken", "text", { codecRef: { codecId: "pg/text@1" } }),
					col("accessTokenExpiresAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
					}),
					col("accountId", "character varying(320)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 320 } },
						notNull: true,
					}),
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("idToken", "text", { codecRef: { codecId: "pg/text@1" } }),
					col("password", "character varying(255)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 255 } },
					}),
					col("providerId", "character varying(100)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 100 } },
						notNull: true,
					}),
					col("refreshToken", "text", { codecRef: { codecId: "pg/text@1" } }),
					col("refreshTokenExpiresAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
					}),
					col("scope", "text", { codecRef: { codecId: "pg/text@1" } }),
					col("updatedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("userId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "account_pkey" })],
				schema: "public",
				table: "account",
			}),
			this.createTable({
				columns: [
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("expiresAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						notNull: true,
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("ipAddress", "character varying(64)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 64 } },
					}),
					col("token", "character varying(512)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 512 } },
						notNull: true,
					}),
					col("updatedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("userAgent", "character varying(1024)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 1024 } },
					}),
					col("userId", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "session_pkey" })],
				schema: "public",
				table: "session",
			}),
			this.createTable({
				columns: [
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("email", "character varying(320)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 320 } },
						notNull: true,
					}),
					col("emailVerified", "bool", {
						codecRef: { codecId: "pg/bool@1" },
						default: lit(false),
						notNull: true,
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("image", "character varying(2048)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 2048 } },
					}),
					col("name", "character varying(100)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 100 } },
						notNull: true,
					}),
					col("updatedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
				],
				constraints: [primaryKey(["id"], { name: "User_pkey" })],
				schema: "public",
				table: "user",
			}),
			this.createTable({
				columns: [
					col("createdAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("expiresAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						notNull: true,
					}),
					col("id", "character varying(36)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 36 } },
						default: fn("cuid2()"),
						notNull: true,
					}),
					col("identifier", "character varying(320)", {
						codecRef: { codecId: "sql/varchar@1", typeParams: { length: 320 } },
						notNull: true,
					}),
					col("updatedAt", "timestamp(3)", {
						codecRef: { codecId: "pg/timestamp@1", typeParams: { precision: 3 } },
						default: fn("now()"),
						notNull: true,
					}),
					col("value", "text", { codecRef: { codecId: "pg/text@1" }, notNull: true }),
				],
				constraints: [primaryKey(["id"], { name: "verification_pkey" })],
				schema: "public",
				table: "verification",
			}),
			this.createIndex({
				columns: ["userId", "name"],
				extras: { unique: true },
				index: "Category_userId_name_key",
				schema: "public",
				table: "Category",
			}),
			this.createIndex({
				columns: ["financialAccountId"],
				extras: { unique: true },
				index: "CreditCard_accountId_key",
				schema: "public",
				table: "CreditCard",
			}),
			this.createIndex({
				columns: ["creditCardId", "statementDate"],
				extras: { unique: true },
				index: "CreditCardStatement_creditCardId_statementDate_key",
				schema: "public",
				table: "CreditCardStatement",
			}),
			this.createIndex({
				columns: ["userId", "name"],
				extras: { unique: true },
				index: "Account_userId_name_key",
				schema: "public",
				table: "FinancialAccount",
			}),
			this.createIndex({
				columns: ["providerId", "accountId"],
				extras: { unique: true },
				index: "account_providerId_accountId_key",
				schema: "public",
				table: "account",
			}),
			this.createIndex({
				columns: ["userId"],
				index: "account_userId_idx",
				schema: "public",
				table: "account",
			}),
			this.createIndex({
				columns: ["token"],
				extras: { unique: true },
				index: "session_token_key",
				schema: "public",
				table: "session",
			}),
			this.createIndex({
				columns: ["userId"],
				index: "session_userId_idx",
				schema: "public",
				table: "session",
			}),
			this.createIndex({
				columns: ["email"],
				extras: { unique: true },
				index: "User_email_key",
				schema: "public",
				table: "user",
			}),
			this.createIndex({
				columns: ["identifier"],
				index: "verification_identifier_idx",
				schema: "public",
				table: "verification",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["parentId"],
					name: "Category_parentId_fkey",
					onDelete: "setNull",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "Category" },
				},
				schema: "public",
				table: "Category",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["userId"],
					name: "Category_userId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "user" },
				},
				schema: "public",
				table: "Category",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["financialAccountId"],
					name: "CreditCard_accountId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "FinancialAccount" },
				},
				schema: "public",
				table: "CreditCard",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["creditCardId"],
					name: "CreditCardHistory_creditCardId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "CreditCard" },
				},
				schema: "public",
				table: "CreditCardHistory",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["creditCardId"],
					name: "CreditCardStatement_creditCardId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "CreditCard" },
				},
				schema: "public",
				table: "CreditCardStatement",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["categoryId"],
					name: "CreditPurchase_categoryId_fkey",
					onDelete: "setNull",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "Category" },
				},
				schema: "public",
				table: "CreditPurchase",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["parentId"],
					name: "CreditPurchase_parentId_fkey",
					onDelete: "setNull",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "CreditPurchase" },
				},
				schema: "public",
				table: "CreditPurchase",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["statementId"],
					name: "CreditPurchase_statementId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "CreditCardStatement" },
				},
				schema: "public",
				table: "CreditPurchase",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["creditPurchaseId"],
					name: "CreditPurchaseHistory_creditPurchaseId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "CreditPurchase" },
				},
				schema: "public",
				table: "CreditPurchaseHistory",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["userId"],
					name: "Debt_userId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "user" },
				},
				schema: "public",
				table: "Debt",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["debtId"],
					name: "DebtHistory_debtId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "Debt" },
				},
				schema: "public",
				table: "DebtHistory",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["userId"],
					name: "Account_userId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "user" },
				},
				schema: "public",
				table: "FinancialAccount",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["userId"],
					name: "Loan_userId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "user" },
				},
				schema: "public",
				table: "Loan",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["loanId"],
					name: "LoanHistory_loanId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "Loan" },
				},
				schema: "public",
				table: "LoanHistory",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["financialAccountId"],
					name: "LoanPayment_accountId_fkey",
					onDelete: "setNull",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "FinancialAccount" },
				},
				schema: "public",
				table: "LoanPayment",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["loanId"],
					name: "LoanPayment_loanId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "Loan" },
				},
				schema: "public",
				table: "LoanPayment",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["categoryId"],
					name: "RecurringPayment_categoryId_fkey",
					onDelete: "setNull",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "Category" },
				},
				schema: "public",
				table: "RecurringPayment",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["recurringPaymentId"],
					name: "RecurringPaymentHistory_recurringPaymentId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "RecurringPayment" },
				},
				schema: "public",
				table: "RecurringPaymentHistory",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["userId"],
					name: "Salary_userId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "user" },
				},
				schema: "public",
				table: "Salary",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["salaryId"],
					name: "SalaryHistory_salaryId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "Salary" },
				},
				schema: "public",
				table: "SalaryHistory",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["financialAccountId"],
					name: "SalaryPayment_accountId_fkey",
					onDelete: "restrict",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "FinancialAccount" },
				},
				schema: "public",
				table: "SalaryPayment",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["salaryId"],
					name: "SalaryPayment_salaryId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "Salary" },
				},
				schema: "public",
				table: "SalaryPayment",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["userId"],
					name: "Subscription_userId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "user" },
				},
				schema: "public",
				table: "Subscription",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["subscriptionId"],
					name: "SubscriptionHistory_subscriptionId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "Subscription" },
				},
				schema: "public",
				table: "SubscriptionHistory",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["categoryId"],
					name: "Transaction_categoryId_fkey",
					onDelete: "setNull",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "Category" },
				},
				schema: "public",
				table: "Transaction",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["destinationFinancialAccountId"],
					name: "Transaction_destinationId_fkey",
					onDelete: "setNull",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "FinancialAccount" },
				},
				schema: "public",
				table: "Transaction",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["originFinancialAccountId"],
					name: "Transaction_originId_fkey",
					onDelete: "setNull",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "FinancialAccount" },
				},
				schema: "public",
				table: "Transaction",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["recurrenceId"],
					name: "Transaction_recurrenceId_fkey",
					onDelete: "setNull",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "RecurringPayment" },
				},
				schema: "public",
				table: "Transaction",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["transactionId"],
					name: "TransactionHistory_transactionId_fkey",
					onDelete: "cascade",
					onUpdate: "cascade",
					references: { columns: ["id"], schema: "public", table: "Transaction" },
				},
				schema: "public",
				table: "TransactionHistory",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["userId"],
					name: "account_userId_fkey",
					onDelete: "cascade",
					references: { columns: ["id"], schema: "public", table: "user" },
				},
				schema: "public",
				table: "account",
			}),
			this.addForeignKey({
				foreignKey: {
					columns: ["userId"],
					name: "session_userId_fkey",
					onDelete: "cascade",
					references: { columns: ["id"], schema: "public", table: "user" },
				},
				schema: "public",
				table: "session",
			}),
		];
	}
}

MigrationCLI.run(import.meta.url, M);
