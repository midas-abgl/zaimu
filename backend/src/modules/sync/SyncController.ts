import Elysia from "elysia";
import { requireUserId } from "~/modules/auth";
import { db, executeStatement, nullableNumeric, queryFirst, queryRows } from "~/shared/infra/sql";
import { SyncBody, SyncReturn } from "./SyncDTO";

type InputEntity = Record<string, unknown>;
interface SyncGroup {
	errors: string[];
	synced: number;
}

const value = <T>(entity: InputEntity, field: string) => entity[field] as T;
const optionalDate = (entity: InputEntity, field: string) => {
	const input = value<null | string | undefined>(entity, field);
	return input ? new Date(input) : null;
};

const accountColumns = ["id", "userId", "name", "type", "balance", "createdAt", "updatedAt"] as const;
const categoryColumns = [
	"id",
	"userId",
	"name",
	"color",
	"icon",
	"parentId",
	"createdAt",
	"updatedAt",
] as const;
const cardColumns = [
	"id",
	"financialAccountId",
	"creditLimit",
	"securityDeposit",
	"statementDay",
	"dueDay",
	"workingDueDate",
	"createdAt",
	"updatedAt",
] as const;
const statementColumns = [
	"id",
	"creditCardId",
	"statementDate",
	"dueDate",
	"totalAmount",
	"paidAmount",
	"isPaid",
	"createdAt",
	"updatedAt",
] as const;
const purchaseColumns = [
	"id",
	"statementId",
	"description",
	"totalAmount",
	"installments",
	"currentInstallment",
	"installmentAmount",
	"purchaseDate",
	"categoryId",
	"parentId",
	"createdAt",
	"updatedAt",
] as const;
const transactionColumns = [
	"id",
	"amount",
	"date",
	"description",
	"type",
	"categoryId",
	"recurrenceId",
	"originFinancialAccountId",
	"destinationFinancialAccountId",
	"createdAt",
	"updatedAt",
] as const;

export const SyncController = new Elysia({ prefix: "/sync" }).post(
	"/",
	async ({ body, request }): Promise<SyncReturn> => {
		const userId = await requireUserId(request);
		const syncResults: Record<string, SyncGroup> = {};
		const accountIds = new Set<string>();
		const categoryIds = new Set<string>();
		const recurringIds = new Set<string>();
		const cardIds = new Set<string>();
		const statementIds = new Set<string>();

		const sync = async (
			group: string,
			entities: InputEntity[] | undefined,
			operation: (entity: InputEntity) => Promise<void>,
		) => {
			const result = { errors: [] as string[], synced: 0 };
			for (const entity of entities ?? []) {
				try {
					await operation(entity);
					result.synced++;
				} catch (error) {
					result.errors.push(error instanceof Error ? error.message : `Falha ao sincronizar ${group}`);
				}
			}
			syncResults[group] = result;
		};

		await sync("financialAccounts", body.financialAccounts, async entity => {
			const id = value<string>(entity, "id");
			const type =
				value<"CASH" | "CHECKING" | "CREDIT_CARD" | "INVESTMENT" | "SAVINGS">(entity, "type") ?? "CHECKING";
			const existing = await queryFirst(
				db.sql.public.FinancialAccount.select("id", "userId")
					.where((f, fn) => fn.eq(f.id, id))
					.limit(1)
					.build(),
			);
			if (existing && existing.userId !== userId)
				throw new Error(`Conta financeira ${id} pertence a outro usuário`);
			const values = {
				balance: nullableNumeric<12, 2>(
					type === "CREDIT_CARD" ? null : (value<number>(entity, "balance") ?? 0),
				),
				name: value<string>(entity, "name"),
				type,
				updatedAt: new Date(),
			};
			if (existing)
				await executeStatement(
					db.sql.public.FinancialAccount.update(values)
						.where((f, fn) => fn.and(fn.eq(f.id, id), fn.eq(f.userId, userId)))
						.build(),
				);
			else await executeStatement(db.sql.public.FinancialAccount.insert([{ ...values, id, userId }]).build());
			accountIds.add(id);
		});

		await sync("categories", body.categories, async entity => {
			const id = value<string>(entity, "id");
			const existing = await queryFirst(
				db.sql.public.Category.select("id", "userId")
					.where((f, fn) => fn.eq(f.id, id))
					.limit(1)
					.build(),
			);
			if (existing && existing.userId !== userId) throw new Error(`Categoria ${id} pertence a outro usuário`);
			const values = {
				color: value<string | undefined>(entity, "color"),
				icon: value<string | undefined>(entity, "icon"),
				name: value<string>(entity, "name"),
				updatedAt: new Date(),
			};
			if (existing)
				await executeStatement(
					db.sql.public.Category.update(values)
						.where((f, fn) => fn.and(fn.eq(f.id, id), fn.eq(f.userId, userId)))
						.build(),
				);
			else await executeStatement(db.sql.public.Category.insert([{ ...values, id, userId }]).build());
			categoryIds.add(id);
		});

		await sync("recurringPayments", body.recurringPayments, async entity => {
			const id = value<string>(entity, "id");
			const existing = await queryFirst(
				db.sql.public.RecurringPayment.select("id", "userId")
					.where((f, fn) => fn.eq(f.id, id))
					.limit(1)
					.build(),
			);
			if (existing && existing.userId !== userId)
				throw new Error(`Recorrência ${id} pertence a outro usuário`);
			const categoryId = value<string | undefined>(entity, "categoryId");
			if (categoryId && !categoryIds.has(categoryId)) throw new Error(`Categoria ${categoryId} indisponível`);
			const values = {
				amount: String(value<number>(entity, "amount")),
				categoryId,
				dayOfMonth:
					value<number | undefined>(entity, "dayOfMonth") ?? value<number | undefined>(entity, "day"),
				dayOfWeek: value<number | undefined>(entity, "dayOfWeek"),
				endDate: optionalDate(entity, "endDate"),
				frequency: value<"BIWEEKLY" | "DAILY" | "MONTHLY" | "WEEKLY" | "YEARLY">(entity, "frequency"),
				isActive: value<boolean>(entity, "isActive") ?? true,
				name: value<string>(entity, "name"),
				paymentMethod:
					value<"BOLETO" | "CASH" | "CREDIT" | "DEBIT" | "PIX" | "TRANSFER">(entity, "paymentMethod") ??
					"DEBIT",
				startDate: new Date(value<string>(entity, "startDate")),
				updatedAt: new Date(),
			};
			if (existing)
				await executeStatement(
					db.sql.public.RecurringPayment.update(values as never)
						.where((f, fn) => fn.and(fn.eq(f.id, id), fn.eq(f.userId, userId)))
						.build(),
				);
			else
				await executeStatement(
					db.sql.public.RecurringPayment.insert([{ ...values, id, userId }] as never).build(),
				);
			recurringIds.add(id);
		});

		await sync("creditCards", body.creditCards, async entity => {
			const id = value<string>(entity, "id");
			const financialAccountId = value<string>(entity, "financialAccountId");
			if (!accountIds.has(financialAccountId))
				throw new Error(`Conta financeira ${financialAccountId} indisponível`);
			const existing = await queryFirst(
				db.sql.public.CreditCard.select("id")
					.where((f, fn) => fn.eq(f.id, id))
					.limit(1)
					.build(),
			);
			const values = {
				creditLimit: String(value<number>(entity, "creditLimit")),
				dueDay: Number(value<number>(entity, "dueDay")),
				financialAccountId,
				securityDeposit: nullableNumeric<12, 2>(
					value<number | null | undefined>(entity, "securityDeposit") ?? null,
				),
				statementDay: Number(value<number>(entity, "statementDay")),
				updatedAt: new Date(),
				workingDueDate: value<boolean>(entity, "workingDueDate") ?? false,
			};
			if (existing)
				await executeStatement(
					db.sql.public.CreditCard.update(values)
						.where((f, fn) => fn.and(fn.eq(f.id, id), fn.in(f.financialAccountId, [...accountIds])))
						.build(),
				);
			else await executeStatement(db.sql.public.CreditCard.insert([{ ...values, id }]).build());
			cardIds.add(id);
		});

		await sync("creditCardStatements", body.creditCardStatements, async entity => {
			const id = value<string>(entity, "id");
			const creditCardId = value<string>(entity, "creditCardId");
			if (!cardIds.has(creditCardId)) throw new Error(`Cartão ${creditCardId} indisponível`);
			const existing = await queryFirst(
				db.sql.public.CreditCardStatement.select("id")
					.where((f, fn) => fn.eq(f.id, id))
					.limit(1)
					.build(),
			);
			const values = {
				creditCardId,
				dueDate: new Date(value<string>(entity, "dueDate")),
				isPaid: value<boolean>(entity, "isPaid") ?? false,
				paidAmount: String(value<number>(entity, "paidAmount") ?? 0),
				statementDate: new Date(value<string>(entity, "statementDate")),
				totalAmount: String(value<number>(entity, "totalAmount") ?? 0),
				updatedAt: new Date(),
			};
			if (existing)
				await executeStatement(
					db.sql.public.CreditCardStatement.update(values)
						.where((f, fn) => fn.and(fn.eq(f.id, id), fn.in(f.creditCardId, [...cardIds])))
						.build(),
				);
			else await executeStatement(db.sql.public.CreditCardStatement.insert([{ ...values, id }]).build());
			statementIds.add(id);
		});

		await sync("creditPurchases", body.creditPurchases, async entity => {
			const id = value<string>(entity, "id");
			const statementId = value<string>(entity, "statementId");
			if (!statementIds.has(statementId)) throw new Error(`Fatura ${statementId} indisponível`);
			const categoryId = value<string | undefined>(entity, "categoryId");
			const existing = await queryFirst(
				db.sql.public.CreditPurchase.select("id")
					.where((f, fn) => fn.eq(f.id, id))
					.limit(1)
					.build(),
			);
			const values = {
				categoryId: categoryId && categoryIds.has(categoryId) ? categoryId : undefined,
				currentInstallment: Number(value<number>(entity, "currentInstallment") ?? 1),
				description: value<string>(entity, "description"),
				installmentAmount: String(value<number>(entity, "installmentAmount")),
				installments: Number(value<number>(entity, "installments") ?? 1),
				parentId: undefined,
				purchaseDate: new Date(value<string>(entity, "purchaseDate")),
				statementId,
				totalAmount: String(value<number>(entity, "totalAmount")),
				updatedAt: new Date(),
			};
			if (existing)
				await executeStatement(
					db.sql.public.CreditPurchase.update(values)
						.where((f, fn) => fn.and(fn.eq(f.id, id), fn.in(f.statementId, [...statementIds])))
						.build(),
				);
			else await executeStatement(db.sql.public.CreditPurchase.insert([{ ...values, id }]).build());
		});

		await sync("debts", body.debts, async entity => {
			const id = value<string>(entity, "id");
			const existing = await queryFirst(
				db.sql.public.Debt.select("id", "userId")
					.where((f, fn) => fn.eq(f.id, id))
					.limit(1)
					.build(),
			);
			if (existing && existing.userId !== userId) throw new Error(`Dívida ${id} pertence a outro usuário`);
			const values = {
				amount: String(value<number>(entity, "amount")),
				date: new Date(value<string>(entity, "date")),
				description: value<string | undefined>(entity, "description"),
				dueDate: optionalDate(entity, "dueDate"),
				isOwedToMe: value<boolean>(entity, "isOwedToMe") ?? true,
				isPaid: value<boolean>(entity, "isPaid") ?? false,
				paidDate: optionalDate(entity, "paidDate"),
				personName: value<string>(entity, "personName"),
				updatedAt: new Date(),
			};
			if (existing)
				await executeStatement(
					db.sql.public.Debt.update(values as never)
						.where((f, fn) => fn.and(fn.eq(f.id, id), fn.eq(f.userId, userId)))
						.build(),
				);
			else await executeStatement(db.sql.public.Debt.insert([{ ...values, id, userId }] as never).build());
		});

		await sync("loans", body.loans, async entity => {
			const id = value<string>(entity, "id");
			const existing = await queryFirst(
				db.sql.public.Loan.select("id", "userId")
					.where((f, fn) => fn.eq(f.id, id))
					.limit(1)
					.build(),
			);
			if (existing && existing.userId !== userId)
				throw new Error(`Empréstimo ${id} pertence a outro usuário`);
			const values = {
				amortization: value<"PRICE" | "SAC" | "SACRE">(entity, "amortization") ?? "PRICE",
				description: value<string | undefined>(entity, "description"),
				dueDay: Number(value<number>(entity, "dueDay")),
				firstDueDate: new Date(value<string>(entity, "firstDueDate")),
				installmentAmount: String(value<number>(entity, "installmentAmount")),
				interestRate: String(value<number>(entity, "interestRate")),
				lender: value<string>(entity, "lender"),
				principalAmount: String(value<number>(entity, "principalAmount")),
				startDate: new Date(value<string>(entity, "startDate")),
				totalInstallments: Number(value<number>(entity, "totalInstallments")),
				updatedAt: new Date(),
			};
			if (existing)
				await executeStatement(
					db.sql.public.Loan.update(values)
						.where((f, fn) => fn.and(fn.eq(f.id, id), fn.eq(f.userId, userId)))
						.build(),
				);
			else await executeStatement(db.sql.public.Loan.insert([{ ...values, id, userId }]).build());
		});

		await sync("salaries", body.salaries, async entity => {
			const id = value<string>(entity, "id");
			const existing = await queryFirst(
				db.sql.public.Salary.select("id", "userId")
					.where((f, fn) => fn.eq(f.id, id))
					.limit(1)
					.build(),
			);
			if (existing && existing.userId !== userId) throw new Error(`Salário ${id} pertence a outro usuário`);
			const values = {
				endDate: optionalDate(entity, "endDate"),
				frequency:
					value<"BIWEEKLY" | "DAILY" | "MONTHLY" | "WEEKLY" | "YEARLY">(entity, "frequency") ?? "MONTHLY",
				grossAmount: String(value<number>(entity, "grossAmount")),
				isActive: value<boolean>(entity, "isActive") ?? true,
				netAmount: String(value<number>(entity, "netAmount")),
				payDay: Number(value<number>(entity, "payDay")),
				source: value<string>(entity, "source"),
				startDate: new Date(value<string>(entity, "startDate")),
				updatedAt: new Date(),
			};
			if (existing)
				await executeStatement(
					db.sql.public.Salary.update(values as never)
						.where((f, fn) => fn.and(fn.eq(f.id, id), fn.eq(f.userId, userId)))
						.build(),
				);
			else await executeStatement(db.sql.public.Salary.insert([{ ...values, id, userId }] as never).build());
		});

		await sync("subscriptions", body.subscriptions, async entity => {
			const id = value<string>(entity, "id");
			const existing = await queryFirst(
				db.sql.public.Subscription.select("id", "userId")
					.where((f, fn) => fn.eq(f.id, id))
					.limit(1)
					.build(),
			);
			if (existing && existing.userId !== userId)
				throw new Error(`Assinatura ${id} pertence a outro usuário`);
			const values = {
				amount: String(value<number>(entity, "amount")),
				billingDay: Number(value<number>(entity, "billingDay")),
				endDate: optionalDate(entity, "endDate"),
				frequency:
					value<"BIWEEKLY" | "DAILY" | "MONTHLY" | "WEEKLY" | "YEARLY">(entity, "frequency") ?? "MONTHLY",
				isActive: value<boolean>(entity, "isActive") ?? true,
				name: value<string>(entity, "name"),
				paymentMethod:
					value<"BOLETO" | "CASH" | "CREDIT" | "DEBIT" | "PIX" | "TRANSFER">(entity, "paymentMethod") ??
					"CREDIT",
				startDate: new Date(value<string>(entity, "startDate")),
				updatedAt: new Date(),
			};
			if (existing)
				await executeStatement(
					db.sql.public.Subscription.update(values as never)
						.where((f, fn) => fn.and(fn.eq(f.id, id), fn.eq(f.userId, userId)))
						.build(),
				);
			else
				await executeStatement(
					db.sql.public.Subscription.insert([{ ...values, id, userId }] as never).build(),
				);
		});

		await sync("transactions", body.transactions, async entity => {
			const id = value<string>(entity, "id");
			const originFinancialAccountId = value<string | undefined>(entity, "originFinancialAccountId");
			const destinationFinancialAccountId = value<string | undefined>(
				entity,
				"destinationFinancialAccountId",
			);
			const recurrenceId = value<string | undefined>(entity, "recurrenceId");
			if (originFinancialAccountId && !accountIds.has(originFinancialAccountId))
				throw new Error(`Conta de origem ${originFinancialAccountId} indisponível`);
			if (destinationFinancialAccountId && !accountIds.has(destinationFinancialAccountId))
				throw new Error(`Conta de destino ${destinationFinancialAccountId} indisponível`);
			if (recurrenceId && !recurringIds.has(recurrenceId))
				throw new Error(`Recorrência ${recurrenceId} indisponível`);
			const existing = await queryFirst(
				db.sql.public.Transaction.select("id")
					.where((f, fn) => fn.eq(f.id, id))
					.limit(1)
					.build(),
			);
			if (existing) return;
			const categoryId = value<string | undefined>(entity, "categoryId");
			await executeStatement(
				db.sql.public.Transaction.insert([
					{
						amount: String(value<number>(entity, "amount")),
						categoryId: categoryId && categoryIds.has(categoryId) ? categoryId : undefined,
						date: new Date(value<string>(entity, "date")),
						description: value<string | undefined>(entity, "description"),
						destinationFinancialAccountId,
						id,
						originFinancialAccountId,
						recurrenceId,
						type: value<"EXPENSE" | "INCOME" | "TRANSFER">(entity, "type") ?? "EXPENSE",
					},
				]).build(),
			);
		});

		const financialAccounts = await queryRows(
			db.sql.public.FinancialAccount.select(...accountColumns)
				.where((f, fn) => fn.eq(f.userId, userId))
				.build(),
		);
		const serverAccountIds = financialAccounts.map(account => account.id);
		const creditCards = serverAccountIds.length
			? await queryRows(
					db.sql.public.CreditCard.select(...cardColumns)
						.where((f, fn) => fn.in(f.financialAccountId, serverAccountIds))
						.build(),
				)
			: [];
		const serverCardIds = creditCards.map(card => card.id);
		const creditCardStatements = serverCardIds.length
			? await queryRows(
					db.sql.public.CreditCardStatement.select(...statementColumns)
						.where((f, fn) => fn.in(f.creditCardId, serverCardIds))
						.build(),
				)
			: [];
		const serverStatementIds = creditCardStatements.map(statement => statement.id);
		const creditPurchases = serverStatementIds.length
			? await queryRows(
					db.sql.public.CreditPurchase.select(...purchaseColumns)
						.where((f, fn) => fn.in(f.statementId, serverStatementIds))
						.build(),
				)
			: [];
		const transactions = serverAccountIds.length
			? await queryRows(
					db.sql.public.Transaction.select(...transactionColumns)
						.where((f, fn) =>
							fn.or(
								fn.in(f.originFinancialAccountId, serverAccountIds),
								fn.in(f.destinationFinancialAccountId, serverAccountIds),
							),
						)
						.build(),
				)
			: [];

		return {
			serverData: {
				categories: await queryRows(
					db.sql.public.Category.select(...categoryColumns)
						.where((f, fn) => fn.eq(f.userId, userId))
						.build(),
				),
				creditCardStatements,
				creditCards,
				creditPurchases,
				debts: await queryRows(
					db.sql.public.Debt.select(
						"id",
						"userId",
						"personName",
						"amount",
						"description",
						"isOwedToMe",
						"date",
						"dueDate",
						"isPaid",
						"paidDate",
						"createdAt",
						"updatedAt",
					)
						.where((f, fn) => fn.eq(f.userId, userId))
						.build(),
				),
				financialAccounts,
				loans: await queryRows(
					db.sql.public.Loan.select(
						"id",
						"userId",
						"lender",
						"principalAmount",
						"interestRate",
						"totalInstallments",
						"installmentAmount",
						"dueDay",
						"startDate",
						"firstDueDate",
						"description",
						"amortization",
						"createdAt",
						"updatedAt",
					)
						.where((f, fn) => fn.eq(f.userId, userId))
						.build(),
				),
				recurringPayments: await queryRows(
					db.sql.public.RecurringPayment.select(
						"id",
						"userId",
						"name",
						"amount",
						"frequency",
						"dayOfMonth",
						"dayOfWeek",
						"startDate",
						"endDate",
						"categoryId",
						"paymentMethod",
						"isActive",
						"createdAt",
						"updatedAt",
					)
						.where((f, fn) => fn.eq(f.userId, userId))
						.build(),
				),
				salaries: await queryRows(
					db.sql.public.Salary.select(
						"id",
						"userId",
						"source",
						"grossAmount",
						"netAmount",
						"frequency",
						"payDay",
						"startDate",
						"endDate",
						"isActive",
						"createdAt",
						"updatedAt",
					)
						.where((f, fn) => fn.eq(f.userId, userId))
						.build(),
				),
				subscriptions: await queryRows(
					db.sql.public.Subscription.select(
						"id",
						"userId",
						"name",
						"amount",
						"billingDay",
						"frequency",
						"paymentMethod",
						"startDate",
						"endDate",
						"isActive",
						"createdAt",
						"updatedAt",
					)
						.where((f, fn) => fn.eq(f.userId, userId))
						.build(),
				),
				transactions,
			},
			syncResults,
		};
	},
	{ body: SyncBody, detail: { tags: ["Sync"] }, response: SyncReturn },
);
