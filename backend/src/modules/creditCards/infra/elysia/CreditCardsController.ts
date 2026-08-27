import { addMonths } from "date-fns";
import Elysia, { t } from "elysia";
import { assertBalanceAccountOwnership, assertCreditCardOwnership, requireUserId } from "~/modules/auth";
import {
	assertTagOwnership,
	getTagsByEntity,
	replaceEntityTags,
	tagEntityType,
} from "~/modules/categories/application/tag-assignments";
import { HttpException } from "~/shared/errors";
import { db, executeStatement, numeric, param, queryFirst, queryRows } from "~/shared/infra/sql";

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
interface CreditPurchaseRow {
	id: string;
	statementId: string;
	description: string;
	totalAmount: number;
	installments: number;
	currentInstallment: number;
	installmentAmount: number;
	purchaseDate: Date;
	categoryId: string | null;
	parentId: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const findPurchaseForCard = (creditCardId: string, purchaseId: string) =>
	queryFirst(
		db.sql.public.CreditPurchase.innerJoin(db.sql.public.CreditCardStatement, (fields, functions) =>
			functions.eq(fields.CreditPurchase.statementId, fields.CreditCardStatement.id),
		)
			.select(fields => ({
				categoryId: fields.CreditPurchase.categoryId,
				creditCardId: fields.CreditCardStatement.creditCardId,
				currentInstallment: fields.CreditPurchase.currentInstallment,
				description: fields.CreditPurchase.description,
				id: fields.CreditPurchase.id,
				installmentAmount: fields.CreditPurchase.installmentAmount,
				installments: fields.CreditPurchase.installments,
				isPaid: fields.CreditCardStatement.isPaid,
				parentId: fields.CreditPurchase.parentId,
				purchaseDate: fields.CreditPurchase.purchaseDate,
				statementId: fields.CreditPurchase.statementId,
				totalAmount: fields.CreditPurchase.totalAmount,
			}))
			.where((fields, functions) =>
				functions.and(
					functions.eq(fields.CreditPurchase.id, purchaseId),
					functions.eq(fields.CreditCardStatement.creditCardId, creditCardId),
				),
			)
			.limit(1)
			.build(),
	);

export const CreditCardsController = new Elysia({ prefix: "/credit-cards" })
	.get(
		"/",
		async ({ request }) => {
			const userId = await requireUserId(request);
			const cards = await queryRows(
				db.sql.public.CreditCard.innerJoin(db.sql.public.FinancialAccount, (fields, functions) =>
					functions.eq(fields.CreditCard.financialAccountId, fields.FinancialAccount.id),
				)
					.outerLeftJoin(db.sql.public.FinancialInstitution, (fields, functions) =>
						functions.eq(fields.FinancialAccount.institutionId, fields.FinancialInstitution.id),
					)
					.select((fields, functions) => ({
						accountName:
							functions.raw`COALESCE(${fields.FinancialAccount.name}, ${fields.FinancialInstitution.name}, 'Cartão de crédito')`.returns(
								"sql/varchar@1",
							),
						createdAt: fields.CreditCard.createdAt,
						creditLimit: fields.CreditCard.creditLimit,
						dueDay: fields.CreditCard.dueDay,
						financialAccountId: fields.CreditCard.financialAccountId,
						id: fields.CreditCard.id,
						securityDeposit: fields.CreditCard.securityDeposit,
						statementDay: fields.CreditCard.statementDay,
						workingDueDate: fields.CreditCard.workingDueDate,
					}))
					.where((fields, functions) => functions.eq(fields.FinancialAccount.userId, userId))
					.orderBy(fields => fields.FinancialAccount.name, { direction: "asc" })
					.build(),
			);
			return cards;
		},
		{
			detail: { tags: ["Credit Cards"] },
		},
	)
	.get(
		"/:id",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			await assertCreditCardOwnership(params.id, userId);
			const card = await queryFirst(
				db.sql.public.CreditCard.innerJoin(db.sql.public.FinancialAccount, (fields, functions) =>
					functions.eq(fields.CreditCard.financialAccountId, fields.FinancialAccount.id),
				)
					.outerLeftJoin(db.sql.public.FinancialInstitution, (fields, functions) =>
						functions.eq(fields.FinancialAccount.institutionId, fields.FinancialInstitution.id),
					)
					.select((fields, functions) => ({
						accountName:
							functions.raw`COALESCE(${fields.FinancialAccount.name}, ${fields.FinancialInstitution.name}, 'Cartão de crédito')`.returns(
								"sql/varchar@1",
							),
						createdAt: fields.CreditCard.createdAt,
						creditLimit: fields.CreditCard.creditLimit,
						dueDay: fields.CreditCard.dueDay,
						financialAccountId: fields.CreditCard.financialAccountId,
						id: fields.CreditCard.id,
						securityDeposit: fields.CreditCard.securityDeposit,
						statementDay: fields.CreditCard.statementDay,
						workingDueDate: fields.CreditCard.workingDueDate,
					}))
					.where((fields, functions) => functions.eq(fields.CreditCard.id, params.id))
					.limit(1)
					.build(),
			);

			if (!card) {
				throw new HttpException("Credit card not found", 404);
			}

			return card;
		},
		{
			detail: { tags: ["Credit Cards"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.get(
		"/:id/statements",
		async ({ params, query, request }) => {
			const userId = await requireUserId(request);
			await assertCreditCardOwnership(params.id, userId);
			let queryBuilder = db.sql.public.CreditCardStatement.select(...statementColumns).where(
				(fields, functions) => functions.eq(fields.creditCardId, params.id),
			);

			if (query.isPaid !== undefined) {
				queryBuilder = queryBuilder.where((fields, functions) => functions.eq(fields.isPaid, query.isPaid!));
			}

			const statements = await queryRows(
				queryBuilder.orderBy("statementDate", { direction: "desc" }).build(),
			);
			return statements;
		},
		{
			detail: { tags: ["Credit Cards"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
			query: t.Object({
				isPaid: t.Optional(t.Boolean()),
			}),
		},
	)
	.get(
		"/:id/statements/:statementId",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			await assertCreditCardOwnership(params.id, userId);
			const statement = await queryFirst(
				db.sql.public.CreditCardStatement.select(...statementColumns)
					.where((fields, functions) =>
						functions.and(
							functions.eq(fields.id, params.statementId),
							functions.eq(fields.creditCardId, params.id),
						),
					)
					.limit(1)
					.build(),
			);

			if (!statement) {
				throw new HttpException("Statement not found", 404);
			}

			const purchases = await queryRows(
				db.sql.public.CreditPurchase.select(...purchaseColumns)
					.where((fields, functions) => functions.eq(fields.statementId, params.statementId))
					.orderBy("purchaseDate", { direction: "desc" })
					.build(),
			);
			const tagsByPurchase = await getTagsByEntity(
				tagEntityType.creditPurchase,
				purchases.map(purchase => purchase.id),
			);

			return {
				...statement,
				purchases: purchases.map(purchase => {
					const tags = tagsByPurchase.get(purchase.id) ?? [];
					return {
						...purchase,
						categoryColor: tags[0]?.color,
						categoryName: tags[0]?.name,
						tagIds: tags.map(tag => tag.id),
						tags,
					};
				}),
			};
		},
		{
			detail: { tags: ["Credit Cards"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
				statementId: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.post(
		"/:id/purchases",
		async ({ params, body, request }) => {
			const userId = await requireUserId(request);
			await assertCreditCardOwnership(params.id, userId);
			const tagIds = await assertTagOwnership(
				body.tagIds ?? (body.categoryId ? [body.categoryId] : []),
				userId,
			);
			const card = await queryFirst(
				db.sql.public.CreditCard.select("id", "statementDay", "dueDay")
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.limit(1)
					.build(),
			);

			if (!card) {
				throw new HttpException("Credit card not found", 404);
			}

			const purchaseDate = new Date(body.purchaseDate);
			const installments = body.installments ?? 1;
			const installmentAmount = body.totalAmount / installments;

			// Create purchases for each installment
			const createdPurchases: CreditPurchaseRow[] = [];

			for (let i = 0; i < installments; i++) {
				// Calculate which statement this installment belongs to
				const installmentDate = addMonths(purchaseDate, i);
				let statementMonth = installmentDate;

				// If purchase is after statement day, it goes to next month's statement
				if (installmentDate.getDate() > card.statementDay) {
					statementMonth = addMonths(installmentDate, 1);
				}

				const statementDate = new Date(
					statementMonth.getFullYear(),
					statementMonth.getMonth(),
					card.statementDay,
				);

				const dueDate = new Date(statementMonth.getFullYear(), statementMonth.getMonth(), card.dueDay);

				// Adjust due date if it's before statement date
				if (dueDate <= statementDate) {
					dueDate.setMonth(dueDate.getMonth() + 1);
				}

				// Get or create statement
				let statement = await queryFirst(
					db.sql.public.CreditCardStatement.select(...statementColumns)
						.where((fields, functions) =>
							functions.and(
								functions.eq(fields.creditCardId, params.id),
								functions.eq(fields.statementDate, statementDate),
							),
						)
						.limit(1)
						.build(),
				);

				if (!statement) {
					statement = await queryFirst(
						db.sql.public.CreditCardStatement.insert([
							{
								creditCardId: params.id,
								dueDate,
								statementDate,
								totalAmount: "0",
							},
						])
							.returning(...statementColumns)
							.build(),
					);
					if (!statement) throw new HttpException("Statement not created", 500);
				}

				// Create purchase
				const purchase = await queryFirst(
					db.sql.public.CreditPurchase.insert([
						{
							categoryId: tagIds[0],
							currentInstallment: i + 1,
							description: body.description,
							installmentAmount: String(installmentAmount),
							installments,
							parentId: createdPurchases[0]?.id,
							purchaseDate,
							statementId: statement.id,
							totalAmount: String(body.totalAmount),
						},
					])
						.returning(...purchaseColumns)
						.build(),
				);
				if (!purchase) throw new HttpException("Purchase not created", 500);

				createdPurchases.push({
					...purchase,
					installmentAmount: Number(purchase.installmentAmount),
					totalAmount: Number(purchase.totalAmount),
				});

				// Update statement total
				const amount = param(numeric<12, 2>(installmentAmount), { codecId: "pg/numeric@1" });
				await executeStatement(
					db.sql.public.CreditCardStatement.update((fields, functions) => ({
						totalAmount: functions.raw`${fields.totalAmount} + ${amount}`.returns("pg/numeric@1"),
						updatedAt: functions.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
					}))
						.where((fields, functions) => functions.eq(fields.id, statement.id))
						.build(),
				);
			}

			await replaceEntityTags({
				entityIds: createdPurchases.map(purchase => purchase.id),
				entityType: tagEntityType.creditPurchase,
				tagIds,
			});
			const tagsByPurchase = await getTagsByEntity(
				tagEntityType.creditPurchase,
				createdPurchases.map(purchase => purchase.id),
			);

			return createdPurchases.map(purchase => {
				const tags = tagsByPurchase.get(purchase.id) ?? [];
				return { ...purchase, tagIds: tags.map(tag => tag.id), tags };
			});
		},
		{
			body: t.Object({
				categoryId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				description: t.String({ maxLength: 500 }),
				installments: t.Optional(t.Number({ maximum: 48, minimum: 1 })),
				purchaseDate: t.String(),
				tagIds: t.Optional(t.Array(t.String({ maxLength: 36, minLength: 1 }), { maxItems: 20 })),
				totalAmount: t.Number(),
			}),
			detail: { tags: ["Credit Cards"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.patch(
		"/:id/purchases/:purchaseId",
		async ({ params, body, request }) => {
			const userId = await requireUserId(request);
			await assertCreditCardOwnership(params.id, userId);
			const purchase = await findPurchaseForCard(params.id, params.purchaseId);
			if (!purchase) throw new HttpException("Purchase not found", 404);
			if (purchase.isPaid) throw new HttpException("Paid statement purchases cannot be edited", 409);

			const tagIds = body.tagIds === undefined ? undefined : await assertTagOwnership(body.tagIds, userId);
			const previousAmount = Number(purchase.installmentAmount);
			const nextAmount = body.installmentAmount ?? previousAmount;
			const updatedPurchase = await queryFirst(
				db.sql.public.CreditPurchase.update({
					...(body.description !== undefined && { description: body.description }),
					...(body.installmentAmount !== undefined && {
						installmentAmount: String(body.installmentAmount),
						...(purchase.installments === 1 && { totalAmount: String(body.installmentAmount) }),
					}),
					...(body.purchaseDate !== undefined && { purchaseDate: new Date(body.purchaseDate) }),
					...(tagIds !== undefined && { categoryId: tagIds[0] ?? null }),
					updatedAt: new Date(),
				} as never)
					.where((fields, functions) => functions.eq(fields.id, params.purchaseId))
					.returning(...purchaseColumns)
					.build(),
			);
			if (!updatedPurchase) throw new HttpException("Purchase not found", 404);

			const difference = nextAmount - previousAmount;
			if (difference !== 0) {
				const amount = param(numeric<12, 2>(difference), { codecId: "pg/numeric@1" });
				await executeStatement(
					db.sql.public.CreditCardStatement.update((fields, functions) => ({
						totalAmount: functions.raw`${fields.totalAmount} + ${amount}`.returns("pg/numeric@1"),
						updatedAt: functions.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
					}))
						.where((fields, functions) => functions.eq(fields.id, purchase.statementId))
						.build(),
				);
			}
			if (tagIds !== undefined) {
				await replaceEntityTags({
					entityIds: [updatedPurchase.id],
					entityType: tagEntityType.creditPurchase,
					tagIds,
				});
			}

			const tagsByPurchase = await getTagsByEntity(tagEntityType.creditPurchase, [updatedPurchase.id]);
			const tags = tagsByPurchase.get(updatedPurchase.id) ?? [];
			return { ...updatedPurchase, tagIds: tags.map(tag => tag.id), tags };
		},
		{
			body: t.Object({
				description: t.Optional(t.String({ maxLength: 500, minLength: 1 })),
				installmentAmount: t.Optional(t.Number({ exclusiveMinimum: 0 })),
				purchaseDate: t.Optional(t.String()),
				tagIds: t.Optional(t.Array(t.String({ maxLength: 36, minLength: 1 }), { maxItems: 20 })),
			}),
			detail: { tags: ["Credit Cards"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
				purchaseId: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.delete(
		"/:id/purchases/:purchaseId",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			await assertCreditCardOwnership(params.id, userId);
			const purchase = await findPurchaseForCard(params.id, params.purchaseId);
			if (!purchase) throw new HttpException("Purchase not found", 404);
			if (purchase.isPaid) throw new HttpException("Paid statement purchases cannot be deleted", 409);

			await replaceEntityTags({
				entityIds: [purchase.id],
				entityType: tagEntityType.creditPurchase,
				tagIds: [],
			});
			await executeStatement(
				db.sql.public.CreditPurchase.delete()
					.where((fields, functions) => functions.eq(fields.id, purchase.id))
					.build(),
			);
			const amount = param(numeric<12, 2>(purchase.installmentAmount), { codecId: "pg/numeric@1" });
			await executeStatement(
				db.sql.public.CreditCardStatement.update((fields, functions) => ({
					totalAmount: functions.raw`GREATEST(0, ${fields.totalAmount} - ${amount})`.returns("pg/numeric@1"),
					updatedAt: functions.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
				}))
					.where((fields, functions) => functions.eq(fields.id, purchase.statementId))
					.build(),
			);
			return { success: true };
		},
		{
			detail: { tags: ["Credit Cards"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
				purchaseId: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.post(
		"/:id/statements/:statementId/pay",
		async ({ params, body, request }) => {
			const userId = await requireUserId(request);
			await assertCreditCardOwnership(params.id, userId);
			await assertBalanceAccountOwnership(body.financialAccountId, userId);
			const statement = await queryFirst(
				db.sql.public.CreditCardStatement.select(...statementColumns)
					.where((fields, functions) =>
						functions.and(
							functions.eq(fields.id, params.statementId),
							functions.eq(fields.creditCardId, params.id),
						),
					)
					.limit(1)
					.build(),
			);

			if (!statement) {
				throw new HttpException("Statement not found", 404);
			}

			if (statement.isPaid) throw new HttpException("Statement already paid", 409);
			const remainingAmount = Number(statement.totalAmount) - Number(statement.paidAmount);
			const paymentAmount = body.amount ?? remainingAmount;
			if (paymentAmount <= 0 || paymentAmount > remainingAmount) {
				throw new HttpException("Informe um valor maior que zero e até o saldo da fatura", 400);
			}

			const amount = param(numeric<12, 2>(paymentAmount), { codecId: "pg/numeric@1" });
			const isPaid = Number(statement.paidAmount) + paymentAmount >= Number(statement.totalAmount);
			const card = await queryFirst(
				db.sql.public.CreditCard.innerJoin(db.sql.public.FinancialAccount, (fields, functions) =>
					functions.eq(fields.CreditCard.financialAccountId, fields.FinancialAccount.id),
				)
					.outerLeftJoin(db.sql.public.FinancialInstitution, (fields, functions) =>
						functions.eq(fields.FinancialAccount.institutionId, fields.FinancialInstitution.id),
					)
					.select((fields, functions) => ({
						accountName:
							functions.raw`COALESCE(${fields.FinancialAccount.name}, ${fields.FinancialInstitution.name}, 'Cartão de crédito')`.returns(
								"sql/varchar@1",
							),
					}))
					.where((fields, functions) => functions.eq(fields.CreditCard.id, params.id))
					.limit(1)
					.build(),
			);
			if (!card) throw new HttpException("Credit card not found", 404);

			const paymentTransaction = await queryFirst(
				db.sql.public.Transaction.insert([
					{
						amount: String(paymentAmount),
						date: new Date(body.date),
						description: `Pagamento da fatura — ${card.accountName}`,
						originFinancialAccountId: body.financialAccountId,
						type: "EXPENSE",
					},
				])
					.returning("id", "amount", "date", "description", "type", "originFinancialAccountId", "createdAt")
					.build(),
			);
			if (!paymentTransaction) throw new HttpException("Payment transaction not created", 500);
			const updatedStatement = await queryFirst(
				db.sql.public.CreditCardStatement.update((fields, functions) => ({
					isPaid: functions.raw`${isPaid}`.returns("pg/bool@1"),
					paidAmount: functions.raw`${fields.paidAmount} + ${amount}`.returns("pg/numeric@1"),
					updatedAt: functions.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
				}))
					.where((fields, functions) => functions.eq(fields.id, params.statementId))
					.returning(...statementColumns)
					.build(),
			);
			if (!updatedStatement) throw new HttpException("Statement not found", 404);

			await executeStatement(
				db.sql.public.FinancialAccount.update((fields, functions) => ({
					balance: functions.raw`${fields.balance} - ${amount}`.returns("pg/numeric@1"),
					updatedAt: functions.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
				}))
					.where((fields, functions) => functions.eq(fields.id, body.financialAccountId))
					.build(),
			);

			return { statement: updatedStatement, transaction: paymentTransaction };
		},
		{
			body: t.Object({
				amount: t.Optional(t.Number()),
				date: t.String(),
				financialAccountId: t.String({ maxLength: 36, minLength: 1 }),
			}),
			detail: { tags: ["Credit Cards"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
				statementId: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.get(
		"/:id/history",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			await assertCreditCardOwnership(params.id, userId);
			const history = await queryRows(
				db.sql.public.CreditCardHistory.select(
					"id",
					"creditCardId",
					"field",
					"oldValue",
					"newValue",
					"changedAt",
				)
					.where((fields, functions) => functions.eq(fields.creditCardId, params.id))
					.orderBy("changedAt", { direction: "desc" })
					.build(),
			);

			return history;
		},
		{
			detail: { tags: ["Credit Cards"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	);
