import Elysia from "elysia";
import { resolveFinancialInstitution } from "~/modules/accounts/application/resolve-financial-institution";
import { requireUserId } from "~/modules/auth";
import {
	getTagsByEntity,
	normalizeTagIds,
	replaceEntityTags,
	tagEntityType,
} from "~/modules/categories/application/tag-assignments";
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
const entityTagIds = (entity: InputEntity) =>
	normalizeTagIds(
		value<string[] | undefined>(entity, "tagIds") ??
			(value<string | undefined>(entity, "categoryId") ? [value<string>(entity, "categoryId")] : []),
	);

const accountColumns = [
	"id",
	"userId",
	"name",
	"type",
	"balance",
	"institutionId",
	"createdAt",
	"updatedAt",
] as const;
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
	"excludeFromTotals",
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
	"salaryId",
	"salaryOccurrenceDate",
	"subscriptionId",
	"subscriptionOccurrenceDate",
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
		const salaryIds = new Set<string>();
		const subscriptionIds = new Set<string>();
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
			const institutionInput = value<{ name?: string } | null | undefined>(entity, "institution");
			const institution = await resolveFinancialInstitution(
				userId,
				value<string | undefined>(entity, "institutionName") ?? institutionInput?.name,
			);
			const values = {
				balance: nullableNumeric<12, 2>(
					type === "CREDIT_CARD" ? null : (value<number>(entity, "balance") ?? 0),
				),
				institutionId: institution?.id,
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
			const tagIds = entityTagIds(entity);
			if (tagIds.some(tagId => !categoryIds.has(tagId)))
				throw new Error("Uma ou mais tags estão indisponíveis");
			const financialAccountId = value<string | undefined>(entity, "financialAccountId");
			if (financialAccountId && !accountIds.has(financialAccountId))
				throw new Error(`Conta financeira ${financialAccountId} indisponível`);
			const values = {
				amount: String(value<number>(entity, "amount")),
				categoryId: tagIds[0],
				dayOfMonth:
					value<number | undefined>(entity, "dayOfMonth") ?? value<number | undefined>(entity, "day"),
				dayOfWeek: value<number | undefined>(entity, "dayOfWeek"),
				endDate: optionalDate(entity, "endDate"),
				financialAccountId,
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
			await replaceEntityTags({
				entityIds: [id],
				entityType: tagEntityType.recurringPayment,
				tagIds,
			});
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
				excludeFromTotals: value<boolean>(entity, "excludeFromTotals") ?? false,
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
			const tagIds = entityTagIds(entity).filter(tagId => categoryIds.has(tagId));
			const existing = await queryFirst(
				db.sql.public.CreditPurchase.select("id")
					.where((f, fn) => fn.eq(f.id, id))
					.limit(1)
					.build(),
			);
			const values = {
				categoryId: tagIds[0],
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
			await replaceEntityTags({
				entityIds: [id],
				entityType: tagEntityType.creditPurchase,
				tagIds,
			});
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
			const tagIds = entityTagIds(entity);
			if (tagIds.some(tagId => !categoryIds.has(tagId)))
				throw new Error("Uma ou mais tags estão indisponíveis");
			const existing = await queryFirst(
				db.sql.public.Salary.select("id", "userId")
					.where((f, fn) => fn.eq(f.id, id))
					.limit(1)
					.build(),
			);
			if (existing && existing.userId !== userId) throw new Error(`Salário ${id} pertence a outro usuário`);
			const financialAccountId = value<string | undefined>(entity, "financialAccountId");
			if (financialAccountId && !accountIds.has(financialAccountId))
				throw new Error(`Conta financeira ${financialAccountId} indisponível`);
			const values = {
				amount: String(value<number>(entity, "amount")),
				autoGenerateFrom: new Date(
					value<string | undefined>(entity, "autoGenerateFrom") ?? value<string>(entity, "startDate"),
				),
				endDate: optionalDate(entity, "endDate"),
				financialAccountId,
				frequency:
					value<"BIWEEKLY" | "DAILY" | "MONTHLY" | "WEEKLY" | "YEARLY">(entity, "frequency") ?? "MONTHLY",
				isActive: value<boolean>(entity, "isActive") ?? true,
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
			salaryIds.add(id);
			await replaceEntityTags({ entityIds: [id], entityType: tagEntityType.salary, tagIds });
		});

		await sync("subscriptions", body.subscriptions, async entity => {
			const id = value<string>(entity, "id");
			const tagIds = entityTagIds(entity);
			if (tagIds.some(tagId => !categoryIds.has(tagId)))
				throw new Error("Uma ou mais tags estão indisponíveis");
			const existing = await queryFirst(
				db.sql.public.Subscription.select("id", "userId")
					.where((f, fn) => fn.eq(f.id, id))
					.limit(1)
					.build(),
			);
			if (existing && existing.userId !== userId)
				throw new Error(`Assinatura ${id} pertence a outro usuário`);
			const financialAccountId = value<string | undefined>(entity, "financialAccountId");
			if (financialAccountId && !accountIds.has(financialAccountId))
				throw new Error(`Conta financeira ${financialAccountId} indisponível`);
			const values = {
				amount: String(value<number>(entity, "amount")),
				billingDay: Number(value<number>(entity, "billingDay")),
				endDate: optionalDate(entity, "endDate"),
				financialAccountId,
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
			subscriptionIds.add(id);
			await replaceEntityTags({ entityIds: [id], entityType: tagEntityType.subscription, tagIds });
		});

		await sync("transactions", body.transactions, async entity => {
			const id = value<string>(entity, "id");
			const originFinancialAccountId = value<string | undefined>(entity, "originFinancialAccountId");
			const destinationFinancialAccountId = value<string | undefined>(
				entity,
				"destinationFinancialAccountId",
			);
			const recurrenceId = value<string | undefined>(entity, "recurrenceId");
			const salaryId = value<string | undefined>(entity, "salaryId");
			const subscriptionId = value<string | undefined>(entity, "subscriptionId");
			if (originFinancialAccountId && !accountIds.has(originFinancialAccountId))
				throw new Error(`Conta de origem ${originFinancialAccountId} indisponível`);
			if (destinationFinancialAccountId && !accountIds.has(destinationFinancialAccountId))
				throw new Error(`Conta de destino ${destinationFinancialAccountId} indisponível`);
			if (recurrenceId && !recurringIds.has(recurrenceId))
				throw new Error(`Recorrência ${recurrenceId} indisponível`);
			if (salaryId && !salaryIds.has(salaryId)) throw new Error(`Salário ${salaryId} indisponível`);
			if (subscriptionId && !subscriptionIds.has(subscriptionId))
				throw new Error(`Assinatura ${subscriptionId} indisponível`);
			const existing = await queryFirst(
				db.sql.public.Transaction.select("id")
					.where((f, fn) => fn.eq(f.id, id))
					.limit(1)
					.build(),
			);
			const tagIds = entityTagIds(entity).filter(tagId => categoryIds.has(tagId));
			if (!existing) {
				await executeStatement(
					db.sql.public.Transaction.insert([
						{
							amount: String(value<number>(entity, "amount")),
							categoryId: tagIds[0],
							date: new Date(value<string>(entity, "date")),
							description: value<string | undefined>(entity, "description"),
							destinationFinancialAccountId,
							id,
							originFinancialAccountId,
							recurrenceId,
							salaryId,
							salaryOccurrenceDate: optionalDate(entity, "salaryOccurrenceDate"),
							subscriptionId,
							subscriptionOccurrenceDate: optionalDate(entity, "subscriptionOccurrenceDate"),
							type: value<"EXPENSE" | "INCOME" | "TRANSFER">(entity, "type") ?? "EXPENSE",
						},
					]).build(),
				);
			}
			await replaceEntityTags({
				entityIds: [id],
				entityType: tagEntityType.transaction,
				tagIds,
			});
		});

		const financialAccounts = await queryRows(
			db.sql.public.FinancialAccount.select(...accountColumns)
				.where((f, fn) => fn.eq(f.userId, userId))
				.build(),
		);
		const financialInstitutions = await queryRows(
			db.sql.public.FinancialInstitution.select("id", "name")
				.where((f, fn) => fn.eq(f.userId, userId))
				.build(),
		);
		const institutionsById = new Map(financialInstitutions.map(institution => [institution.id, institution]));
		const financialAccountsWithInstitutions = financialAccounts.map(account => ({
			...account,
			institution: account.institutionId ? (institutionsById.get(account.institutionId) ?? null) : null,
		}));
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
		let transactionQueryBuilder = db.sql.public.Transaction.outerLeftJoin(
			db.sql.public.RecurringPayment,
			(f, fn) => fn.eq(f.Transaction.recurrenceId, f.RecurringPayment.id),
		)
			.outerLeftJoin(db.sql.public.Salary, (f, fn) => fn.eq(f.Transaction.salaryId, f.Salary.id))
			.outerLeftJoin(db.sql.public.Subscription, (f, fn) =>
				fn.eq(f.Transaction.subscriptionId, f.Subscription.id),
			)
			.select(f => ({
				amount: f.Transaction.amount,
				categoryId: f.Transaction.categoryId,
				createdAt: f.Transaction.createdAt,
				date: f.Transaction.date,
				description: f.Transaction.description,
				destinationFinancialAccountId: f.Transaction.destinationFinancialAccountId,
				id: f.Transaction.id,
				originFinancialAccountId: f.Transaction.originFinancialAccountId,
				recurrenceId: f.Transaction.recurrenceId,
				salaryId: f.Transaction.salaryId,
				salaryOccurrenceDate: f.Transaction.salaryOccurrenceDate,
				subscriptionId: f.Transaction.subscriptionId,
				subscriptionOccurrenceDate: f.Transaction.subscriptionOccurrenceDate,
				type: f.Transaction.type,
				updatedAt: f.Transaction.updatedAt,
			}));
		if (serverAccountIds.length) {
			transactionQueryBuilder = transactionQueryBuilder.where((f, fn) =>
				fn.or(
					fn.in(f.originFinancialAccountId, serverAccountIds),
					fn.in(f.destinationFinancialAccountId, serverAccountIds),
					fn.eq(f.RecurringPayment.userId, userId),
					fn.eq(f.Salary.userId, userId),
					fn.eq(f.Subscription.userId, userId),
				),
			);
		} else {
			transactionQueryBuilder = transactionQueryBuilder.where((f, fn) =>
				fn.or(
					fn.eq(f.RecurringPayment.userId, userId),
					fn.eq(f.Salary.userId, userId),
					fn.eq(f.Subscription.userId, userId),
				),
			);
		}
		const transactions = await queryRows(transactionQueryBuilder.build());
		const recurringPayments = await queryRows(
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
				"financialAccountId",
				"paymentMethod",
				"isActive",
				"createdAt",
				"updatedAt",
			)
				.where((f, fn) => fn.eq(f.userId, userId))
				.build(),
		);
		const [purchaseTags, recurringTags, salaryTags, subscriptionTags, transactionTags] = await Promise.all([
			getTagsByEntity(
				tagEntityType.creditPurchase,
				creditPurchases.map(purchase => purchase.id),
			),
			getTagsByEntity(
				tagEntityType.recurringPayment,
				recurringPayments.map(payment => payment.id),
			),
			getTagsByEntity(
				tagEntityType.salary,
				(
					await queryRows(
						db.sql.public.Salary.select("id")
							.where((f, fn) => fn.eq(f.userId, userId))
							.build(),
					)
				).map(salary => salary.id),
			),
			getTagsByEntity(
				tagEntityType.subscription,
				(
					await queryRows(
						db.sql.public.Subscription.select("id")
							.where((f, fn) => fn.eq(f.userId, userId))
							.build(),
					)
				).map(subscription => subscription.id),
			),
			getTagsByEntity(
				tagEntityType.transaction,
				transactions.map(transaction => transaction.id),
			),
		]);

		return {
			serverData: {
				categories: await queryRows(
					db.sql.public.Category.select(...categoryColumns)
						.where((f, fn) => fn.eq(f.userId, userId))
						.build(),
				),
				creditCardStatements,
				creditCards,
				creditPurchases: creditPurchases.map(purchase => ({
					...purchase,
					tagIds: (purchaseTags.get(purchase.id) ?? []).map(tag => tag.id),
					tags: purchaseTags.get(purchase.id) ?? [],
				})),
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
				financialAccounts: financialAccountsWithInstitutions,
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
				recurringPayments: recurringPayments.map(payment => ({
					...payment,
					tagIds: (recurringTags.get(payment.id) ?? []).map(tag => tag.id),
					tags: recurringTags.get(payment.id) ?? [],
				})),
				salaries: (
					await queryRows(
						db.sql.public.Salary.select(
							"id",
							"userId",
							"financialAccountId",
							"source",
							"amount",
							"frequency",
							"payDay",
							"startDate",
							"autoGenerateFrom",
							"endDate",
							"isActive",
							"createdAt",
							"updatedAt",
						)
							.where((f, fn) => fn.eq(f.userId, userId))
							.build(),
					)
				).map(salary => ({
					...salary,
					tagIds: (salaryTags.get(salary.id) ?? []).map(tag => tag.id),
					tags: salaryTags.get(salary.id) ?? [],
				})),
				subscriptions: (
					await queryRows(
						db.sql.public.Subscription.select(
							"id",
							"userId",
							"name",
							"amount",
							"billingDay",
							"frequency",
							"paymentMethod",
							"financialAccountId",
							"startDate",
							"endDate",
							"isActive",
							"createdAt",
							"updatedAt",
						)
							.where((f, fn) => fn.eq(f.userId, userId))
							.build(),
					)
				).map(subscription => ({
					...subscription,
					tagIds: (subscriptionTags.get(subscription.id) ?? []).map(tag => tag.id),
					tags: subscriptionTags.get(subscription.id) ?? [],
				})),
				transactions: transactions.map(transaction => ({
					...transaction,
					tagIds: (transactionTags.get(transaction.id) ?? []).map(tag => tag.id),
					tags: transactionTags.get(transaction.id) ?? [],
				})),
			},
			syncResults,
		};
	},
	{ body: SyncBody, detail: { tags: ["Sync"] }, response: SyncReturn },
);
