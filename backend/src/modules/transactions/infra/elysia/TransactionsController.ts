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
import { materializeSalaryTransactions } from "~/modules/salaries/application/materialize-salary-transactions";
import { HttpException } from "~/shared/errors";
import { db, executeStatement, numeric, param, queryFirst, queryRows } from "~/shared/infra/sql";

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

const TransactionType = t.Union([t.Literal("INCOME"), t.Literal("EXPENSE"), t.Literal("TRANSFER")]);

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
			const origin = db.sql.public.FinancialAccount.select("id", "institutionId", "userId", "name").as(
				"origin",
			);
			const originInstitution = db.sql.public.FinancialInstitution.select("id", "name").as(
				"originInstitution",
			);
			const destination = db.sql.public.FinancialAccount.select("id", "institutionId", "userId", "name").as(
				"destination",
			);
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
					destinationFinancialAccountId: f.Transaction.destinationFinancialAccountId,
					destinationName: fn.raw`COALESCE(${f.destination.name}, ${f.destinationInstitution.name})`.returns(
						"sql/varchar@1",
					),
					id: f.Transaction.id,
					originFinancialAccountId: f.Transaction.originFinancialAccountId,
					originName: fn.raw`COALESCE(${f.origin.name}, ${f.originInstitution.name})`.returns(
						"sql/varchar@1",
					),
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

			const normalizedTransactions = transactions.map(transaction => {
				const tags = tagsByTransaction.get(transaction.id) ?? [];
				return {
					...transaction,
					source: "FINANCIAL_ACCOUNT" as const,
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
						originFinancialAccountId: f.FinancialAccount.id,
						sourceName:
							fn.raw`COALESCE(${f.FinancialAccount.name}, ${f.FinancialInstitution.name}, 'Cartão de crédito')`.returns(
								"sql/varchar@1",
							),
						statementId: f.CreditPurchase.statementId,
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
			const normalizedPurchases = purchases
				.map(purchase => {
					const tags = purchaseTags.get(purchase.id) ?? [];
					return {
						...purchase,
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
			if (!originFinancialAccountId && !body.destinationFinancialAccountId && body.recurrenceId) {
				const recurringPayment = await queryFirst(
					db.sql.public.RecurringPayment.select("financialAccountId")
						.where((fields, functions) => functions.eq(fields.id, body.recurrenceId!))
						.limit(1)
						.build(),
				);
				originFinancialAccountId = recurringPayment?.financialAccountId ?? undefined;
				inheritedPaymentAccount = Boolean(originFinancialAccountId);
			}
			if (!originFinancialAccountId && !body.destinationFinancialAccountId && body.subscriptionId) {
				const subscription = await queryFirst(
					db.sql.public.Subscription.select("financialAccountId")
						.where((fields, functions) => functions.eq(fields.id, body.subscriptionId!))
						.limit(1)
						.build(),
				);
				originFinancialAccountId = subscription?.financialAccountId ?? undefined;
				inheritedPaymentAccount = Boolean(originFinancialAccountId);
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
			const transaction = await queryFirst(
				db.sql.public.Transaction.insert([
					{
						amount: String(body.amount),
						categoryId: tagIds[0],
						date: new Date(body.date),
						description: body.description,
						destinationFinancialAccountId: body.destinationFinancialAccountId,
						originFinancialAccountId,
						recurrenceId: body.recurrenceId,
						salaryId: body.salaryId,
						salaryOccurrenceDate: body.salaryOccurrenceDate ? new Date(body.salaryOccurrenceDate) : undefined,
						subscriptionId: body.subscriptionId,
						subscriptionOccurrenceDate: body.subscriptionOccurrenceDate
							? new Date(body.subscriptionOccurrenceDate)
							: undefined,
						type: body.type ?? "EXPENSE",
					},
				])
					.returning(...transactionColumns)
					.build(),
			);
			if (!transaction) throw new HttpException("Transaction not created", 500);
			await replaceEntityTags({
				entityIds: [transaction.id],
				entityType: tagEntityType.transaction,
				tagIds,
			});

			// Update account balances
			if (originFinancialAccountId) {
				const account = await queryFirst(
					db.sql.public.FinancialAccount.select("type")
						.where((fields, functions) => functions.eq(fields.id, originFinancialAccountId!))
						.limit(1)
						.build(),
				);
				if (account?.type !== "CREDIT_CARD") {
					const amount = param(numeric<12, 2>(body.amount), { codecId: "pg/numeric@1" });
					await executeStatement(
						db.sql.public.FinancialAccount.update((f, fn) => ({
							balance: fn.raw`${f.balance} - ${amount}`.returns("pg/numeric@1"),
							updatedAt: fn.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
						}))
							.where((f, fn) => fn.eq(f.id, originFinancialAccountId!))
							.build(),
					);
				}
			}

			if (body.destinationFinancialAccountId) {
				const amount = param(numeric<12, 2>(body.amount), { codecId: "pg/numeric@1" });
				await executeStatement(
					db.sql.public.FinancialAccount.update((f, fn) => ({
						balance: fn.raw`${f.balance} + ${amount}`.returns("pg/numeric@1"),
						updatedAt: fn.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
					}))
						.where((f, fn) => fn.eq(f.id, body.destinationFinancialAccountId!))
						.build(),
				);
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
				description: t.Optional(t.String({ maxLength: 1000 })),
				destinationFinancialAccountId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				originFinancialAccountId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				recurrenceId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				salaryId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				salaryOccurrenceDate: t.Optional(t.String()),
				subscriptionId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				subscriptionOccurrenceDate: t.Optional(t.String()),
				tagIds: t.Optional(t.Array(t.String({ maxLength: 36, minLength: 1 }), { maxItems: 20 })),
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

			if (historyEntries.length > 0) {
				await executeStatement(db.sql.public.TransactionHistory.insert(historyEntries as never).build());
			}
			const nextAmount = body.amount ?? Number(existing.amount);
			const nextOriginFinancialAccountId =
				body.originFinancialAccountId === undefined
					? existing.originFinancialAccountId
					: body.originFinancialAccountId;
			const nextDestinationFinancialAccountId =
				body.destinationFinancialAccountId === undefined
					? existing.destinationFinancialAccountId
					: body.destinationFinancialAccountId;
			const accountsChanged =
				nextOriginFinancialAccountId !== existing.originFinancialAccountId ||
				nextDestinationFinancialAccountId !== existing.destinationFinancialAccountId;
			if (accountsChanged || nextAmount !== Number(existing.amount)) {
				const updateBalance = async (accountId: string | null, amount: number) => {
					if (!accountId || amount === 0) return;
					const balanceDifference = param(numeric<12, 2>(amount), { codecId: "pg/numeric@1" });
					await executeStatement(
						db.sql.public.FinancialAccount.update((f, fn) => ({
							balance: fn.raw`${f.balance} + ${balanceDifference}`.returns("pg/numeric@1"),
							updatedAt: fn.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
						}))
							.where((f, fn) => fn.eq(f.id, accountId))
							.build(),
					);
				};
				await updateBalance(existing.originFinancialAccountId, Number(existing.amount));
				await updateBalance(existing.destinationFinancialAccountId, -Number(existing.amount));
				await updateBalance(nextOriginFinancialAccountId, -nextAmount);
				await updateBalance(nextDestinationFinancialAccountId, nextAmount);
			}

			const transaction = await queryFirst(
				db.sql.public.Transaction.update({
					...(body.amount !== undefined && { amount: String(body.amount) }),
					...(body.date && { date: new Date(body.date) }),
					...(body.description !== undefined && { description: body.description }),
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
				description: t.Optional(t.String({ maxLength: 1000 })),
				destinationFinancialAccountId: t.Optional(t.Nullable(t.String({ maxLength: 36, minLength: 1 }))),
				originFinancialAccountId: t.Optional(t.Nullable(t.String({ maxLength: 36, minLength: 1 }))),
				tagIds: t.Optional(t.Array(t.String({ maxLength: 36, minLength: 1 }), { maxItems: 20 })),
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

			// Reverse account balance changes
			if (existing.originFinancialAccountId) {
				const amount = param(numeric<12, 2>(existing.amount), { codecId: "pg/numeric@1" });
				await executeStatement(
					db.sql.public.FinancialAccount.update((f, fn) => ({
						balance: fn.raw`${f.balance} + ${amount}`.returns("pg/numeric@1"),
						updatedAt: fn.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
					}))
						.where((f, fn) => fn.eq(f.id, existing.originFinancialAccountId!))
						.build(),
				);
			}

			if (existing.destinationFinancialAccountId) {
				const amount = param(numeric<12, 2>(existing.amount), { codecId: "pg/numeric@1" });
				await executeStatement(
					db.sql.public.FinancialAccount.update((f, fn) => ({
						balance: fn.raw`${f.balance} - ${amount}`.returns("pg/numeric@1"),
						updatedAt: fn.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
					}))
						.where((f, fn) => fn.eq(f.id, existing.destinationFinancialAccountId!))
						.build(),
				);
			}

			await replaceEntityTags({
				entityIds: [params.id],
				entityType: tagEntityType.transaction,
				tagIds: [],
			});
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
