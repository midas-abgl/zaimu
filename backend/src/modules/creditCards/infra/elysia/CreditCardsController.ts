import { addDays, addMonths, addWeeks, addYears, isAfter, startOfDay } from "date-fns";
import Elysia, { t } from "elysia";
import {
	assertBalanceAccountOwnership,
	assertCreditCardOwnership,
	assertDirectOwnership,
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
	deleteCreatorDebtEventForPurchase,
	linkPurchaseToDebt,
	syncPurchaseDebtEvent,
} from "~/modules/debts/application";
import { resolveStore } from "~/modules/stores/application/resolve-store";
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
	"cashbackAccountId",
	"cashbackAmount",
	"cashbackYieldPeriod",
	"cashbackYieldRate",
	"description",
	"storeName",
	"totalAmount",
	"installments",
	"currentInstallment",
	"installmentAmount",
	"purchaseDate",
	"time",
	"categoryId",
	"parentId",
	"settledByPurchaseId",
	"isSettled",
	"refinancingFeeAmount",
	"subscriptionId",
	"subscriptionOccurrenceDate",
	"createdAt",
	"updatedAt",
] as const;
const forecastStatementId = (statementDate: Date) => `forecast-${statementDate.toISOString().slice(0, 10)}`;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
const toCents = (amount: number | string) => Math.round(Number(amount) * 100);
const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

function applyStatementCredits<
	T extends {
		id: string;
		isPaid: boolean;
		paidAmount: number | string;
		statementDate: Date;
		totalAmount: number | string;
	},
>(statements: T[], today = new Date()): Array<T & { balanceAmount: number }> {
	let carriedCreditInCents = 0;
	const effectiveById = new Map<string, { balanceAmount: number; isPaid: boolean }>();
	const todayKey = toDateKey(today);

	const chronologicalStatements = statements.toSorted(
		(left, right) => left.statementDate.getTime() - right.statementDate.getTime(),
	);
	for (const statement of chronologicalStatements) {
		const paidAmountInCents = toCents(statement.paidAmount);
		const appliedAmountInCents = paidAmountInCents + carriedCreditInCents;
		const rawBalanceInCents = toCents(statement.totalAmount) - appliedAmountInCents;
		const isClosed = toDateKey(statement.statementDate) <= todayKey;
		const balanceAmount = (paidAmountInCents > 0 ? Math.max(0, rawBalanceInCents) : rawBalanceInCents) / 100;
		carriedCreditInCents = Math.max(0, -rawBalanceInCents);
		effectiveById.set(statement.id, {
			balanceAmount,
			isPaid: isClosed && appliedAmountInCents > 0 && rawBalanceInCents <= 0,
		});
	}

	return statements.map(statement => ({ ...statement, ...effectiveById.get(statement.id)! }));
}

function resolvePurchaseTime(value: string | null | undefined): string | null {
	if (value === null) return null;
	if (value !== undefined) {
		if (!timePattern.test(value)) throw new HttpException("Informe um horário válido", 400);
		return value;
	}
	return new Date().toTimeString().slice(0, 5);
}

function forecastInstallments(
	card: { dueDay: number; statementDay: number },
	purchases: CreditPurchaseRow[],
) {
	const forecasts = new Map<string, { dueDate: Date; purchases: CreditPurchaseRow[]; statementDate: Date }>();
	for (const purchase of purchases.filter(
		item => !item.parentId && item.installments > item.currentInstallment,
	)) {
		for (
			let installment = purchase.currentInstallment + 1;
			installment <= purchase.installments;
			installment++
		) {
			const occurrenceDate = addMonths(purchase.purchaseDate, installment - 1);
			const { dueDate, statementDate } = getStatementDates(card, occurrenceDate);
			const key = statementDate.toISOString().slice(0, 10);
			const forecast = forecasts.get(key) ?? { dueDate, purchases: [], statementDate };
			forecast.purchases.push({
				...purchase,
				currentInstallment: installment,
				statementId: forecastStatementId(statementDate),
			});
			forecasts.set(key, forecast);
		}
	}
	return forecasts;
}
interface CreditPurchaseRow {
	id: string;
	statementId: string;
	cashbackAccountId?: string | null;
	cashbackAmount?: number | null;
	cashbackYieldPeriod?: string | null;
	cashbackYieldRate?: number | null;
	description: string;
	storeName: string | null;
	totalAmount: number;
	installments: number;
	currentInstallment: number;
	installmentAmount: number;
	purchaseDate: Date;
	time: string | null;
	categoryId: string | null;
	parentId: string | null;
	settledByPurchaseId: string | null;
	isSettled: boolean;
	refinancingFeeAmount: number | null;
	subscriptionId?: string | null;
	subscriptionOccurrenceDate?: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

interface CashbackCard {
	cashbackAccountId: string | null;
	cashbackRate: number | null;
	cashbackYieldPeriod: string | null;
	cashbackYieldRate: number | null;
}

interface CashbackSnapshot {
	cashbackAccountId?: string;
	cashbackAmount?: string;
	cashbackYieldPeriod?: "MONTHLY" | "YEARLY";
	cashbackYieldRate?: string;
}

function cashbackSnapshot(card: CashbackCard, totalAmount: number): CashbackSnapshot {
	if (!card.cashbackAccountId || !card.cashbackRate) return {};
	const cashbackYieldPeriod =
		card.cashbackYieldPeriod === "MONTHLY" || card.cashbackYieldPeriod === "YEARLY"
			? card.cashbackYieldPeriod
			: undefined;
	return {
		cashbackAccountId: card.cashbackAccountId,
		cashbackAmount: String(Number(((totalAmount * card.cashbackRate) / 100).toFixed(4))),
		cashbackYieldPeriod,
		...(card.cashbackYieldRate !== null && { cashbackYieldRate: String(card.cashbackYieldRate) }),
	};
}

type SubscriptionFrequency = "BIWEEKLY" | "DAILY" | "MONTHLY" | "WEEKLY" | "YEARLY";

function subscriptionOccurrences(
	subscription: {
		billingDay: number;
		endDate: Date | null;
		frequency: SubscriptionFrequency;
		startDate: Date;
	},
	until: Date,
) {
	const occurrences: Date[] = [];
	const start = startOfDay(subscription.startDate);
	const end = startOfDay(subscription.endDate && subscription.endDate < until ? subscription.endDate : until);
	let occurrence = start;
	if (subscription.frequency === "MONTHLY") {
		const first = new Date(
			start.getFullYear(),
			start.getMonth(),
			Math.min(subscription.billingDay, new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()),
		);
		occurrence =
			first < start
				? new Date(
						start.getFullYear(),
						start.getMonth() + 1,
						Math.min(
							subscription.billingDay,
							new Date(start.getFullYear(), start.getMonth() + 2, 0).getDate(),
						),
					)
				: first;
	}
	while (!isAfter(occurrence, end)) {
		occurrences.push(occurrence);
		switch (subscription.frequency) {
			case "DAILY":
				occurrence = addDays(occurrence, 1);
				break;
			case "WEEKLY":
				occurrence = addWeeks(occurrence, 1);
				break;
			case "BIWEEKLY":
				occurrence = addWeeks(occurrence, 2);
				break;
			case "MONTHLY": {
				const nextMonth = new Date(occurrence.getFullYear(), occurrence.getMonth() + 1, 1);
				occurrence = new Date(
					nextMonth.getFullYear(),
					nextMonth.getMonth(),
					Math.min(
						subscription.billingDay,
						new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate(),
					),
				);
				break;
			}
			case "YEARLY":
				occurrence = addYears(occurrence, 1);
				break;
		}
	}
	return occurrences;
}

function getStatementDates(card: { dueDay: number; statementDay: number }, purchaseDate: Date) {
	const statementMonth =
		purchaseDate.getDate() > card.statementDay ? addMonths(purchaseDate, 1) : purchaseDate;
	const statementDate = new Date(statementMonth.getFullYear(), statementMonth.getMonth(), card.statementDay);
	const dueDate = new Date(statementMonth.getFullYear(), statementMonth.getMonth(), card.dueDay);
	if (dueDate <= statementDate) dueDate.setMonth(dueDate.getMonth() + 1);
	return { dueDate, statementDate };
}

async function materializeMonthlyStatements(
	creditCardId: string,
	card: { createdAt: Date; dueDay: number; statementDay: number },
	today = new Date(),
) {
	const oldestStatement = await queryFirst(
		db.sql.public.CreditCardStatement.select("statementDate")
			.where((fields, functions) => functions.eq(fields.creditCardId, creditCardId))
			.orderBy("statementDate", { direction: "asc" })
			.limit(1)
			.build(),
	);
	const firstStatementDate =
		oldestStatement?.statementDate ?? getStatementDates(card, card.createdAt).statementDate;
	const lastStatementDate = getStatementDates(card, today).statementDate;
	let month = new Date(firstStatementDate.getFullYear(), firstStatementDate.getMonth(), 1);
	const lastMonth = new Date(lastStatementDate.getFullYear(), lastStatementDate.getMonth(), 1);

	while (month <= lastMonth) {
		const { dueDate, statementDate } = getStatementDates(card, month);
		await getOrCreateStatement(creditCardId, dueDate, statementDate);
		month = addMonths(month, 1);
	}
}

async function getOrCreateStatement(creditCardId: string, dueDate: Date, statementDate: Date) {
	await queryFirst(
		db.raw.sql`
			INSERT INTO "CreditCardStatement" ("creditCardId", "dueDate", "statementDate", "totalAmount")
			VALUES (
				${param(creditCardId, { codecId: "sql/varchar@1" })},
				${param(dueDate, { codecId: "pg/date@1" })},
				${param(statementDate, { codecId: "pg/date@1" })},
				0
			)
			ON CONFLICT ("creditCardId", "statementDate") DO NOTHING
			RETURNING "id"
		`
			.returnsRow({ id: db.sql.public.CreditCardStatement.columns.id })
			.build(),
	);
	const statement = await queryFirst(
		db.sql.public.CreditCardStatement.select(...statementColumns)
			.where((fields, functions) =>
				functions.and(
					functions.eq(fields.creditCardId, creditCardId),
					functions.eq(fields.statementDate, statementDate),
				),
			)
			.limit(1)
			.build(),
	);
	if (!statement) throw new HttpException("Statement not created", 500);
	return statement;
}

async function materializeDueSubscriptionPurchases(
	creditCardId: string,
	financialAccountId: string,
	card: CashbackCard & { dueDay: number; statementDay: number },
	today = new Date(),
) {
	const subscriptions = await queryRows(
		db.sql.public.Subscription.select(
			"amount",
			"billingDay",
			"endDate",
			"frequency",
			"id",
			"materializedThrough",
			"name",
			"startDate",
			"storeName",
		)
			.where((fields, functions) =>
				functions.and(
					functions.eq(fields.financialAccountId, financialAccountId),
					functions.eq(fields.isActive, true),
					functions.eq(fields.paymentMethod, "CREDIT"),
				),
			)
			.build(),
	);
	if (subscriptions.length === 0) return;
	const existing = await queryRows(
		db.sql.public.CreditPurchase.select("subscriptionId", "subscriptionOccurrenceDate")
			.where((fields, functions) =>
				functions.in(
					fields.subscriptionId,
					subscriptions.map(subscription => subscription.id),
				),
			)
			.build(),
	);
	const materialized = new Set(
		existing.flatMap(purchase =>
			purchase.subscriptionId && purchase.subscriptionOccurrenceDate
				? [`${purchase.subscriptionId}:${purchase.subscriptionOccurrenceDate.toISOString().slice(0, 10)}`]
				: [],
		),
	);
	const tagsBySubscription = await getTagsByEntity(
		tagEntityType.subscription,
		subscriptions.map(subscription => subscription.id),
	);
	for (const subscription of subscriptions) {
		for (const occurrenceDate of subscriptionOccurrences(
			subscription as typeof subscription & { frequency: SubscriptionFrequency },
			today,
		)) {
			if (!isAfter(occurrenceDate, startOfDay(subscription.materializedThrough))) continue;
			const occurrenceKey = `${subscription.id}:${occurrenceDate.toISOString().slice(0, 10)}`;
			if (materialized.has(occurrenceKey)) continue;
			const { dueDate, statementDate } = getStatementDates(card, occurrenceDate);
			let statement = await queryFirst(
				db.sql.public.CreditCardStatement.select(...statementColumns)
					.where((fields, functions) =>
						functions.and(
							functions.eq(fields.creditCardId, creditCardId),
							functions.eq(fields.statementDate, statementDate),
						),
					)
					.limit(1)
					.build(),
			);
			if (!statement) {
				statement = await queryFirst(
					db.sql.public.CreditCardStatement.insert([
						{ creditCardId, dueDate, statementDate, totalAmount: "0" },
					])
						.returning(...statementColumns)
						.build(),
				);
			}
			if (!statement) throw new HttpException("Statement not created", 500);
			const purchase = await queryFirst(
				db.raw.sql`
					INSERT INTO "CreditPurchase" (
						"cashbackAccountId",
						"cashbackAmount",
						"cashbackYieldPeriod",
						"cashbackYieldRate",
						"currentInstallment",
						"description",
						"installmentAmount",
						"installments",
						"purchaseDate",
						"statementId",
						"storeName",
						"subscriptionId",
						"subscriptionOccurrenceDate",
						"time",
						"totalAmount"
					)
					VALUES (
						${param(card.cashbackAccountId, { codecId: "sql/varchar@1" })},
						${param(card.cashbackAccountId && card.cashbackRate ? numeric<18, 4>((Number(subscription.amount) * card.cashbackRate) / 100) : null, { codecId: "pg/numeric@1" })},
						${param(card.cashbackYieldPeriod, { codecId: "sql/varchar@1" })}::"CashbackYieldPeriod",
						${param(card.cashbackYieldRate === null ? null : numeric<7, 4>(card.cashbackYieldRate), { codecId: "pg/numeric@1" })},
						1,
						${param(subscription.name, { codecId: "sql/varchar@1" })},
						${param(numeric<12, 2>(subscription.amount), { codecId: "pg/numeric@1" })},
						1,
						${param(occurrenceDate, { codecId: "pg/date@1" })},
						${param(statement.id, { codecId: "sql/varchar@1" })},
						${param(subscription.storeName, { codecId: "sql/varchar@1" })},
						${param(subscription.id, { codecId: "sql/varchar@1" })},
						${param(occurrenceDate, { codecId: "pg/date@1" })},
						NULL,
						${param(numeric<12, 2>(subscription.amount), { codecId: "pg/numeric@1" })}
					)
					ON CONFLICT ("subscriptionId", "subscriptionOccurrenceDate") DO NOTHING
					RETURNING "id"
				`
					.returnsRow({ id: db.sql.public.CreditPurchase.columns.id })
					.build(),
			);
			if (!purchase) continue;
			materialized.add(occurrenceKey);
			const tagIds = (tagsBySubscription.get(subscription.id) ?? []).map(tag => tag.id);
			await replaceEntityTags({
				entityIds: [purchase.id],
				entityType: tagEntityType.creditPurchase,
				tagIds,
			});
			const amount = param(numeric<12, 2>(subscription.amount), { codecId: "pg/numeric@1" });
			await executeStatement(
				db.sql.public.CreditCardStatement.update((fields, functions) => ({
					totalAmount: functions.raw`${fields.totalAmount} + ${amount}`.returns("pg/numeric@1"),
					updatedAt: functions.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
				}))
					.where((fields, functions) => functions.eq(fields.id, statement.id))
					.build(),
			);
		}
		await executeStatement(
			db.sql.public.Subscription.update({ materializedThrough: startOfDay(today) } as never)
				.where((fields, functions) => functions.eq(fields.id, subscription.id))
				.build(),
		);
	}
}

async function forecastSubscriptionPurchases(
	financialAccountId: string,
	card: { dueDay: number; statementDay: number },
	today = new Date(),
) {
	const subscriptions = await queryRows(
		db.sql.public.Subscription.select(
			"amount",
			"billingDay",
			"endDate",
			"frequency",
			"id",
			"name",
			"startDate",
			"storeName",
		)
			.where((fields, functions) =>
				functions.and(
					functions.eq(fields.financialAccountId, financialAccountId),
					functions.eq(fields.isActive, true),
					functions.eq(fields.paymentMethod, "CREDIT"),
				),
			)
			.build(),
	);
	const forecasts = new Map<string, { dueDate: Date; purchases: CreditPurchaseRow[]; statementDate: Date }>();
	const horizon = addMonths(startOfDay(today), 12);
	for (const subscription of subscriptions) {
		for (const occurrenceDate of subscriptionOccurrences(
			subscription as typeof subscription & { frequency: SubscriptionFrequency },
			horizon,
		)) {
			if (!isAfter(occurrenceDate, startOfDay(today))) continue;
			const { dueDate, statementDate } = getStatementDates(card, occurrenceDate);
			const key = statementDate.toISOString().slice(0, 10);
			const forecast = forecasts.get(key) ?? { dueDate, purchases: [], statementDate };
			forecast.purchases.push({
				categoryId: null,
				createdAt: new Date(),
				currentInstallment: 1,
				description: subscription.name,
				id: `subscription-${subscription.id}-${occurrenceDate.toISOString().slice(0, 10)}`,
				installmentAmount: Number(subscription.amount),
				installments: 1,
				isSettled: false,
				parentId: null,
				purchaseDate: occurrenceDate,
				refinancingFeeAmount: null,
				settledByPurchaseId: null,
				statementId: forecastStatementId(statementDate),
				storeName: subscription.storeName,
				subscriptionId: subscription.id,
				subscriptionOccurrenceDate: occurrenceDate,
				time: null,
				totalAmount: Number(subscription.amount),
				updatedAt: new Date(),
			});
			forecasts.set(key, forecast);
		}
	}
	return forecasts;
}

function mergeForecasts(
	...forecasts: Map<string, { dueDate: Date; purchases: CreditPurchaseRow[]; statementDate: Date }>[]
) {
	const merged = new Map<string, { dueDate: Date; purchases: CreditPurchaseRow[]; statementDate: Date }>();
	for (const source of forecasts) {
		for (const [key, forecast] of source) {
			const current = merged.get(key) ?? {
				dueDate: forecast.dueDate,
				purchases: [],
				statementDate: forecast.statementDate,
			};
			current.purchases.push(...forecast.purchases);
			merged.set(key, current);
		}
	}
	return merged;
}

const findPurchaseForCard = (creditCardId: string, purchaseId: string) =>
	queryFirst(
		db.sql.public.CreditPurchase.innerJoin(db.sql.public.CreditCardStatement, (fields, functions) =>
			functions.eq(fields.CreditPurchase.statementId, fields.CreditCardStatement.id),
		)
			.select(fields => ({
				cashbackAccountId: fields.CreditPurchase.cashbackAccountId,
				cashbackAmount: fields.CreditPurchase.cashbackAmount,
				cashbackYieldPeriod: fields.CreditPurchase.cashbackYieldPeriod,
				cashbackYieldRate: fields.CreditPurchase.cashbackYieldRate,
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
						cashbackAccountId: fields.CreditCard.cashbackAccountId,
						cashbackRate: fields.CreditCard.cashbackRate,
						cashbackYieldPeriod: fields.CreditCard.cashbackYieldPeriod,
						cashbackYieldRate: fields.CreditCard.cashbackYieldRate,
						createdAt: fields.CreditCard.createdAt,
						creditLimit: fields.CreditCard.creditLimit,
						dueDay: fields.CreditCard.dueDay,
						excludeFromTotals: fields.CreditCard.excludeFromTotals,
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
						cashbackAccountId: fields.CreditCard.cashbackAccountId,
						cashbackRate: fields.CreditCard.cashbackRate,
						cashbackYieldPeriod: fields.CreditCard.cashbackYieldPeriod,
						cashbackYieldRate: fields.CreditCard.cashbackYieldRate,
						createdAt: fields.CreditCard.createdAt,
						creditLimit: fields.CreditCard.creditLimit,
						dueDay: fields.CreditCard.dueDay,
						excludeFromTotals: fields.CreditCard.excludeFromTotals,
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
			const card = await queryFirst(
				db.sql.public.CreditCard.select(
					"cashbackAccountId",
					"cashbackRate",
					"cashbackYieldPeriod",
					"cashbackYieldRate",
					"createdAt",
					"dueDay",
					"financialAccountId",
					"statementDay",
				)
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.limit(1)
					.build(),
			);
			if (!card) throw new HttpException("Credit card not found", 404);
			await materializeMonthlyStatements(params.id, card);
			await materializeDueSubscriptionPurchases(params.id, card.financialAccountId, card);
			const queryBuilder = db.sql.public.CreditCardStatement.select(...statementColumns).where(
				(fields, functions) => functions.eq(fields.creditCardId, params.id),
			);
			const statements = await queryRows(
				queryBuilder.orderBy("statementDate", { direction: "desc" }).build(),
			);
			const purchases = (await queryRows(
				db.sql.public.CreditPurchase.innerJoin(db.sql.public.CreditCardStatement, (fields, functions) =>
					functions.eq(fields.CreditPurchase.statementId, fields.CreditCardStatement.id),
				)
					.select(fields => ({
						categoryId: fields.CreditPurchase.categoryId,
						createdAt: fields.CreditPurchase.createdAt,
						currentInstallment: fields.CreditPurchase.currentInstallment,
						description: fields.CreditPurchase.description,
						id: fields.CreditPurchase.id,
						installmentAmount: fields.CreditPurchase.installmentAmount,
						installments: fields.CreditPurchase.installments,
						parentId: fields.CreditPurchase.parentId,
						purchaseDate: fields.CreditPurchase.purchaseDate,
						statementId: fields.CreditPurchase.statementId,
						time: fields.CreditPurchase.time,
						totalAmount: fields.CreditPurchase.totalAmount,
						updatedAt: fields.CreditPurchase.updatedAt,
					}))
					.where((fields, functions) => functions.eq(fields.CreditCardStatement.creditCardId, params.id))
					.build(),
			)) as unknown as CreditPurchaseRow[];
			const statementDates = new Set(
				statements.map(statement => statement.statementDate.toISOString().slice(0, 10)),
			);
			const forecasts = [
				...mergeForecasts(
					forecastInstallments(card, purchases),
					await forecastSubscriptionPurchases(card.financialAccountId, card),
				).values(),
			]
				.filter(forecast => !statementDates.has(forecast.statementDate.toISOString().slice(0, 10)))
				.map(forecast => ({
					createdAt: new Date(),
					creditCardId: params.id,
					dueDate: forecast.dueDate,
					id: forecastStatementId(forecast.statementDate),
					isForecast: true,
					isPaid: false,
					paidAmount: "0",
					statementDate: forecast.statementDate,
					totalAmount: String(
						forecast.purchases.reduce((total, purchase) => total + purchase.installmentAmount, 0),
					),
					updatedAt: new Date(),
				}));
			const statementsWithCredits = applyStatementCredits([...statements, ...forecasts]);
			return query.isPaid === undefined
				? statementsWithCredits
				: statementsWithCredits.filter(statement => statement.isPaid === query.isPaid);
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
			if (params.statementId.startsWith("forecast-")) {
				const statementDate = new Date(`${params.statementId.slice("forecast-".length)}T12:00:00Z`);
				if (Number.isNaN(statementDate.getTime())) throw new HttpException("Statement not found", 404);
				const card = await queryFirst(
					db.sql.public.CreditCard.select(
						"cashbackAccountId",
						"cashbackRate",
						"cashbackYieldPeriod",
						"cashbackYieldRate",
						"createdAt",
						"dueDay",
						"financialAccountId",
						"statementDay",
					)
						.where((fields, functions) => functions.eq(fields.id, params.id))
						.limit(1)
						.build(),
				);
				if (!card) throw new HttpException("Credit card not found", 404);
				await materializeMonthlyStatements(params.id, card);
				await materializeDueSubscriptionPurchases(params.id, card.financialAccountId, card);
				const purchases = (await queryRows(
					db.sql.public.CreditPurchase.innerJoin(db.sql.public.CreditCardStatement, (fields, functions) =>
						functions.eq(fields.CreditPurchase.statementId, fields.CreditCardStatement.id),
					)
						.select(fields => ({
							categoryId: fields.CreditPurchase.categoryId,
							createdAt: fields.CreditPurchase.createdAt,
							currentInstallment: fields.CreditPurchase.currentInstallment,
							description: fields.CreditPurchase.description,
							id: fields.CreditPurchase.id,
							installmentAmount: fields.CreditPurchase.installmentAmount,
							installments: fields.CreditPurchase.installments,
							parentId: fields.CreditPurchase.parentId,
							purchaseDate: fields.CreditPurchase.purchaseDate,
							statementId: fields.CreditPurchase.statementId,
							time: fields.CreditPurchase.time,
							totalAmount: fields.CreditPurchase.totalAmount,
							updatedAt: fields.CreditPurchase.updatedAt,
						}))
						.where((fields, functions) => functions.eq(fields.CreditCardStatement.creditCardId, params.id))
						.build(),
				)) as unknown as CreditPurchaseRow[];
				const forecast = mergeForecasts(
					forecastInstallments(card, purchases),
					await forecastSubscriptionPurchases(card.financialAccountId, card),
				).get(statementDate.toISOString().slice(0, 10));
				if (!forecast) throw new HttpException("Statement not found", 404);
				const balanceAmount = forecast.purchases.reduce(
					(total, purchase) => total + purchase.installmentAmount,
					0,
				);
				return {
					balanceAmount,
					createdAt: new Date(),
					creditCardId: params.id,
					dueDate: forecast.dueDate,
					id: params.statementId,
					isForecast: true,
					isPaid: false,
					paidAmount: "0",
					payments: [],
					purchases: forecast.purchases.map(purchase => ({ ...purchase, isForecast: true })),
					statementDate: forecast.statementDate,
					totalAmount: String(
						forecast.purchases.reduce((total, purchase) => total + purchase.installmentAmount, 0),
					),
					updatedAt: new Date(),
				};
			}
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
			const payments = await queryRows(
				db.sql.public.Transaction.select(
					"amount",
					"createdAt",
					"creditCardStatementId",
					"date",
					"description",
					"id",
					"time",
					"type",
				)
					.where((fields, functions) => functions.eq(fields.creditCardStatementId, params.statementId))
					.orderBy("date", { direction: "desc" })
					.build(),
			);
			const tagsByPurchase = await getTagsByEntity(
				tagEntityType.creditPurchase,
				purchases.map(purchase => purchase.id),
			);
			const debtRefs = await debtRefsForPurchases([
				...new Set(purchases.map(purchase => purchase.parentId ?? purchase.id)),
			]);

			return {
				...statement,
				balanceAmount: Number(statement.totalAmount) - Number(statement.paidAmount),
				payments,
				purchases: purchases.map(purchase => {
					const tags = tagsByPurchase.get(purchase.id) ?? [];
					return {
						...purchase,
						...debtRefs.get(purchase.parentId ?? purchase.id),
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
				db.sql.public.CreditCard.select(
					"cashbackAccountId",
					"cashbackRate",
					"cashbackYieldPeriod",
					"cashbackYieldRate",
					"id",
					"statementDay",
					"dueDay",
					"financialAccountId",
				)
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.limit(1)
					.build(),
			);

			if (!card) {
				throw new HttpException("Credit card not found", 404);
			}
			if ((body.subscriptionId === undefined) !== (body.subscriptionOccurrenceDate === undefined)) {
				throw new HttpException("Informe a assinatura e a data da ocorrência juntas", 400);
			}
			if (body.subscriptionId && body.subscriptionOccurrenceDate) {
				await assertDirectOwnership("Subscription", body.subscriptionId, userId);
				const subscription = await queryFirst(
					db.sql.public.Subscription.select("financialAccountId")
						.where((fields, functions) => functions.eq(fields.id, body.subscriptionId!))
						.limit(1)
						.build(),
				);
				if (subscription?.financialAccountId !== card.financialAccountId) {
					throw new HttpException("A assinatura não pertence a este cartão", 400);
				}
				if ((body.installments ?? 1) !== 1) {
					throw new HttpException("Uma ocorrência de assinatura não pode ser parcelada", 400);
				}
				const existingPurchase = await queryFirst(
					db.sql.public.CreditPurchase.select(...purchaseColumns)
						.where((fields, functions) =>
							functions.and(
								functions.eq(fields.subscriptionId, body.subscriptionId!),
								functions.eq(fields.subscriptionOccurrenceDate, new Date(body.subscriptionOccurrenceDate!)),
							),
						)
						.limit(1)
						.build(),
				);
				if (existingPurchase) {
					const tags =
						(await getTagsByEntity(tagEntityType.creditPurchase, [existingPurchase.id])).get(
							existingPurchase.id,
						) ?? [];
					return [
						{
							...existingPurchase,
							installmentAmount: Number(existingPurchase.installmentAmount),
							tagIds: tags.map(tag => tag.id),
							tags,
							totalAmount: Number(existingPurchase.totalAmount),
						},
					];
				}
			}

			const purchaseDate = new Date(body.purchaseDate);
			const time = body.subscriptionId ? null : resolvePurchaseTime(body.time);
			const installments = body.installments ?? 1;
			if (body.storeName) await resolveStore(userId, body.storeName);
			const installmentAmount = body.totalAmount / installments;
			const cashback = cashbackSnapshot(card, body.totalAmount);

			const { dueDate, statementDate } = getStatementDates(card, purchaseDate);
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
				try {
					statement = await queryFirst(
						db.sql.public.CreditCardStatement.insert([
							{ creditCardId: params.id, dueDate, statementDate, totalAmount: "0" },
						])
							.returning(...statementColumns)
							.build(),
					);
				} catch {
					statement = await queryFirst(
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
				}
				if (!statement) throw new HttpException("Statement not created", 500);
			}
			let purchase = body.subscriptionId
				? undefined
				: await queryFirst(
						db.sql.public.CreditPurchase.insert([
							{
								categoryId: tagIds[0],
								...cashback,
								currentInstallment: 1,
								description: body.description ?? "",
								installmentAmount: String(installmentAmount),
								installments,
								purchaseDate,
								statementId: statement.id,
								storeName: body.storeName,
								time,
								totalAmount: String(body.totalAmount),
							},
						])
							.returning(...purchaseColumns)
							.build(),
					);
			if (body.subscriptionId && body.subscriptionOccurrenceDate) {
				const inserted = await queryFirst(
					db.raw.sql`
					INSERT INTO "CreditPurchase" (
						"cashbackAccountId", "cashbackAmount", "cashbackYieldPeriod", "cashbackYieldRate",
						"categoryId", "currentInstallment", "description", "installmentAmount", "installments",
							"purchaseDate", "statementId", "storeName", "subscriptionId",
							"subscriptionOccurrenceDate", "time", "totalAmount"
						)
					VALUES (
						${param(card.cashbackAccountId, { codecId: "sql/varchar@1" })},
						${param(card.cashbackAccountId && card.cashbackRate ? numeric<18, 4>((body.totalAmount * card.cashbackRate) / 100) : null, { codecId: "pg/numeric@1" })},
						${param(card.cashbackAccountId ? card.cashbackYieldPeriod : null, { codecId: "sql/varchar@1" })}::"CashbackYieldPeriod",
						${param(card.cashbackAccountId && card.cashbackYieldRate !== null ? numeric<7, 4>(card.cashbackYieldRate) : null, { codecId: "pg/numeric@1" })},
						${param(tagIds[0] ?? null, { codecId: "sql/varchar@1" })}, 1,
							${param(body.description ?? "", { codecId: "sql/varchar@1" })},
							${param(numeric<12, 2>(installmentAmount), { codecId: "pg/numeric@1" })}, 1,
							${param(purchaseDate, { codecId: "pg/date@1" })},
							${param(statement.id, { codecId: "sql/varchar@1" })},
							${param(body.storeName ?? null, { codecId: "sql/varchar@1" })},
							${param(body.subscriptionId, { codecId: "sql/varchar@1" })},
							${param(new Date(body.subscriptionOccurrenceDate), { codecId: "pg/date@1" })},
							${param(time, { codecId: "pg/time@1" })},
							${param(numeric<12, 2>(body.totalAmount), { codecId: "pg/numeric@1" })}
						)
						ON CONFLICT ("subscriptionId", "subscriptionOccurrenceDate") DO NOTHING
						RETURNING "id"
					`
						.returnsRow({ id: db.sql.public.CreditPurchase.columns.id })
						.build(),
				);
				if (!inserted) {
					const existingPurchase = await queryFirst(
						db.sql.public.CreditPurchase.select(...purchaseColumns)
							.where((fields, functions) =>
								functions.and(
									functions.eq(fields.subscriptionId, body.subscriptionId!),
									functions.eq(fields.subscriptionOccurrenceDate, new Date(body.subscriptionOccurrenceDate!)),
								),
							)
							.limit(1)
							.build(),
					);
					if (!existingPurchase) throw new HttpException("Purchase not created", 500);
					const tags =
						(await getTagsByEntity(tagEntityType.creditPurchase, [existingPurchase.id])).get(
							existingPurchase.id,
						) ?? [];
					return [
						{
							...existingPurchase,
							installmentAmount: Number(existingPurchase.installmentAmount),
							tagIds: tags.map(tag => tag.id),
							tags,
							totalAmount: Number(existingPurchase.totalAmount),
						},
					];
				}
				purchase = await queryFirst(
					db.sql.public.CreditPurchase.select(...purchaseColumns)
						.where((fields, functions) => functions.eq(fields.id, inserted.id))
						.limit(1)
						.build(),
				);
			}
			if (!purchase) throw new HttpException("Purchase not created", 500);
			const createdPurchases: CreditPurchaseRow[] = [
				{
					...purchase,
					installmentAmount: Number(purchase.installmentAmount),
					totalAmount: Number(purchase.totalAmount),
				},
			];
			const amount = param(numeric<12, 2>(installmentAmount), { codecId: "pg/numeric@1" });
			await executeStatement(
				db.sql.public.CreditCardStatement.update((fields, functions) => ({
					totalAmount: functions.raw`${fields.totalAmount} + ${amount}`.returns("pg/numeric@1"),
					updatedAt: functions.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
				}))
					.where((fields, functions) => functions.eq(fields.id, statement.id))
					.build(),
			);
			await replaceEntityTags({
				entityIds: createdPurchases.map(purchase => purchase.id),
				entityType: tagEntityType.creditPurchase,
				tagIds,
			});
			const tagsByPurchase = await getTagsByEntity(
				tagEntityType.creditPurchase,
				createdPurchases.map(purchase => purchase.id),
			);
			await linkPurchaseToDebt({
				creditPurchaseId: purchase.id,
				date: body.purchaseDate,
				debtPersonId: body.debtPersonId,
				description: body.description,
				matchEventId: body.matchDebtEventId,
				totalAmount: body.totalAmount,
				userId,
			});

			return createdPurchases.map(purchase => {
				const tags = tagsByPurchase.get(purchase.id) ?? [];
				return { ...purchase, tagIds: tags.map(tag => tag.id), tags };
			});
		},
		{
			body: t.Object({
				categoryId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				debtPersonId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				description: t.Optional(t.String({ maxLength: 500 })),
				installments: t.Optional(t.Number({ maximum: 48, minimum: 1 })),
				matchDebtEventId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				purchaseDate: t.String(),
				storeName: t.Optional(t.String({ maxLength: 200 })),
				subscriptionId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				subscriptionOccurrenceDate: t.Optional(t.String()),
				tagIds: t.Optional(t.Array(t.String({ maxLength: 36, minLength: 1 }), { maxItems: 20 })),
				time: t.Optional(t.Nullable(t.String({ pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d)?$" }))),
				totalAmount: t.Number(),
			}),
			detail: { tags: ["Credit Cards"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.post(
		"/:id/purchases/:purchaseId/refinance",
		async ({ params, body, request }) => {
			const userId = await requireUserId(request);
			await assertCreditCardOwnership(params.id, userId);
			const selectedPurchase = await findPurchaseForCard(params.id, params.purchaseId);
			if (!selectedPurchase) throw new HttpException("Purchase not found", 404);
			const rootPurchaseId = selectedPurchase.parentId ?? selectedPurchase.id;
			const card = await queryFirst(
				db.sql.public.CreditCard.select("dueDay", "statementDay")
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.limit(1)
					.build(),
			);
			if (!card) throw new HttpException("Credit card not found", 404);

			const installmentsToSettle = (await queryRows(
				db.sql.public.CreditPurchase.innerJoin(db.sql.public.CreditCardStatement, (fields, functions) =>
					functions.eq(fields.CreditPurchase.statementId, fields.CreditCardStatement.id),
				)
					.select((fields, functions) => ({
						...Object.fromEntries(purchaseColumns.map(column => [column, fields.CreditPurchase[column]])),
						isPaid: fields.CreditCardStatement.isPaid,
					}))
					.where((fields, functions) =>
						functions.and(
							functions.eq(fields.CreditCardStatement.creditCardId, params.id),
							functions.or(
								functions.eq(fields.CreditPurchase.id, rootPurchaseId),
								functions.eq(fields.CreditPurchase.parentId, rootPurchaseId),
							),
							functions.eq(fields.CreditPurchase.isSettled, false),
							functions.eq(fields.CreditCardStatement.isPaid, false),
						),
					)
					.build(),
			)) as Array<CreditPurchaseRow & { isPaid: boolean }>;
			if (!installmentsToSettle.length) throw new HttpException("No open installments to refinance", 409);

			const settledAmount = installmentsToSettle.reduce(
				(total, installment) => total + Number(installment.installmentAmount),
				0,
			);
			const totalAmount = settledAmount + body.feeAmount;
			const installmentAmount = totalAmount / body.installments;
			const purchaseDate = new Date(body.purchaseDate);
			const source =
				installmentsToSettle.find(item => item.id === rootPurchaseId) ?? installmentsToSettle[0]!;
			const sourceTags = await getTagsByEntity(tagEntityType.creditPurchase, [source.id]);
			const tagIds = (sourceTags.get(source.id) ?? []).map(tag => tag.id);

			const createdPurchases: CreditPurchaseRow[] = [];
			for (let currentInstallment = 1; currentInstallment <= body.installments; currentInstallment++) {
				const occurrenceDate = addMonths(purchaseDate, currentInstallment - 1);
				const { dueDate, statementDate } = getStatementDates(card, occurrenceDate);
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
							{ creditCardId: params.id, dueDate, statementDate, totalAmount: "0" },
						])
							.returning(...statementColumns)
							.build(),
					);
				}
				if (!statement) throw new HttpException("Statement not created", 500);
				if (statement.isPaid) throw new HttpException("Cannot add refinancing to a paid statement", 409);
				const refinancingPurchase = await queryFirst(
					db.sql.public.CreditPurchase.insert([
						{
							categoryId: tagIds[0],
							currentInstallment,
							description: source.description,
							installmentAmount: String(installmentAmount),
							installments: body.installments,
							...(currentInstallment > 1 && { parentId: createdPurchases[0]!.id }),
							purchaseDate,
							...(currentInstallment === 1 && { refinancingFeeAmount: String(body.feeAmount) }),
							statementId: statement.id,
							storeName: source.storeName,
							time: source.time,
							totalAmount: String(totalAmount),
						},
					])
						.returning(...purchaseColumns)
						.build(),
				);
				if (!refinancingPurchase) throw new HttpException("Refinancing purchase not created", 500);
				createdPurchases.push({
					...refinancingPurchase,
					installmentAmount: Number(refinancingPurchase.installmentAmount),
					totalAmount: Number(refinancingPurchase.totalAmount),
				});
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
			for (const installment of installmentsToSettle) {
				await executeStatement(
					db.sql.public.CreditPurchase.update({
						isSettled: true,
						settledByPurchaseId: createdPurchases[0]!.id,
						updatedAt: new Date(),
					})
						.where((fields, functions) => functions.eq(fields.id, installment.id))
						.build(),
				);
				const amount = param(numeric<12, 2>(installment.installmentAmount), { codecId: "pg/numeric@1" });
				await executeStatement(
					db.sql.public.CreditCardStatement.update((fields, functions) => ({
						totalAmount: functions.raw`GREATEST(0, ${fields.totalAmount} - ${amount})`.returns(
							"pg/numeric@1",
						),
						updatedAt: functions.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
					}))
						.where((fields, functions) => functions.eq(fields.id, installment.statementId))
						.build(),
				);
			}
			const tagsByPurchase = await getTagsByEntity(
				tagEntityType.creditPurchase,
				createdPurchases.map(purchase => purchase.id),
			);
			return {
				purchases: createdPurchases.map(purchase => ({
					...purchase,
					tagIds: (tagsByPurchase.get(purchase.id) ?? []).map(tag => tag.id),
					tags: tagsByPurchase.get(purchase.id) ?? [],
				})),
				settledAmount,
				totalAmount,
			};
		},
		{
			body: t.Object({
				feeAmount: t.Number({ minimum: 0 }),
				installments: t.Number({ maximum: 48, minimum: 1 }),
				purchaseDate: t.String(),
			}),
			detail: { tags: ["Credit Cards"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
				purchaseId: t.String({ maxLength: 36, minLength: 1 }),
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
			if (body.creditCardId) await assertCreditCardOwnership(body.creditCardId, userId);
			if (body.storeName) await resolveStore(userId, body.storeName);
			const tagIds = body.tagIds === undefined ? undefined : await assertTagOwnership(body.tagIds, userId);
			const previousAmount = Number(purchase.installmentAmount);

			const nextInstallments = body.installments ?? purchase.installments;
			const nextTotalAmount = body.totalAmount ?? Number(purchase.totalAmount);
			const nextAmount = nextTotalAmount / nextInstallments;
			const nextPurchaseDate = body.purchaseDate ? new Date(body.purchaseDate) : purchase.purchaseDate;
			let nextStatementId = purchase.statementId;
			let nextCashback = {
				cashbackAccountId: purchase.cashbackAccountId,
				cashbackAmount:
					purchase.cashbackAmount === null || purchase.cashbackAmount === undefined
						? null
						: String(
								Number(
									(Number(purchase.cashbackAmount) * nextTotalAmount) / Number(purchase.totalAmount),
								).toFixed(4),
							),
				cashbackYieldPeriod: purchase.cashbackYieldPeriod,
				cashbackYieldRate:
					purchase.cashbackYieldRate === null || purchase.cashbackYieldRate === undefined
						? null
						: String(purchase.cashbackYieldRate),
			};
			if (body.creditCardId && body.creditCardId !== params.id) {
				const card = await queryFirst(
					db.sql.public.CreditCard.select(
						"cashbackAccountId",
						"cashbackRate",
						"cashbackYieldPeriod",
						"cashbackYieldRate",
						"dueDay",
						"statementDay",
					)
						.where((fields, functions) => functions.eq(fields.id, body.creditCardId!))
						.limit(1)
						.build(),
				);
				if (!card) throw new HttpException("Credit card not found", 404);
				const { dueDate, statementDate } = getStatementDates(card, nextPurchaseDate);
				let statement = await queryFirst(
					db.sql.public.CreditCardStatement.select(...statementColumns)
						.where((fields, functions) =>
							functions.and(
								functions.eq(fields.creditCardId, body.creditCardId!),
								functions.eq(fields.statementDate, statementDate),
							),
						)
						.limit(1)
						.build(),
				);
				if (!statement) {
					statement = await queryFirst(
						db.sql.public.CreditCardStatement.insert([
							{ creditCardId: body.creditCardId, dueDate, statementDate, totalAmount: "0" },
						])
							.returning(...statementColumns)
							.build(),
					);
				}
				if (!statement) throw new HttpException("Statement not created", 500);
				if (statement.isPaid) throw new HttpException("Cannot move a purchase to a paid statement", 409);
				nextStatementId = statement.id;
				if (!purchase.parentId) {
					const snapshot = cashbackSnapshot(card, nextTotalAmount);
					nextCashback = {
						cashbackAccountId: snapshot.cashbackAccountId ?? null,
						cashbackAmount: snapshot.cashbackAmount ?? null,
						cashbackYieldPeriod: snapshot.cashbackYieldPeriod ?? null,
						cashbackYieldRate: snapshot.cashbackYieldRate ?? null,
					};
				}
			}
			const updatedPurchase = await queryFirst(
				db.sql.public.CreditPurchase.update({
					...(!purchase.parentId &&
						(body.totalAmount !== undefined || nextStatementId !== purchase.statementId) && {
							cashbackAccountId: nextCashback.cashbackAccountId,
							cashbackAmount: nextCashback.cashbackAmount,
							cashbackYieldPeriod: nextCashback.cashbackYieldPeriod,
							cashbackYieldRate: nextCashback.cashbackYieldRate,
						}),
					...(body.description !== undefined && { description: body.description }),
					...(body.storeName !== undefined && { storeName: body.storeName }),
					...((body.totalAmount !== undefined || body.installments !== undefined) && {
						installmentAmount: String(nextAmount),
						installments: nextInstallments,
						totalAmount: String(nextTotalAmount),
					}),
					...(body.purchaseDate !== undefined && { purchaseDate: nextPurchaseDate }),
					...(body.time !== undefined && { time: body.time }),
					...(nextStatementId !== purchase.statementId && { statementId: nextStatementId }),
					...(tagIds !== undefined && { categoryId: tagIds[0] ?? null }),
					updatedAt: new Date(),
				} as never)
					.where((fields, functions) => functions.eq(fields.id, params.purchaseId))
					.returning(...purchaseColumns)
					.build(),
			);
			if (!updatedPurchase) throw new HttpException("Purchase not found", 404);
			await syncPurchaseDebtEvent({
				creditPurchaseId: purchase.parentId ?? purchase.id,
				date: updatedPurchase.purchaseDate.toISOString().slice(0, 10),
				debtPersonId: body.debtPersonId,
				description: updatedPurchase.description,
				matchEventId: body.matchDebtEventId,
				totalAmount: Number(updatedPurchase.totalAmount),
				userId,
			});

			if (nextStatementId !== purchase.statementId) {
				const previousStatementAmount = param(numeric<12, 2>(previousAmount), { codecId: "pg/numeric@1" });
				const nextStatementAmount = param(numeric<12, 2>(nextAmount), { codecId: "pg/numeric@1" });
				await executeStatement(
					db.sql.public.CreditCardStatement.update((fields, functions) => ({
						totalAmount:
							functions.raw`GREATEST(0, ${fields.totalAmount} - ${previousStatementAmount})`.returns(
								"pg/numeric@1",
							),
						updatedAt: functions.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
					}))
						.where((fields, functions) => functions.eq(fields.id, purchase.statementId))
						.build(),
				);
				await executeStatement(
					db.sql.public.CreditCardStatement.update((fields, functions) => ({
						totalAmount: functions.raw`${fields.totalAmount} + ${nextStatementAmount}`.returns(
							"pg/numeric@1",
						),
						updatedAt: functions.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
					}))
						.where((fields, functions) => functions.eq(fields.id, nextStatementId))
						.build(),
				);
			} else if (nextAmount !== previousAmount) {
				const amount = param(numeric<12, 2>(nextAmount - previousAmount), { codecId: "pg/numeric@1" });
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
				creditCardId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				debtPersonId: t.Optional(t.Nullable(t.String({ maxLength: 36, minLength: 1 }))),
				description: t.Optional(t.String({ maxLength: 500 })),
				installments: t.Optional(t.Number({ maximum: 48, minimum: 1 })),
				matchDebtEventId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				purchaseDate: t.Optional(t.String()),
				storeName: t.Optional(t.Nullable(t.String({ maxLength: 200 }))),
				tagIds: t.Optional(t.Array(t.String({ maxLength: 36, minLength: 1 }), { maxItems: 20 })),
				time: t.Optional(t.Nullable(t.String({ pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d)?$" }))),
				totalAmount: t.Optional(t.Number({ exclusiveMinimum: 0 })),
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
			if (!purchase.parentId) await deleteCreatorDebtEventForPurchase(purchase.id, userId);
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

			const remainingAmount = Number(statement.totalAmount) - Number(statement.paidAmount);
			const paymentAmount = body.amount ?? remainingAmount;
			if (paymentAmount <= 0) {
				throw new HttpException("Informe um valor maior que zero para a fatura", 400);
			}

			const amount = param(numeric<12, 2>(paymentAmount), { codecId: "pg/numeric@1" });
			const isPaid =
				toDateKey(statement.statementDate) <= toDateKey(new Date()) &&
				toCents(statement.paidAmount) + toCents(paymentAmount) >= toCents(statement.totalAmount);
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
						creditCardStatementId: params.statementId,
						date: new Date(body.date),
						description: `Pagamento da fatura — ${card.accountName}`,
						originFinancialAccountId: body.financialAccountId,
						time: resolvePurchaseTime(body.time),
						type: "EXPENSE",
					},
				])
					.returning(
						"id",
						"amount",
						"creditCardStatementId",
						"date",
						"description",
						"type",
						"originFinancialAccountId",
						"createdAt",
					)
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

			return { statement: updatedStatement, transaction: paymentTransaction };
		},
		{
			body: t.Object({
				amount: t.Optional(t.Number()),
				date: t.String(),
				financialAccountId: t.String({ maxLength: 36, minLength: 1 }),
				time: t.Optional(t.Nullable(t.String({ pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d)?$" }))),
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
