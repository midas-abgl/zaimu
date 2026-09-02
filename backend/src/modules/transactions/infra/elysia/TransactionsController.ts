import Elysia, { t } from "elysia";
import {
	assertBalanceAccountOwnership,
	assertDirectOwnership,
	assertTransactionOwnership,
	requireUserId,
} from "~/modules/auth";
import {
	assertTagOwnership,
	getTagsByEntity,
	replaceEntityTags,
	tagEntityType,
} from "~/modules/categories/application/tag-assignments";
import {
	debtRefsForPurchases,
	debtRefsForTransactions,
	deleteCreatorDebtEventForTransaction,
	linkTransactionToDebt,
	syncTransactionDebtEvent,
} from "~/modules/debts/application";
import { materializeSalaryTransactions } from "~/modules/salaries/application/materialize-salary-transactions";
import { resolveStore } from "~/modules/stores/application/resolve-store";
import { HttpException } from "~/shared/errors";
import { db, executeStatement, queryFirst, queryRows } from "~/shared/infra/sql";

const transactionColumns = [
	"id",
	"amount",
	"date",
	"time",
	"description",
	"storeName",
	"type",
	"categoryId",
	"recurrenceId",
	"recurrenceOccurrenceDate",
	"salaryId",
	"salaryOccurrenceDate",
	"subscriptionId",
	"subscriptionOccurrenceDate",
	"originFinancialAccountId",
	"destinationFinancialAccountId",
	"createdAt",
	"updatedAt",
] as const;

const TransactionType = t.Union([t.Literal("INCOME"), t.Literal("EXPENSE"), t.Literal("TRANSFER")]);
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

function resolveTransactionTime(value: string | null | undefined): string | null {
	if (value === null) return null;
	if (value !== undefined) {
		if (!timePattern.test(value)) throw new HttpException("Informe um horário válido", 400);
		return value;
	}
	return new Date().toTimeString().slice(0, 5);
}

export const TransactionsController = new Elysia({ prefix: "/transactions" })
	.get(
		"/",
		async ({ query, request }) => {
			const userId = await requireUserId(request);
			await materializeSalaryTransactions(userId);
			if (query.financialAccountId) {
				await assertDirectOwnership("FinancialAccount", query.financialAccountId, userId);
			}
			if (query.categoryId) await assertDirectOwnership("Category", query.categoryId, userId);
			const origin = db.sql.public.FinancialAccount.select(
				"id",
				"institutionId",
				"userId",
				"name",
				"type",
			).as("origin");
			const originInstitution = db.sql.public.FinancialInstitution.select("id", "name").as(
				"originInstitution",
			);
			const destination = db.sql.public.FinancialAccount.select(
				"id",
				"institutionId",
				"userId",
				"name",
				"type",
			).as("destination");
			const destinationInstitution = db.sql.public.FinancialInstitution.select("id", "name").as(
				"destinationInstitution",
			);
			const taggedTransactionIds = query.categoryId
				? (
						await queryRows(
							db.sql.public.TagAssignment.select("entityId")
								.where((fields, functions) =>
									functions.and(
										functions.eq(fields.categoryId, query.categoryId!),
										functions.eq(fields.entityType, tagEntityType.transaction),
									),
								)
								.build(),
						)
					).map(assignment => assignment.entityId)
				: undefined;
			let queryBuilder = db.sql.public.Transaction.outerLeftJoin(db.sql.public.Category, (f, fn) =>
				fn.eq(f.Transaction.categoryId, f.Category.id),
			)
				.outerLeftJoin(origin, (f, fn) => fn.eq(f.Transaction.originFinancialAccountId, f.origin.id))
				.outerLeftJoin(originInstitution, (f, fn) => fn.eq(f.origin.institutionId, f.originInstitution.id))
				.outerLeftJoin(destination, (f, fn) =>
					fn.eq(f.Transaction.destinationFinancialAccountId, f.destination.id),
				)
				.outerLeftJoin(destinationInstitution, (f, fn) =>
					fn.eq(f.destination.institutionId, f.destinationInstitution.id),
				)
				.outerLeftJoin(db.sql.public.RecurringPayment, (f, fn) =>
					fn.eq(f.Transaction.recurrenceId, f.RecurringPayment.id),
				)
				.outerLeftJoin(db.sql.public.Salary, (f, fn) => fn.eq(f.Transaction.salaryId, f.Salary.id))
				.outerLeftJoin(db.sql.public.Subscription, (f, fn) =>
					fn.eq(f.Transaction.subscriptionId, f.Subscription.id),
				)
				.select((f, fn) => ({
					amount: f.Transaction.amount,
					categoryColor: f.Category.color,
					categoryName: f.Category.name,
					createdAt: f.Transaction.createdAt,
					date: f.Transaction.date,
					description: f.Transaction.description,
					destinationAccountType: f.destination.type,
					destinationFinancialAccountId: f.Transaction.destinationFinancialAccountId,
					destinationName: fn.raw`COALESCE(${f.destination.name}, ${f.destinationInstitution.name})`.returns(
						"sql/varchar@1",
					),
					id: f.Transaction.id,
					originAccountType: f.origin.type,
					originFinancialAccountId: f.Transaction.originFinancialAccountId,
					originName: fn.raw`COALESCE(${f.origin.name}, ${f.originInstitution.name})`.returns(
						"sql/varchar@1",
					),
					recurrenceId: f.Transaction.recurrenceId,
					recurrenceOccurrenceDate: f.Transaction.recurrenceOccurrenceDate,
					salaryId: f.Transaction.salaryId,
					salaryOccurrenceDate: f.Transaction.salaryOccurrenceDate,
					storeName: f.Transaction.storeName,
					subscriptionId: f.Transaction.subscriptionId,
					subscriptionOccurrenceDate: f.Transaction.subscriptionOccurrenceDate,
					time: f.Transaction.time,
					type: f.Transaction.type,
				}))
				.where((f, fn) =>
					fn.or(
						fn.eq(f.origin.userId, userId),
						fn.eq(f.destination.userId, userId),
						fn.eq(f.RecurringPayment.userId, userId),
						fn.eq(f.Salary.userId, userId),
						fn.eq(f.Subscription.userId, userId),
					),
				);

			if (query.startDate) {
				queryBuilder = queryBuilder.where((f, fn) => fn.gte(f.Transaction.date, new Date(query.startDate!)));
			}
			if (query.endDate) {
				queryBuilder = queryBuilder.where((f, fn) => fn.lte(f.Transaction.date, new Date(query.endDate!)));
			}
			if (query.type) {
				queryBuilder = queryBuilder.where((f, fn) => fn.eq(f.Transaction.type, query.type!));
			}
			if (query.categoryId && taggedTransactionIds?.length) {
				queryBuilder = queryBuilder.where((f, fn) => fn.in(f.Transaction.id, taggedTransactionIds!));
			}
			if (query.financialAccountId) {
				queryBuilder = queryBuilder.where((f, fn) =>
					fn.or(
						fn.eq(f.Transaction.originFinancialAccountId, query.financialAccountId!),
						fn.eq(f.Transaction.destinationFinancialAccountId, query.financialAccountId!),
					),
				);
			}

			const transactions = taggedTransactionIds?.length === 0 ? [] : await queryRows(queryBuilder.build());
			const tagsByTransaction = await getTagsByEntity(
				tagEntityType.transaction,
				transactions.map(transaction => transaction.id),
			);
			const transactionDebtRefs = await debtRefsForTransactions(
				transactions.map(transaction => transaction.id),
			);

			const normalizedTransactions = transactions.map(transaction => {
				const tags = tagsByTransaction.get(transaction.id) ?? [];
				const paymentAccountType =
					transaction.type === "INCOME" ? transaction.destinationAccountType : transaction.originAccountType;
				return {
					...transaction,
					...transactionDebtRefs.get(transaction.id),
					source:
						transaction.type !== "TRANSFER" &&
						paymentAccountType === "CREDIT_CARD" &&
						!transaction.recurrenceId &&
						!transaction.salaryId &&
						!transaction.subscriptionId
							? ("CREDIT_CARD" as const)
							: ("FINANCIAL_ACCOUNT" as const),
					sourceName: transaction.type === "INCOME" ? transaction.destinationName : transaction.originName,
					tagIds: tags.map(tag => tag.id),
					tags,
				};
			});

			let purchases: Array<{
				amount: unknown;
				categoryColor: string | null;
				categoryName: string | null;
				creditCardId: string;
				createdAt: Date;
				currentInstallment: number;
				date: Date;
				description: string;
				id: string;
				installmentAmount: unknown;
				installments: number;
				originFinancialAccountId: string;
				statementId: string;
				storeName: string | null;
				time: string | null;
				sourceName: string;
			}> = [];
			if (!query.type || query.type === "EXPENSE") {
				let purchaseQuery = db.sql.public.CreditPurchase.innerJoin(
					db.sql.public.CreditCardStatement,
					(f, fn) => fn.eq(f.CreditPurchase.statementId, f.CreditCardStatement.id),
				)
					.innerJoin(db.sql.public.CreditCard, (f, fn) =>
						fn.eq(f.CreditCardStatement.creditCardId, f.CreditCard.id),
					)
					.innerJoin(db.sql.public.FinancialAccount, (f, fn) =>
						fn.eq(f.CreditCard.financialAccountId, f.FinancialAccount.id),
					)
					.outerLeftJoin(db.sql.public.FinancialInstitution, (f, fn) =>
						fn.eq(f.FinancialAccount.institutionId, f.FinancialInstitution.id),
					)
					.outerLeftJoin(db.sql.public.Category, (f, fn) => fn.eq(f.CreditPurchase.categoryId, f.Category.id))
					.select((f, fn) => ({
						amount: f.CreditPurchase.totalAmount,
						categoryColor: f.Category.color,
						categoryName: f.Category.name,
						createdAt: f.CreditPurchase.createdAt,
						creditCardId: f.CreditCard.id,
						currentInstallment: f.CreditPurchase.currentInstallment,
						date: f.CreditPurchase.purchaseDate,
						description: f.CreditPurchase.description,
						id: f.CreditPurchase.id,
						installmentAmount: f.CreditPurchase.installmentAmount,
						installments: f.CreditPurchase.installments,
						originAccountType: fn.raw`'CREDIT_CARD'`.returns("sql/varchar@1"),
						originFinancialAccountId: f.FinancialAccount.id,
						sourceName:
							fn.raw`COALESCE(${f.FinancialAccount.name}, ${f.FinancialInstitution.name}, 'Cartão de crédito')`.returns(
								"sql/varchar@1",
							),
						statementId: f.CreditPurchase.statementId,
						storeName: f.CreditPurchase.storeName,
						time: f.CreditPurchase.time,
					}))
					.where((f, fn) =>
						fn.and(fn.eq(f.FinancialAccount.userId, userId), fn.eq(f.CreditPurchase.currentInstallment, 1)),
					);
				if (query.startDate)
					purchaseQuery = purchaseQuery.where((f, fn) =>
						fn.gte(f.CreditPurchase.purchaseDate, new Date(query.startDate!)),
					);
				if (query.endDate)
					purchaseQuery = purchaseQuery.where((f, fn) =>
						fn.lte(f.CreditPurchase.purchaseDate, new Date(query.endDate!)),
					);
				if (query.financialAccountId)
					purchaseQuery = purchaseQuery.where((f, fn) =>
						fn.eq(f.FinancialAccount.id, query.financialAccountId!),
					);
				purchases = await queryRows(purchaseQuery.build());
			}
			const purchaseTags = await getTagsByEntity(
				tagEntityType.creditPurchase,
				purchases.map(purchase => purchase.id),
			);
			const purchaseDebtRefs = await debtRefsForPurchases(purchases.map(purchase => purchase.id));
			const normalizedPurchases = purchases
				.map(purchase => {
					const tags = purchaseTags.get(purchase.id) ?? [];
					return {
						...purchase,
						...purchaseDebtRefs.get(purchase.id),
						creditCardStatementId: purchase.statementId,
						destinationFinancialAccountId: null,
						destinationName: null,
						originName: purchase.sourceName,
						source: "CREDIT_CARD" as const,
						tagIds: tags.map(tag => tag.id),
						tags,
						type: "EXPENSE" as const,
					};
				})
				.filter(purchase => !query.categoryId || purchase.tagIds.includes(query.categoryId));

			return [...normalizedTransactions, ...normalizedPurchases]
				.sort(
					(left, right) =>
						new Date(right.date).getTime() - new Date(left.date).getTime() ||
						new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
				)
				.slice(query.offset ?? 0, (query.offset ?? 0) + (query.limit ?? 100));
		},
		{
			detail: { tags: ["Transactions"] },
			query: t.Object({
				categoryId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				endDate: t.Optional(t.String()),
				financialAccountId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				limit: t.Optional(t.Number({ maximum: 500, minimum: 1 })),
				offset: t.Optional(t.Number({ minimum: 0 })),
				startDate: t.Optional(t.String()),
				type: t.Optional(TransactionType),
			}),
		},
	)
	.get(
		"/:id",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			await assertTransactionOwnership(params.id, userId);
			const transaction = await queryFirst(
				db.sql.public.Transaction.select(...transactionColumns)
					.where((f, fn) => fn.eq(f.id, params.id))
					.limit(1)
					.build(),
			);

			if (!transaction) {
				throw new HttpException("Transaction not found", 404);
			}

			const tagsByTransaction = await getTagsByEntity(tagEntityType.transaction, [transaction.id]);
			const tags = tagsByTransaction.get(transaction.id) ?? [];
			return { ...transaction, tagIds: tags.map(tag => tag.id), tags };
		},
		{
			detail: { tags: ["Transactions"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.get(
		"/:id/history",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			await assertTransactionOwnership(params.id, userId);
			const history = await queryRows(
				db.sql.public.TransactionHistory.select(
					"id",
					"transactionId",
					"field",
					"oldValue",
					"newValue",
					"changedAt",
				)
					.where((f, fn) => fn.eq(f.transactionId, params.id))
					.orderBy("changedAt", { direction: "desc" })
					.build(),
			);

			return history;
		},
		{
			detail: { tags: ["Transactions"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.post(
		"/",
		async ({ body, request }) => {
			const userId = await requireUserId(request);
			if (body.recurrenceId) await assertDirectOwnership("RecurringPayment", body.recurrenceId, userId);
			if (body.salaryId) await assertDirectOwnership("Salary", body.salaryId, userId);
			if (body.subscriptionId) await assertDirectOwnership("Subscription", body.subscriptionId, userId);
			let originFinancialAccountId = body.originFinancialAccountId;
			let inheritedPaymentAccount = false;
			let inheritedStoreName: string | null | undefined;
			if (body.recurrenceId) {
				const recurringPayment = await queryFirst(
					db.sql.public.RecurringPayment.select("financialAccountId", "storeName")
						.where((fields, functions) => functions.eq(fields.id, body.recurrenceId!))
						.limit(1)
						.build(),
				);
				inheritedStoreName = recurringPayment?.storeName;
				if (!originFinancialAccountId && !body.destinationFinancialAccountId) {
					originFinancialAccountId = recurringPayment?.financialAccountId ?? undefined;
					inheritedPaymentAccount = Boolean(originFinancialAccountId);
				}
			}
			if (body.subscriptionId) {
				const subscription = await queryFirst(
					db.sql.public.Subscription.select("financialAccountId", "storeName")
						.where((fields, functions) => functions.eq(fields.id, body.subscriptionId!))
						.limit(1)
						.build(),
				);
				inheritedStoreName = subscription?.storeName;
				if (!originFinancialAccountId && !body.destinationFinancialAccountId) {
					originFinancialAccountId = subscription?.financialAccountId ?? undefined;
					inheritedPaymentAccount = Boolean(originFinancialAccountId);
				}
			}
			if (originFinancialAccountId) {
				if (inheritedPaymentAccount)
					await assertDirectOwnership("FinancialAccount", originFinancialAccountId, userId);
				else await assertBalanceAccountOwnership(originFinancialAccountId, userId);
			}
			if (body.destinationFinancialAccountId) {
				await assertBalanceAccountOwnership(body.destinationFinancialAccountId, userId);
			}
			const hasExplicitTags = body.tagIds !== undefined || body.categoryId !== undefined;
			const linkedTagSource = body.recurrenceId
				? { entityId: body.recurrenceId, entityType: tagEntityType.recurringPayment }
				: body.salaryId
					? { entityId: body.salaryId, entityType: tagEntityType.salary }
					: body.subscriptionId
						? { entityId: body.subscriptionId, entityType: tagEntityType.subscription }
						: undefined;
			const tagIds = hasExplicitTags
				? await assertTagOwnership(body.tagIds ?? (body.categoryId ? [body.categoryId] : []), userId)
				: linkedTagSource
					? ((await getTagsByEntity(linkedTagSource.entityType, [linkedTagSource.entityId]))
							.get(linkedTagSource.entityId)
							?.map(tag => tag.id) ?? [])
					: [];
			if (
				!originFinancialAccountId &&
				!body.destinationFinancialAccountId &&
				!body.recurrenceId &&
				!body.salaryId &&
				!body.subscriptionId
			) {
				throw new HttpException("Informe uma conta financeira ou recorrência", 400);
			}
			const storeName = body.storeName ?? inheritedStoreName;
			if (storeName && (body.type ?? "EXPENSE") !== "EXPENSE") {
				throw new HttpException("Loja só pode ser informada em transações de saída", 400);
			}
			if (storeName) await resolveStore(userId, storeName);
			const salaryOccurrenceDate = body.salaryId
				? new Date(body.salaryOccurrenceDate ?? body.date)
				: undefined;
			const recurrenceOccurrenceDate = body.recurrenceId
				? new Date(body.recurrenceOccurrenceDate ?? body.date)
				: undefined;
			const subscriptionOccurrenceDate = body.subscriptionId
				? new Date(body.subscriptionOccurrenceDate ?? body.date)
				: undefined;
			const findExistingOccurrence = () => {
				if (body.recurrenceId && recurrenceOccurrenceDate) {
					return queryFirst(
						db.sql.public.Transaction.select(...transactionColumns)
							.where((fields, functions) =>
								functions.and(
									functions.eq(fields.recurrenceId, body.recurrenceId!),
									functions.eq(fields.recurrenceOccurrenceDate, recurrenceOccurrenceDate),
								),
							)
							.limit(1)
							.build(),
					);
				}
				if (body.salaryId && salaryOccurrenceDate) {
					return queryFirst(
						db.sql.public.Transaction.select(...transactionColumns)
							.where((fields, functions) =>
								functions.and(
									functions.eq(fields.salaryId, body.salaryId!),
									functions.eq(fields.salaryOccurrenceDate, salaryOccurrenceDate),
								),
							)
							.limit(1)
							.build(),
					);
				}
				if (body.subscriptionId && subscriptionOccurrenceDate) {
					return queryFirst(
						db.sql.public.Transaction.select(...transactionColumns)
							.where((fields, functions) =>
								functions.and(
									functions.eq(fields.subscriptionId, body.subscriptionId!),
									functions.eq(fields.subscriptionOccurrenceDate, subscriptionOccurrenceDate),
								),
							)
							.limit(1)
							.build(),
					);
				}
				return Promise.resolve(undefined);
			};
			let transaction = await findExistingOccurrence();
			let wasCreated = false;
			if (!transaction) {
				try {
					transaction = await queryFirst(
						db.sql.public.Transaction.insert([
							{
								amount: String(body.amount),
								categoryId: tagIds[0],
								date: new Date(body.date),
								description: body.description,
								destinationFinancialAccountId: body.destinationFinancialAccountId,
								originFinancialAccountId,
								recurrenceId: body.recurrenceId,
								recurrenceOccurrenceDate,
								salaryId: body.salaryId,
								salaryOccurrenceDate,
								storeName,
								subscriptionId: body.subscriptionId,
								subscriptionOccurrenceDate,
								time:
									body.recurrenceId || body.salaryId || body.subscriptionId
										? null
										: resolveTransactionTime(body.time),
								type: body.type ?? "EXPENSE",
							},
						])
							.returning(...transactionColumns)
							.build(),
					);
					wasCreated = Boolean(transaction);
				} catch (error) {
					transaction = await findExistingOccurrence();
					if (!transaction) throw error;
				}
			}
			if (!transaction) throw new HttpException("Transaction not created", 500);
			if (wasCreated) {
				await replaceEntityTags({
					entityIds: [transaction.id],
					entityType: tagEntityType.transaction,
					tagIds,
				});
				await linkTransactionToDebt({
					amount: body.amount,
					date: body.date,
					debtPersonId: body.debtPersonId,
					description: body.description,
					matchEventId: body.matchDebtEventId,
					transactionId: transaction.id,
					type: body.type ?? "EXPENSE",
					userId,
				});
			}

			const tagsByTransaction = await getTagsByEntity(tagEntityType.transaction, [transaction.id]);
			const tags = tagsByTransaction.get(transaction.id) ?? [];
			return { ...transaction, tagIds: tags.map(tag => tag.id), tags };
		},
		{
			body: t.Object({
				amount: t.Number(),
				categoryId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				date: t.String(),
				debtPersonId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				description: t.Optional(t.String({ maxLength: 1000 })),
				destinationFinancialAccountId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				matchDebtEventId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				originFinancialAccountId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				recurrenceId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				recurrenceOccurrenceDate: t.Optional(t.String()),
				salaryId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				salaryOccurrenceDate: t.Optional(t.String()),
				storeName: t.Optional(t.String({ maxLength: 200 })),
				subscriptionId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				subscriptionOccurrenceDate: t.Optional(t.String()),
				tagIds: t.Optional(t.Array(t.String({ maxLength: 36, minLength: 1 }), { maxItems: 20 })),
				time: t.Optional(t.Nullable(t.String({ pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d)?$" }))),
				type: t.Optional(TransactionType),
			}),
			detail: { tags: ["Transactions"] },
		},
	)
	.patch(
		"/:id",
		async ({ params, body, request }) => {
			const userId = await requireUserId(request);
			await assertTransactionOwnership(params.id, userId);
			if (body.originFinancialAccountId)
				await assertBalanceAccountOwnership(body.originFinancialAccountId, userId);
			if (body.destinationFinancialAccountId)
				await assertBalanceAccountOwnership(body.destinationFinancialAccountId, userId);
			const tagIds =
				body.tagIds !== undefined || body.categoryId !== undefined
					? await assertTagOwnership(body.tagIds ?? (body.categoryId ? [body.categoryId] : []), userId)
					: undefined;
			const existing = await queryFirst(
				db.sql.public.Transaction.select(...transactionColumns)
					.where((f, fn) => fn.eq(f.id, params.id))
					.limit(1)
					.build(),
			);

			if (!existing) {
				throw new HttpException("Transaction not found", 404);
			}
			if (body.amount !== undefined && body.amount <= 0) {
				throw new HttpException("Informe um valor maior que zero", 400);
			}
			if (body.storeName && (body.type ?? existing.type) !== "EXPENSE") {
				throw new HttpException("Loja só pode ser informada em transações de saída", 400);
			}
			if (body.storeName) await resolveStore(userId, body.storeName);

			// Record history for changed fields
			const historyEntries: Array<{
				transactionId: string;
				field: string;
				oldValue: string | null;
				newValue: string | null;
			}> = [];

			if (body.amount !== undefined && body.amount !== Number(existing.amount)) {
				historyEntries.push({
					field: "amount",
					newValue: String(body.amount),
					oldValue: String(existing.amount),
					transactionId: params.id,
				});
			}
			if (body.description !== undefined && body.description !== existing.description) {
				historyEntries.push({
					field: "description",
					newValue: body.description,
					oldValue: existing.description,
					transactionId: params.id,
				});
			}
			if (body.storeName !== undefined && body.storeName !== existing.storeName) {
				historyEntries.push({
					field: "storeName",
					newValue: body.storeName,
					oldValue: existing.storeName,
					transactionId: params.id,
				});
			}
			if (existing.recurrenceId || existing.salaryId || existing.subscriptionId) {
				historyEntries.push({
					field: "manualEdit",
					newValue: null,
					oldValue: null,
					transactionId: params.id,
				});
			}

			if (historyEntries.length > 0) {
				await executeStatement(db.sql.public.TransactionHistory.insert(historyEntries as never).build());
			}
			const transaction = await queryFirst(
				db.sql.public.Transaction.update({
					...(body.amount !== undefined && { amount: String(body.amount) }),
					...(body.date && { date: new Date(body.date) }),
					...(body.time !== undefined && { time: body.time }),
					...(body.description !== undefined && { description: body.description }),
					...(body.storeName !== undefined && { storeName: body.storeName }),
					...(body.type && { type: body.type }),
					...(body.originFinancialAccountId !== undefined && {
						originFinancialAccountId: body.originFinancialAccountId,
					}),
					...(body.destinationFinancialAccountId !== undefined && {
						destinationFinancialAccountId: body.destinationFinancialAccountId,
					}),
					...(tagIds !== undefined && { categoryId: tagIds[0] ?? null }),
					updatedAt: new Date(),
				} as never)
					.where((f, fn) => fn.eq(f.id, params.id))
					.returning(...transactionColumns)
					.build(),
			);
			if (!transaction) throw new HttpException("Transaction not found", 404);
			await syncTransactionDebtEvent({
				amount: Number(transaction.amount),
				date: transaction.date.toISOString().slice(0, 10),
				debtPersonId: body.debtPersonId,
				description: transaction.description ?? undefined,
				matchEventId: body.matchDebtEventId,
				transactionId: transaction.id,
				type: transaction.type as "EXPENSE" | "INCOME" | "TRANSFER",
				userId,
			});
			if (tagIds !== undefined) {
				await replaceEntityTags({
					entityIds: [transaction.id],
					entityType: tagEntityType.transaction,
					tagIds,
				});
			}

			const tagsByTransaction = await getTagsByEntity(tagEntityType.transaction, [transaction.id]);
			const tags = tagsByTransaction.get(transaction.id) ?? [];
			return { ...transaction, tagIds: tags.map(tag => tag.id), tags };
		},
		{
			body: t.Object({
				amount: t.Optional(t.Number()),
				categoryId: t.Optional(t.Nullable(t.String({ maxLength: 36, minLength: 1 }))),
				date: t.Optional(t.String()),
				debtPersonId: t.Optional(t.Nullable(t.String({ maxLength: 36, minLength: 1 }))),
				description: t.Optional(t.String({ maxLength: 1000 })),
				destinationFinancialAccountId: t.Optional(t.Nullable(t.String({ maxLength: 36, minLength: 1 }))),
				matchDebtEventId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				originFinancialAccountId: t.Optional(t.Nullable(t.String({ maxLength: 36, minLength: 1 }))),
				storeName: t.Optional(t.Nullable(t.String({ maxLength: 200 }))),
				tagIds: t.Optional(t.Array(t.String({ maxLength: 36, minLength: 1 }), { maxItems: 20 })),
				time: t.Optional(t.Nullable(t.String({ pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d)?$" }))),
				type: t.Optional(TransactionType),
			}),
			detail: { tags: ["Transactions"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.delete(
		"/:id",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			await assertTransactionOwnership(params.id, userId);
			const existing = await queryFirst(
				db.sql.public.Transaction.select(...transactionColumns)
					.where((f, fn) => fn.eq(f.id, params.id))
					.limit(1)
					.build(),
			);

			if (!existing) {
				throw new HttpException("Transaction not found", 404);
			}

			await replaceEntityTags({
				entityIds: [params.id],
				entityType: tagEntityType.transaction,
				tagIds: [],
			});
			await deleteCreatorDebtEventForTransaction(params.id, userId);
			await executeStatement(
				db.sql.public.Transaction.delete()
					.where((f, fn) => fn.eq(f.id, params.id))
					.build(),
			);
			return { success: true };
		},
		{
			detail: { tags: ["Transactions"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	);
