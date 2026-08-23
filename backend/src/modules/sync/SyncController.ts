import Elysia from "elysia";
import { requireUserId } from "~/modules/auth";
import { db } from "~/shared/infra/sql";
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
			const existing = await db
				.selectFrom("FinancialAccount")
				.select(["id", "userId"])
				.where("id", "=", id)
				.executeTakeFirst();
			if (existing && existing.userId !== userId)
				throw new Error(`Conta financeira ${id} pertence a outro usuário`);
			const values = {
				balance: Number(value<number>(entity, "balance") ?? 0),
				name: value<string>(entity, "name"),
				type:
					value<"CASH" | "CHECKING" | "CREDIT_CARD" | "INVESTMENT" | "SAVINGS">(entity, "type") ?? "CHECKING",
				updatedAt: new Date(),
			};
			if (existing)
				await db
					.updateTable("FinancialAccount")
					.set(values)
					.where("id", "=", id)
					.where("userId", "=", userId)
					.execute();
			else
				await db
					.insertInto("FinancialAccount")
					.values({ ...values, id, userId })
					.execute();
			accountIds.add(id);
		});

		await sync("categories", body.categories, async entity => {
			const id = value<string>(entity, "id");
			const existing = await db
				.selectFrom("Category")
				.select(["id", "userId"])
				.where("id", "=", id)
				.executeTakeFirst();
			if (existing && existing.userId !== userId) throw new Error(`Categoria ${id} pertence a outro usuário`);
			const values = {
				color: value<string | undefined>(entity, "color"),
				icon: value<string | undefined>(entity, "icon"),
				name: value<string>(entity, "name"),
				updatedAt: new Date(),
			};
			if (existing)
				await db
					.updateTable("Category")
					.set(values)
					.where("id", "=", id)
					.where("userId", "=", userId)
					.execute();
			else
				await db
					.insertInto("Category")
					.values({ ...values, id, userId })
					.execute();
			categoryIds.add(id);
		});

		await sync("recurringPayments", body.recurringPayments, async entity => {
			const id = value<string>(entity, "id");
			const existing = await db
				.selectFrom("RecurringPayment")
				.select(["id", "userId"])
				.where("id", "=", id)
				.executeTakeFirst();
			if (existing && existing.userId !== userId)
				throw new Error(`Recorrência ${id} pertence a outro usuário`);
			const categoryId = value<string | undefined>(entity, "categoryId");
			if (categoryId && !categoryIds.has(categoryId)) throw new Error(`Categoria ${categoryId} indisponível`);
			const values = {
				amount: Number(value<number>(entity, "amount")),
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
				await db
					.updateTable("RecurringPayment")
					.set(values)
					.where("id", "=", id)
					.where("userId", "=", userId)
					.execute();
			else
				await db
					.insertInto("RecurringPayment")
					.values({ ...values, id, userId })
					.execute();
			recurringIds.add(id);
		});

		await sync("creditCards", body.creditCards, async entity => {
			const id = value<string>(entity, "id");
			const financialAccountId = value<string>(entity, "financialAccountId");
			if (!accountIds.has(financialAccountId))
				throw new Error(`Conta financeira ${financialAccountId} indisponível`);
			const existing = await db.selectFrom("CreditCard").select("id").where("id", "=", id).executeTakeFirst();
			const values = {
				creditLimit: Number(value<number>(entity, "creditLimit")),
				dueDay: Number(value<number>(entity, "dueDay")),
				financialAccountId,
				statementDay: Number(value<number>(entity, "statementDay")),
				updatedAt: new Date(),
				workingDueDate: value<boolean>(entity, "workingDueDate") ?? false,
			};
			if (existing)
				await db
					.updateTable("CreditCard")
					.set(values)
					.where("id", "=", id)
					.where("financialAccountId", "in", [...accountIds])
					.execute();
			else
				await db
					.insertInto("CreditCard")
					.values({ ...values, id })
					.execute();
			cardIds.add(id);
		});

		await sync("creditCardStatements", body.creditCardStatements, async entity => {
			const id = value<string>(entity, "id");
			const creditCardId = value<string>(entity, "creditCardId");
			if (!cardIds.has(creditCardId)) throw new Error(`Cartão ${creditCardId} indisponível`);
			const existing = await db
				.selectFrom("CreditCardStatement")
				.select("id")
				.where("id", "=", id)
				.executeTakeFirst();
			const values = {
				creditCardId,
				dueDate: new Date(value<string>(entity, "dueDate")),
				isPaid: value<boolean>(entity, "isPaid") ?? false,
				paidAmount: Number(value<number>(entity, "paidAmount") ?? 0),
				statementDate: new Date(value<string>(entity, "statementDate")),
				totalAmount: Number(value<number>(entity, "totalAmount") ?? 0),
				updatedAt: new Date(),
			};
			if (existing)
				await db
					.updateTable("CreditCardStatement")
					.set(values)
					.where("id", "=", id)
					.where("creditCardId", "in", [...cardIds])
					.execute();
			else
				await db
					.insertInto("CreditCardStatement")
					.values({ ...values, id })
					.execute();
			statementIds.add(id);
		});

		await sync("creditPurchases", body.creditPurchases, async entity => {
			const id = value<string>(entity, "id");
			const statementId = value<string>(entity, "statementId");
			if (!statementIds.has(statementId)) throw new Error(`Fatura ${statementId} indisponível`);
			const categoryId = value<string | undefined>(entity, "categoryId");
			const existing = await db
				.selectFrom("CreditPurchase")
				.select("id")
				.where("id", "=", id)
				.executeTakeFirst();
			const values = {
				categoryId: categoryId && categoryIds.has(categoryId) ? categoryId : undefined,
				currentInstallment: Number(value<number>(entity, "currentInstallment") ?? 1),
				description: value<string>(entity, "description"),
				installmentAmount: Number(value<number>(entity, "installmentAmount")),
				installments: Number(value<number>(entity, "installments") ?? 1),
				parentId: undefined,
				purchaseDate: new Date(value<string>(entity, "purchaseDate")),
				statementId,
				totalAmount: Number(value<number>(entity, "totalAmount")),
				updatedAt: new Date(),
			};
			if (existing)
				await db
					.updateTable("CreditPurchase")
					.set(values)
					.where("id", "=", id)
					.where("statementId", "in", [...statementIds])
					.execute();
			else
				await db
					.insertInto("CreditPurchase")
					.values({ ...values, id })
					.execute();
		});

		await sync("debts", body.debts, async entity => {
			const id = value<string>(entity, "id");
			const existing = await db
				.selectFrom("Debt")
				.select(["id", "userId"])
				.where("id", "=", id)
				.executeTakeFirst();
			if (existing && existing.userId !== userId) throw new Error(`Dívida ${id} pertence a outro usuário`);
			const values = {
				amount: Number(value<number>(entity, "amount")),
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
				await db.updateTable("Debt").set(values).where("id", "=", id).where("userId", "=", userId).execute();
			else
				await db
					.insertInto("Debt")
					.values({ ...values, id, userId })
					.execute();
		});

		await sync("loans", body.loans, async entity => {
			const id = value<string>(entity, "id");
			const existing = await db
				.selectFrom("Loan")
				.select(["id", "userId"])
				.where("id", "=", id)
				.executeTakeFirst();
			if (existing && existing.userId !== userId)
				throw new Error(`Empréstimo ${id} pertence a outro usuário`);
			const values = {
				amortization: value<"PRICE" | "SAC" | "SACRE">(entity, "amortization") ?? "PRICE",
				description: value<string | undefined>(entity, "description"),
				dueDay: Number(value<number>(entity, "dueDay")),
				firstDueDate: new Date(value<string>(entity, "firstDueDate")),
				installmentAmount: Number(value<number>(entity, "installmentAmount")),
				interestRate: Number(value<number>(entity, "interestRate")),
				lender: value<string>(entity, "lender"),
				principalAmount: Number(value<number>(entity, "principalAmount")),
				startDate: new Date(value<string>(entity, "startDate")),
				totalInstallments: Number(value<number>(entity, "totalInstallments")),
				updatedAt: new Date(),
			};
			if (existing)
				await db.updateTable("Loan").set(values).where("id", "=", id).where("userId", "=", userId).execute();
			else
				await db
					.insertInto("Loan")
					.values({ ...values, id, userId })
					.execute();
		});

		await sync("salaries", body.salaries, async entity => {
			const id = value<string>(entity, "id");
			const existing = await db
				.selectFrom("Salary")
				.select(["id", "userId"])
				.where("id", "=", id)
				.executeTakeFirst();
			if (existing && existing.userId !== userId) throw new Error(`Salário ${id} pertence a outro usuário`);
			const values = {
				endDate: optionalDate(entity, "endDate"),
				frequency:
					value<"BIWEEKLY" | "DAILY" | "MONTHLY" | "WEEKLY" | "YEARLY">(entity, "frequency") ?? "MONTHLY",
				grossAmount: Number(value<number>(entity, "grossAmount")),
				isActive: value<boolean>(entity, "isActive") ?? true,
				netAmount: Number(value<number>(entity, "netAmount")),
				payDay: Number(value<number>(entity, "payDay")),
				source: value<string>(entity, "source"),
				startDate: new Date(value<string>(entity, "startDate")),
				updatedAt: new Date(),
			};
			if (existing)
				await db
					.updateTable("Salary")
					.set(values)
					.where("id", "=", id)
					.where("userId", "=", userId)
					.execute();
			else
				await db
					.insertInto("Salary")
					.values({ ...values, id, userId })
					.execute();
		});

		await sync("subscriptions", body.subscriptions, async entity => {
			const id = value<string>(entity, "id");
			const existing = await db
				.selectFrom("Subscription")
				.select(["id", "userId"])
				.where("id", "=", id)
				.executeTakeFirst();
			if (existing && existing.userId !== userId)
				throw new Error(`Assinatura ${id} pertence a outro usuário`);
			const values = {
				amount: Number(value<number>(entity, "amount")),
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
				await db
					.updateTable("Subscription")
					.set(values)
					.where("id", "=", id)
					.where("userId", "=", userId)
					.execute();
			else
				await db
					.insertInto("Subscription")
					.values({ ...values, id, userId })
					.execute();
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
			const existing = await db
				.selectFrom("Transaction")
				.select("id")
				.where("id", "=", id)
				.executeTakeFirst();
			if (existing) return;
			const categoryId = value<string | undefined>(entity, "categoryId");
			await db
				.insertInto("Transaction")
				.values({
					amount: Number(value<number>(entity, "amount")),
					categoryId: categoryId && categoryIds.has(categoryId) ? categoryId : undefined,
					date: new Date(value<string>(entity, "date")),
					description: value<string | undefined>(entity, "description"),
					destinationFinancialAccountId,
					id,
					originFinancialAccountId,
					recurrenceId,
					type: value<"EXPENSE" | "INCOME" | "TRANSFER">(entity, "type") ?? "EXPENSE",
				})
				.execute();
		});

		const financialAccounts = await db
			.selectFrom("FinancialAccount")
			.selectAll()
			.where("userId", "=", userId)
			.execute();
		const serverAccountIds = financialAccounts.map(account => account.id);
		const creditCards = serverAccountIds.length
			? await db
					.selectFrom("CreditCard")
					.selectAll()
					.where("financialAccountId", "in", serverAccountIds)
					.execute()
			: [];
		const serverCardIds = creditCards.map(card => card.id);
		const creditCardStatements = serverCardIds.length
			? await db
					.selectFrom("CreditCardStatement")
					.selectAll()
					.where("creditCardId", "in", serverCardIds)
					.execute()
			: [];
		const serverStatementIds = creditCardStatements.map(statement => statement.id);
		const creditPurchases = serverStatementIds.length
			? await db
					.selectFrom("CreditPurchase")
					.selectAll()
					.where("statementId", "in", serverStatementIds)
					.execute()
			: [];
		const transactions = serverAccountIds.length
			? await db
					.selectFrom("Transaction")
					.selectAll()
					.where(eb =>
						eb.or([
							eb("originFinancialAccountId", "in", serverAccountIds),
							eb("destinationFinancialAccountId", "in", serverAccountIds),
						]),
					)
					.execute()
			: [];

		return {
			serverData: {
				categories: await db.selectFrom("Category").selectAll().where("userId", "=", userId).execute(),
				creditCardStatements,
				creditCards,
				creditPurchases,
				debts: await db.selectFrom("Debt").selectAll().where("userId", "=", userId).execute(),
				financialAccounts,
				loans: await db.selectFrom("Loan").selectAll().where("userId", "=", userId).execute(),
				recurringPayments: await db
					.selectFrom("RecurringPayment")
					.selectAll()
					.where("userId", "=", userId)
					.execute(),
				salaries: await db.selectFrom("Salary").selectAll().where("userId", "=", userId).execute(),
				subscriptions: await db.selectFrom("Subscription").selectAll().where("userId", "=", userId).execute(),
				transactions,
			},
			syncResults,
		};
	},
	{ body: SyncBody, detail: { tags: ["Sync"] }, response: SyncReturn },
);
