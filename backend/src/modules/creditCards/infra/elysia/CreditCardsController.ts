import { addMonths } from "date-fns";
import Elysia, { t } from "elysia";
import type { Selectable } from "kysely";
import { HttpException } from "~/shared/errors";
import { db } from "~/shared/infra/sql";
import type { CreditPurchase } from "../../../../../db/types";

export const CreditCardsController = new Elysia({ prefix: "/credit-cards" })
	.get(
		"/",
		async ({ query }) => {
			let queryBuilder = db
				.selectFrom("CreditCard")
				.innerJoin("Account", "Account.id", "CreditCard.accountId")
				.select([
					"CreditCard.id",
					"CreditCard.accountId",
					"CreditCard.creditLimit",
					"CreditCard.statementDay",
					"CreditCard.dueDay",
					"CreditCard.workingDueDate",
					"CreditCard.createdAt",
					"Account.name as accountName",
					"Account.userId",
				]);

			if (query.userId) {
				queryBuilder = queryBuilder.where("Account.userId", "=", query.userId);
			}

			const cards = await queryBuilder.orderBy("Account.name", "asc").execute();
			return cards;
		},
		{
			detail: { tags: ["Credit Cards"] },
			query: t.Object({
				userId: t.Optional(t.String({ format: "uuid" })),
			}),
		},
	)
	.get(
		"/:id",
		async ({ params }) => {
			const card = await db
				.selectFrom("CreditCard")
				.innerJoin("Account", "Account.id", "CreditCard.accountId")
				.where("CreditCard.id", "=", params.id)
				.select([
					"CreditCard.id",
					"CreditCard.accountId",
					"CreditCard.creditLimit",
					"CreditCard.statementDay",
					"CreditCard.dueDay",
					"CreditCard.workingDueDate",
					"CreditCard.createdAt",
					"Account.name as accountName",
				])
				.executeTakeFirst();

			if (!card) {
				throw new HttpException("Credit card not found", 404);
			}

			return card;
		},
		{
			detail: { tags: ["Credit Cards"] },
			params: t.Object({
				id: t.String({ format: "uuid" }),
			}),
		},
	)
	.get(
		"/:id/statements",
		async ({ params, query }) => {
			let queryBuilder = db
				.selectFrom("CreditCardStatement")
				.where("creditCardId", "=", params.id)
				.selectAll();

			if (query.isPaid !== undefined) {
				queryBuilder = queryBuilder.where("isPaid", "=", query.isPaid);
			}

			const statements = await queryBuilder.orderBy("statementDate", "desc").execute();
			return statements;
		},
		{
			detail: { tags: ["Credit Cards"] },
			params: t.Object({
				id: t.String({ format: "uuid" }),
			}),
			query: t.Object({
				isPaid: t.Optional(t.Boolean()),
			}),
		},
	)
	.get(
		"/:id/statements/:statementId",
		async ({ params }) => {
			const statement = await db
				.selectFrom("CreditCardStatement")
				.where("id", "=", params.statementId)
				.where("creditCardId", "=", params.id)
				.selectAll()
				.executeTakeFirst();

			if (!statement) {
				throw new HttpException("Statement not found", 404);
			}

			const purchases = await db
				.selectFrom("CreditPurchase")
				.leftJoin("Category", "Category.id", "CreditPurchase.categoryId")
				.where("CreditPurchase.statementId", "=", params.statementId)
				.select([
					"CreditPurchase.id",
					"CreditPurchase.description",
					"CreditPurchase.totalAmount",
					"CreditPurchase.installments",
					"CreditPurchase.currentInstallment",
					"CreditPurchase.installmentAmount",
					"CreditPurchase.purchaseDate",
					"CreditPurchase.createdAt",
					"Category.name as categoryName",
					"Category.color as categoryColor",
				])
				.orderBy("CreditPurchase.purchaseDate", "desc")
				.execute();

			return { ...statement, purchases };
		},
		{
			detail: { tags: ["Credit Cards"] },
			params: t.Object({
				id: t.String({ format: "uuid" }),
				statementId: t.String({ format: "uuid" }),
			}),
		},
	)
	.post(
		"/:id/purchases",
		async ({ params, body }) => {
			const card = await db
				.selectFrom("CreditCard")
				.where("id", "=", params.id)
				.selectAll()
				.executeTakeFirst();

			if (!card) {
				throw new HttpException("Credit card not found", 404);
			}

			const purchaseDate = new Date(body.purchaseDate);
			const installments = body.installments ?? 1;
			const installmentAmount = body.totalAmount / installments;

			// Create purchases for each installment
			const createdPurchases: Selectable<CreditPurchase>[] = [];

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
				let statement = await db
					.selectFrom("CreditCardStatement")
					.where("creditCardId", "=", params.id)
					.where("statementDate", "=", statementDate)
					.selectAll()
					.executeTakeFirst();

				if (!statement) {
					statement = await db
						.insertInto("CreditCardStatement")
						.values({
							creditCardId: params.id,
							dueDate,
							statementDate,
							totalAmount: 0,
						})
						.returningAll()
						.executeTakeFirstOrThrow();
				}

				// Create purchase
				const purchase = await db
					.insertInto("CreditPurchase")
					.values({
						categoryId: body.categoryId,
						currentInstallment: i + 1,
						description: body.description,
						installmentAmount,
						installments,
						parentId: createdPurchases[0]?.id,
						purchaseDate,
						statementId: statement.id,
						totalAmount: body.totalAmount,
					})
					.returningAll()
					.executeTakeFirstOrThrow();

				createdPurchases.push(purchase);

				// Update statement total
				await db
					.updateTable("CreditCardStatement")
					.set(eb => ({
						totalAmount: eb("totalAmount", "+", installmentAmount),
						updatedAt: new Date(),
					}))
					.where("id", "=", statement.id)
					.execute();
			}

			return createdPurchases;
		},
		{
			body: t.Object({
				categoryId: t.Optional(t.String({ format: "uuid" })),
				description: t.String({ maxLength: 500 }),
				installments: t.Optional(t.Number({ maximum: 48, minimum: 1 })),
				purchaseDate: t.String(),
				totalAmount: t.Number(),
			}),
			detail: { tags: ["Credit Cards"] },
			params: t.Object({
				id: t.String({ format: "uuid" }),
			}),
		},
	)
	.post(
		"/:id/statements/:statementId/pay",
		async ({ params, body }) => {
			const statement = await db
				.selectFrom("CreditCardStatement")
				.where("id", "=", params.statementId)
				.where("creditCardId", "=", params.id)
				.selectAll()
				.executeTakeFirst();

			if (!statement) {
				throw new HttpException("Statement not found", 404);
			}

			const paymentAmount = body.amount ?? Number(statement.totalAmount) - Number(statement.paidAmount);

			const updatedStatement = await db
				.updateTable("CreditCardStatement")
				.set(eb => ({
					isPaid: Number(statement.paidAmount) + paymentAmount >= Number(statement.totalAmount),
					paidAmount: eb("paidAmount", "+", paymentAmount),
					updatedAt: new Date(),
				}))
				.where("id", "=", params.statementId)
				.returningAll()
				.executeTakeFirstOrThrow();

			// Deduct from account if provided
			if (body.accountId) {
				await db
					.updateTable("Account")
					.set(eb => ({
						balance: eb("balance", "-", paymentAmount),
						updatedAt: new Date(),
					}))
					.where("id", "=", body.accountId)
					.execute();
			}

			return updatedStatement;
		},
		{
			body: t.Object({
				accountId: t.Optional(t.String({ format: "uuid" })),
				amount: t.Optional(t.Number()),
			}),
			detail: { tags: ["Credit Cards"] },
			params: t.Object({
				id: t.String({ format: "uuid" }),
				statementId: t.String({ format: "uuid" }),
			}),
		},
	)
	.get(
		"/:id/history",
		async ({ params }) => {
			const history = await db
				.selectFrom("CreditCardHistory")
				.where("creditCardId", "=", params.id)
				.selectAll()
				.orderBy("changedAt", "desc")
				.execute();

			return history;
		},
		{
			detail: { tags: ["Credit Cards"] },
			params: t.Object({
				id: t.String({ format: "uuid" }),
			}),
		},
	);
