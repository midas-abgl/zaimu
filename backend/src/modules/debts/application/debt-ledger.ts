import { HttpException } from "~/shared/errors";
import { db, executeStatement, queryFirst, queryRows } from "~/shared/infra/sql";
import { debtEffectForTransaction, isCompatibleDebtPair } from "./debt-balance";

export type DebtEventKind = "ORIGIN" | "TRANSACTION" | "PURCHASE" | "MIGRATED_SETTLEMENT";

export const normalizeDebtPersonName = (name: string) =>
	name.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");

export async function getOwnedDebtPerson(personId: string, userId: string) {
	const person = await queryFirst(
		db.sql.public.DebtPerson.select("id", "userId", "name", "normalizedName", "connectionId", "hiddenAt")
			.where((fields, functions) =>
				functions.and(functions.eq(fields.id, personId), functions.eq(fields.userId, userId)),
			)
			.limit(1)
			.build(),
	);
	if (!person || person.hiddenAt) throw new HttpException("Pessoa da dívida não encontrada", 404);
	return person;
}

export async function resolveDebtPersonConnection(personId: string, userId: string) {
	const person = await getOwnedDebtPerson(personId, userId);
	if (!person.connectionId) return { connectionId: undefined, person };
	const connection = await queryFirst(
		db.sql.public.DebtConnection.select("id", "status")
			.where((fields, functions) => functions.eq(fields.id, person.connectionId!))
			.limit(1)
			.build(),
	);
	return {
		connectionId: connection?.status === "ACCEPTED" ? connection.id : undefined,
		person,
	};
}

export async function createDebtEvent(input: {
	amount: number;
	createdByUserId: string;
	date: string;
	debtPersonId: string;
	description?: string;
	dueDate?: string;
	effect: number;
	kind: DebtEventKind;
}) {
	if (!Number.isFinite(input.amount) || input.amount <= 0)
		throw new HttpException("Informe um valor válido", 400);
	const { connectionId } = await resolveDebtPersonConnection(input.debtPersonId, input.createdByUserId);
	const event = await queryFirst(
		db.sql.public.DebtEvent.insert([
			{
				amount: String(input.amount),
				connectionId,
				createdByUserId: input.createdByUserId,
				date: new Date(input.date),
				debtPersonId: input.debtPersonId,
				description: input.description,
				dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
				effect: String(input.effect),
				kind: input.kind,
			},
		])
			.returning("id", "amount", "effect", "date", "description", "kind", "debtPersonId", "connectionId")
			.build(),
	);
	if (!event) throw new HttpException("Lançamento da dívida não criado", 500);
	return event;
}

export async function getAccessibleDebtEvent(eventId: string, userId: string) {
	const event = await queryFirst(
		db.sql.public.DebtEvent.outerLeftJoin(db.sql.public.DebtPerson, (fields, functions) =>
			functions.eq(fields.DebtEvent.debtPersonId, fields.DebtPerson.id),
		)
			.outerLeftJoin(db.sql.public.DebtConnection, (fields, functions) =>
				functions.eq(fields.DebtEvent.connectionId, fields.DebtConnection.id),
			)
			.select(fields => ({
				amount: fields.DebtEvent.amount,
				connectionId: fields.DebtEvent.connectionId,
				createdByUserId: fields.DebtEvent.createdByUserId,
				date: fields.DebtEvent.date,
				debtPersonId: fields.DebtEvent.debtPersonId,
				effect: fields.DebtEvent.effect,
				id: fields.DebtEvent.id,
				kind: fields.DebtEvent.kind,
				personUserId: fields.DebtPerson.userId,
				recipientId: fields.DebtConnection.recipientId,
				requesterId: fields.DebtConnection.requesterId,
				status: fields.DebtConnection.status,
			}))
			.where((fields, functions) =>
				functions.and(
					functions.eq(fields.DebtEvent.id, eventId),
					functions.or(
						functions.eq(fields.DebtPerson.userId, userId),
						functions.and(
							functions.eq(fields.DebtConnection.status, "ACCEPTED"),
							functions.or(
								functions.eq(fields.DebtConnection.requesterId, userId),
								functions.eq(fields.DebtConnection.recipientId, userId),
							),
						),
					),
				),
			)
			.limit(1)
			.build(),
	);
	if (!event) throw new HttpException("Lançamento da dívida não encontrado", 404);
	return event;
}

export async function linkTransactionToDebt(input: {
	amount: number;
	date: string;
	debtPersonId?: null | string;
	description?: string;
	matchEventId?: string;
	transactionId: string;
	type: "EXPENSE" | "INCOME" | "TRANSFER";
	userId: string;
}) {
	if (input.type === "TRANSFER" && (input.debtPersonId || input.matchEventId))
		throw new HttpException("Transferências entre contas próprias não podem ser vinculadas a dívidas", 400);
	if (!input.debtPersonId && !input.matchEventId) return;
	if (input.matchEventId) {
		const event = await getAccessibleDebtEvent(input.matchEventId, input.userId);
		const expectedEffect = debtEffectForTransaction(input.amount, input.type);
		const perspectiveEffect =
			event.createdByUserId === input.userId ? Number(event.effect) : -Number(event.effect);
		if (
			!isCompatibleDebtPair({
				amount: input.amount,
				date: input.date,
				effect: expectedEffect,
				eventAmount: Number(event.amount),
				eventDate: event.date.toISOString(),
				eventPerspectiveEffect: perspectiveEffect,
			})
		)
			throw new HttpException("A movimentação não corresponde ao lançamento compartilhado", 409);
		await executeStatement(
			db.sql.public.DebtTransactionLink.insert([
				{ eventId: event.id, isCreator: false, transactionId: input.transactionId, userId: input.userId },
			]).build(),
		);
		return;
	}
	const event = await createDebtEvent({
		amount: input.amount,
		createdByUserId: input.userId,
		date: input.date,
		debtPersonId: input.debtPersonId!,
		description: input.description,
		effect: debtEffectForTransaction(input.amount, input.type),
		kind: "TRANSACTION",
	});
	await executeStatement(
		db.sql.public.DebtTransactionLink.insert([
			{ eventId: event.id, isCreator: true, transactionId: input.transactionId, userId: input.userId },
		]).build(),
	);
}

export async function syncTransactionDebtEvent(input: {
	amount: number;
	date: string;
	debtPersonId?: null | string;
	description?: string;
	matchEventId?: string;
	transactionId: string;
	type: "EXPENSE" | "INCOME" | "TRANSFER";
	userId: string;
}) {
	const link = await queryFirst(
		db.sql.public.DebtTransactionLink.select("id", "eventId", "isCreator", "userId")
			.where((fields, functions) => functions.eq(fields.transactionId, input.transactionId))
			.limit(1)
			.build(),
	);
	if (input.debtPersonId === null) {
		if (!link) return;
		if (link.isCreator) {
			await executeStatement(
				db.sql.public.DebtEvent.delete()
					.where((fields, functions) => functions.eq(fields.id, link.eventId))
					.build(),
			);
		} else {
			await executeStatement(
				db.sql.public.DebtTransactionLink.delete()
					.where((fields, functions) => functions.eq(fields.id, link.id))
					.build(),
			);
		}
		return;
	}
	if (!link) {
		if (input.debtPersonId || input.matchEventId) await linkTransactionToDebt(input);
		return;
	}
	if (!link.isCreator) return;
	if (input.type === "TRANSFER")
		throw new HttpException("Transferências não podem permanecer vinculadas a dívidas", 400);
	const currentEvent = await queryFirst(
		db.sql.public.DebtEvent.select("debtPersonId")
			.where((fields, functions) => functions.eq(fields.id, link.eventId))
			.limit(1)
			.build(),
	);
	const nextPersonId = input.debtPersonId ?? currentEvent?.debtPersonId;
	if (!nextPersonId) return;
	const { connectionId } = await resolveDebtPersonConnection(nextPersonId, input.userId);
	await executeStatement(
		db.sql.public.DebtEvent.update({
			amount: String(input.amount),
			connectionId: connectionId ?? null,
			date: new Date(input.date),
			debtPersonId: nextPersonId,
			description: input.description ?? null,
			effect: String(debtEffectForTransaction(input.amount, input.type)),
			updatedAt: new Date(),
		} as never)
			.where((fields, functions) => functions.eq(fields.id, link.eventId))
			.build(),
	);
	await executeStatement(
		db.sql.public.DebtTransactionLink.delete()
			.where((fields, functions) =>
				functions.and(functions.eq(fields.eventId, link.eventId), functions.eq(fields.isCreator, false)),
			)
			.build(),
	);
}

export async function linkPurchaseToDebt(input: {
	creditPurchaseId: string;
	date: string;
	debtPersonId?: null | string;
	description?: string;
	matchEventId?: string;
	totalAmount: number;
	userId: string;
}) {
	if (!input.debtPersonId && !input.matchEventId) return;
	if (input.matchEventId) {
		const event = await getAccessibleDebtEvent(input.matchEventId, input.userId);
		const perspectiveEffect =
			event.createdByUserId === input.userId ? Number(event.effect) : -Number(event.effect);
		if (
			Number(event.amount) !== input.totalAmount ||
			perspectiveEffect !== input.totalAmount ||
			event.date.toISOString().slice(0, 10) !== input.date.slice(0, 10)
		)
			throw new HttpException("A compra não corresponde ao lançamento compartilhado", 409);
		await executeStatement(
			db.sql.public.DebtPurchaseLink.insert([
				{ creditPurchaseId: input.creditPurchaseId, eventId: event.id, userId: input.userId },
			]).build(),
		);
		return;
	}
	const event = await createDebtEvent({
		amount: input.totalAmount,
		createdByUserId: input.userId,
		date: input.date,
		debtPersonId: input.debtPersonId!,
		description: input.description,
		effect: input.totalAmount,
		kind: "PURCHASE",
	});
	await executeStatement(
		db.sql.public.DebtPurchaseLink.insert([
			{
				creditPurchaseId: input.creditPurchaseId,
				eventId: event.id,
				isCreator: true,
				userId: input.userId,
			},
		]).build(),
	);
}

export async function syncPurchaseDebtEvent(input: {
	creditPurchaseId: string;
	date: string;
	debtPersonId?: null | string;
	description?: string;
	matchEventId?: string;
	totalAmount: number;
	userId: string;
}) {
	const link = await queryFirst(
		db.sql.public.DebtPurchaseLink.select("id", "eventId", "isCreator")
			.where((fields, functions) => functions.eq(fields.creditPurchaseId, input.creditPurchaseId))
			.limit(1)
			.build(),
	);
	if (input.debtPersonId === null) {
		if (!link) return;
		if (link.isCreator) {
			await executeStatement(
				db.sql.public.DebtEvent.delete()
					.where((fields, functions) => functions.eq(fields.id, link.eventId))
					.build(),
			);
		} else {
			await executeStatement(
				db.sql.public.DebtPurchaseLink.delete()
					.where((fields, functions) => functions.eq(fields.id, link.id))
					.build(),
			);
		}
		return;
	}
	if (!link) {
		if (input.debtPersonId || input.matchEventId) await linkPurchaseToDebt(input);
		return;
	}
	if (!link.isCreator) return;
	const currentEvent = await queryFirst(
		db.sql.public.DebtEvent.select("debtPersonId")
			.where((fields, functions) => functions.eq(fields.id, link.eventId))
			.limit(1)
			.build(),
	);
	const nextPersonId = input.debtPersonId ?? currentEvent?.debtPersonId;
	if (!nextPersonId) return;
	const { connectionId } = await resolveDebtPersonConnection(nextPersonId, input.userId);
	await executeStatement(
		db.sql.public.DebtEvent.update({
			amount: String(input.totalAmount),
			connectionId: connectionId ?? null,
			date: new Date(input.date),
			debtPersonId: nextPersonId,
			description: input.description ?? null,
			effect: String(input.totalAmount),
			updatedAt: new Date(),
		} as never)
			.where((fields, functions) => functions.eq(fields.id, link.eventId))
			.build(),
	);
	await executeStatement(
		db.sql.public.DebtPurchaseLink.delete()
			.where((fields, functions) =>
				functions.and(functions.eq(fields.eventId, link.eventId), functions.eq(fields.isCreator, false)),
			)
			.build(),
	);
}

export async function deleteCreatorDebtEventForTransaction(transactionId: string, userId: string) {
	const link = await queryFirst(
		db.sql.public.DebtTransactionLink.select("id", "eventId", "isCreator", "userId")
			.where((fields, functions) => functions.eq(fields.transactionId, transactionId))
			.limit(1)
			.build(),
	);
	if (!link || link.userId !== userId) return;
	if (link.isCreator) {
		await executeStatement(
			db.sql.public.DebtEvent.delete()
				.where((fields, functions) => functions.eq(fields.id, link.eventId))
				.build(),
		);
	} else {
		await executeStatement(
			db.sql.public.DebtTransactionLink.delete()
				.where((fields, functions) => functions.eq(fields.id, link.id))
				.build(),
		);
	}
}

export async function deleteCreatorDebtEventForPurchase(purchaseId: string, userId: string) {
	const link = await queryFirst(
		db.sql.public.DebtPurchaseLink.select("id", "eventId", "isCreator", "userId")
			.where((fields, functions) => functions.eq(fields.creditPurchaseId, purchaseId))
			.limit(1)
			.build(),
	);
	if (!link || link.userId !== userId) return;
	if (link.isCreator) {
		await executeStatement(
			db.sql.public.DebtEvent.delete()
				.where((fields, functions) => functions.eq(fields.id, link.eventId))
				.build(),
		);
	} else {
		await executeStatement(
			db.sql.public.DebtPurchaseLink.delete()
				.where((fields, functions) => functions.eq(fields.id, link.id))
				.build(),
		);
	}
}

export async function debtRefsForTransactions(transactionIds: string[]) {
	if (!transactionIds.length) return new Map<string, { debtPersonId: string; debtPersonName: string }>();
	const rows = await queryRows(
		db.sql.public.DebtTransactionLink.innerJoin(db.sql.public.DebtEvent, (fields, functions) =>
			functions.eq(fields.DebtTransactionLink.eventId, fields.DebtEvent.id),
		)
			.innerJoin(db.sql.public.DebtPerson, (fields, functions) =>
				functions.eq(fields.DebtEvent.debtPersonId, fields.DebtPerson.id),
			)
			.select(fields => ({
				debtPersonId: fields.DebtPerson.id,
				debtPersonName: fields.DebtPerson.name,
				transactionId: fields.DebtTransactionLink.transactionId,
			}))
			.where((fields, functions) => functions.in(fields.DebtTransactionLink.transactionId, transactionIds))
			.build(),
	);
	return new Map(rows.map(row => [row.transactionId, row]));
}

export async function debtRefsForPurchases(purchaseIds: string[]) {
	if (!purchaseIds.length) return new Map<string, { debtPersonId: string; debtPersonName: string }>();
	const rows = await queryRows(
		db.sql.public.DebtPurchaseLink.innerJoin(db.sql.public.DebtEvent, (fields, functions) =>
			functions.eq(fields.DebtPurchaseLink.eventId, fields.DebtEvent.id),
		)
			.innerJoin(db.sql.public.DebtPerson, (fields, functions) =>
				functions.eq(fields.DebtEvent.debtPersonId, fields.DebtPerson.id),
			)
			.select(fields => ({
				creditPurchaseId: fields.DebtPurchaseLink.creditPurchaseId,
				debtPersonId: fields.DebtPerson.id,
				debtPersonName: fields.DebtPerson.name,
			}))
			.where((fields, functions) => functions.in(fields.DebtPurchaseLink.creditPurchaseId, purchaseIds))
			.build(),
	);
	return new Map(rows.map(row => [row.creditPurchaseId, row]));
}

export async function getDebtBalanceTotals(userId: string) {
	const people = (
		await queryRows(
			db.sql.public.DebtPerson.select("id", "connectionId", "hiddenAt")
				.where((fields, functions) => functions.eq(fields.userId, userId))
				.build(),
		)
	).filter(person => !person.hiddenAt);
	const balances = await Promise.all(
		people.map(async person => {
			const connection = person.connectionId
				? await queryFirst(
						db.sql.public.DebtConnection.select("id", "status")
							.where((fields, functions) => functions.eq(fields.id, person.connectionId!))
							.limit(1)
							.build(),
					)
				: undefined;
			const events =
				connection?.status === "ACCEPTED"
					? await queryRows(
							db.sql.public.DebtEvent.select("id", "createdByUserId", "effect")
								.where((fields, functions) => functions.eq(fields.connectionId, connection.id as never))
								.build(),
						)
					: await queryRows(
							db.sql.public.DebtEvent.select("id", "createdByUserId", "effect")
								.where((fields, functions) => functions.eq(fields.debtPersonId, person.id as never))
								.build(),
						);
			const hidden = events.length
				? await queryRows(
						db.sql.public.DebtEventVisibility.select("eventId", "hiddenAt")
							.where((fields, functions) =>
								functions.and(
									functions.eq(fields.userId, userId),
									functions.in(
										fields.eventId,
										events.map(event => event.id),
									),
								),
							)
							.build(),
					)
				: [];
			const hiddenIds = new Set(hidden.filter(item => item.hiddenAt).map(item => item.eventId));
			return events
				.filter(event => !hiddenIds.has(event.id))
				.reduce(
					(sum, event) =>
						sum + (event.createdByUserId === userId ? Number(event.effect) : -Number(event.effect)),
					0,
				);
		}),
	);
	return balances.reduce(
		(result, balance) => {
			if (balance > 0) result.owedToMe += balance;
			if (balance < 0) result.iOwe += Math.abs(balance);
			return result;
		},
		{ iOwe: 0, owedToMe: 0 },
	);
}
