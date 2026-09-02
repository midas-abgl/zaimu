import Elysia, { t } from "elysia";
import { requireUserId } from "~/modules/auth";
import {
	createDebtEvent,
	getAccessibleDebtEvent,
	getOwnedDebtPerson,
	normalizeDebtPersonName,
	resolveDebtPersonConnection,
} from "~/modules/debts/application";
import { HttpException } from "~/shared/errors";
import { db, executeStatement, queryFirst, queryRows } from "~/shared/infra/sql";

const PersonIdParams = t.Object({ id: t.String({ maxLength: 36, minLength: 1 }) });
const EventIdParams = t.Object({ eventId: t.String({ maxLength: 36, minLength: 1 }) });

async function findOrCreatePerson(userId: string, name: string) {
	const displayName = name.trim().replace(/\s+/g, " ");
	if (!displayName) throw new HttpException("Informe o nome da pessoa", 400);
	const normalizedName = normalizeDebtPersonName(displayName);
	const existing = await queryFirst(
		db.sql.public.DebtPerson.select("id", "name", "normalizedName", "connectionId", "hiddenAt")
			.where((fields, functions) =>
				functions.and(
					functions.eq(fields.userId, userId),
					functions.eq(fields.normalizedName, normalizedName),
				),
			)
			.limit(1)
			.build(),
	);
	if (existing) {
		if (existing.hiddenAt) {
			await executeStatement(
				db.sql.public.DebtPerson.update({ hiddenAt: null, updatedAt: new Date() })
					.where((fields, functions) => functions.eq(fields.id, existing.id))
					.build(),
			);
		}
		return { ...existing, hiddenAt: null };
	}
	const person = await queryFirst(
		db.sql.public.DebtPerson.insert([{ name: displayName, normalizedName, userId }])
			.returning("id", "name", "normalizedName", "connectionId", "hiddenAt")
			.build(),
	);
	if (!person) throw new HttpException("Pessoa não criada", 500);
	return person;
}

async function getConnection(connectionId: string | null | undefined) {
	if (!connectionId) return undefined;
	return queryFirst(
		db.sql.public.DebtConnection.select("id", "requesterId", "recipientId", "status")
			.where((fields, functions) => functions.eq(fields.id, connectionId))
			.limit(1)
			.build(),
	);
}

async function getPersonEvents(person: { connectionId: null | string; id: string }, userId: string) {
	const connection = await getConnection(person.connectionId);
	const shared = connection?.status === "ACCEPTED";
	const events = shared
		? await queryRows(
				db.sql.public.DebtEvent.innerJoin(db.sql.public.user, (fields, functions) =>
					functions.eq(fields.DebtEvent.createdByUserId, fields.user.id),
				)
					.select(fields => ({
						amount: fields.DebtEvent.amount,
						createdByName: fields.user.name,
						createdByUserId: fields.DebtEvent.createdByUserId,
						date: fields.DebtEvent.date,
						description: fields.DebtEvent.description,
						dueDate: fields.DebtEvent.dueDate,
						effect: fields.DebtEvent.effect,
						id: fields.DebtEvent.id,
						kind: fields.DebtEvent.kind,
					}))
					.where((fields, functions) => functions.eq(fields.DebtEvent.connectionId, connection.id as never))
					.build(),
			)
		: await queryRows(
				db.sql.public.DebtEvent.innerJoin(db.sql.public.user, (fields, functions) =>
					functions.eq(fields.DebtEvent.createdByUserId, fields.user.id),
				)
					.select(fields => ({
						amount: fields.DebtEvent.amount,
						createdByName: fields.user.name,
						createdByUserId: fields.DebtEvent.createdByUserId,
						date: fields.DebtEvent.date,
						description: fields.DebtEvent.description,
						dueDate: fields.DebtEvent.dueDate,
						effect: fields.DebtEvent.effect,
						id: fields.DebtEvent.id,
						kind: fields.DebtEvent.kind,
					}))
					.where((fields, functions) => functions.eq(fields.DebtEvent.debtPersonId, person.id as never))
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
		.map(event => ({
			...event,
			amount: Number(event.amount),
			createdByMe: event.createdByUserId === userId,
			effect: event.createdByUserId === userId ? Number(event.effect) : -Number(event.effect),
		}))
		.toSorted((left, right) => right.date.getTime() - left.date.getTime());
}

async function getPeopleLedger(userId: string) {
	const people = (
		await queryRows(
			db.sql.public.DebtPerson.select("id", "name", "normalizedName", "connectionId", "hiddenAt")
				.where((fields, functions) => functions.eq(fields.userId, userId))
				.orderBy("name", { direction: "asc" })
				.build(),
		)
	).filter(person => !person.hiddenAt);
	return Promise.all(
		people.map(async person => {
			const [events, connection] = await Promise.all([
				getPersonEvents(person, userId),
				getConnection(person.connectionId),
			]);
			return {
				balance: events.reduce((sum, event) => sum + event.effect, 0),
				connectionStatus: connection?.status ?? null,
				events,
				id: person.id,
				isZaimuUser: connection?.status === "ACCEPTED",
				name: person.name,
			};
		}),
	);
}

export const DebtsController = new Elysia({ prefix: "/debts" })
	.get(
		"/",
		async ({ request }) => {
			const userId = await requireUserId(request);
			const people = await getPeopleLedger(userId);
			const totals = people.reduce(
				(result, person) => {
					if (person.balance > 0) result.owedToMe += person.balance;
					if (person.balance < 0) result.iOwe += Math.abs(person.balance);
					result.net += person.balance;
					return result;
				},
				{ iOwe: 0, net: 0, owedToMe: 0 },
			);
			return { people, totals };
		},
		{ detail: { tags: ["Debts"] } },
	)
	.get(
		"/summary",
		async ({ request }) => {
			const userId = await requireUserId(request);
			return getPeopleLedger(userId);
		},
		{ detail: { tags: ["Debts"] } },
	)
	.get(
		"/invitations",
		async ({ request }) => {
			const userId = await requireUserId(request);
			const requester = db.sql.public.user.select("id", "name", "email").as("requester");
			const recipient = db.sql.public.user.select("id", "name", "email").as("recipient");
			const invitations = await queryRows(
				db.sql.public.DebtConnection.innerJoin(requester, (fields, functions) =>
					functions.eq(fields.DebtConnection.requesterId, fields.requester.id),
				)
					.innerJoin(recipient, (fields, functions) =>
						functions.eq(fields.DebtConnection.recipientId, fields.recipient.id),
					)
					.select(fields => ({
						createdAt: fields.DebtConnection.createdAt,
						id: fields.DebtConnection.id,
						recipientId: fields.DebtConnection.recipientId,
						recipientName: fields.recipient.name,
						requesterId: fields.DebtConnection.requesterId,
						requesterName: fields.requester.name,
						status: fields.DebtConnection.status,
					}))
					.where((fields, functions) =>
						functions.or(
							functions.eq(fields.DebtConnection.requesterId, userId),
							functions.eq(fields.DebtConnection.recipientId, userId),
						),
					)
					.orderBy(fields => fields.DebtConnection.createdAt, { direction: "desc" })
					.build(),
			);
			return invitations.map(invitation => ({
				counterpartyName:
					invitation.requesterId === userId ? invitation.recipientName : invitation.requesterName,
				createdAt: invitation.createdAt,
				direction: invitation.requesterId === userId ? ("SENT" as const) : ("RECEIVED" as const),
				id: invitation.id,
				status: invitation.status,
			}));
		},
		{ detail: { tags: ["Debts"] } },
	)
	.post(
		"/people",
		async ({ body, request }) => {
			const userId = await requireUserId(request);
			return findOrCreatePerson(userId, body.name);
		},
		{
			body: t.Object({ name: t.String({ maxLength: 100, minLength: 1 }) }),
			detail: { tags: ["Debts"] },
		},
	)
	.post(
		"/people/:id/invite",
		async ({ body, params, request }) => {
			const userId = await requireUserId(request);
			const person = await getOwnedDebtPerson(params.id, userId);
			const recipient = await queryFirst(
				db.sql.public.user
					.select("id", "name", "email", "emailVerified")
					.where((fields, functions) => functions.eq(fields.email, body.email.trim().toLowerCase()))
					.limit(1)
					.build(),
			);
			if (!recipient?.emailVerified) throw new HttpException("Conta Zaimu não encontrada", 404);
			if (recipient.id === userId) throw new HttpException("Você não pode associar sua própria conta", 400);
			const existing = await queryFirst(
				db.sql.public.DebtConnection.select("id", "requesterId", "recipientId", "status")
					.where((fields, functions) =>
						functions.or(
							functions.and(
								functions.eq(fields.requesterId, userId),
								functions.eq(fields.recipientId, recipient.id),
							),
							functions.and(
								functions.eq(fields.requesterId, recipient.id),
								functions.eq(fields.recipientId, userId),
							),
						),
					)
					.limit(1)
					.build(),
			);
			if (existing?.status === "ACCEPTED") throw new HttpException("Contas já associadas", 409);
			if (existing?.status === "PENDING") return existing;
			const connection = existing
				? await queryFirst(
						db.sql.public.DebtConnection.update({
							recipientId: recipient.id,
							requesterId: userId,
							respondedAt: null,
							status: "PENDING",
							updatedAt: new Date(),
						})
							.where((fields, functions) => functions.eq(fields.id, existing.id))
							.returning("id", "requesterId", "recipientId", "status")
							.build(),
					)
				: await queryFirst(
						db.sql.public.DebtConnection.insert([{ recipientId: recipient.id, requesterId: userId }])
							.returning("id", "requesterId", "recipientId", "status")
							.build(),
					);
			if (!connection) throw new HttpException("Convite não criado", 500);
			await executeStatement(
				db.sql.public.DebtPerson.update({ connectionId: connection.id, updatedAt: new Date() })
					.where((fields, functions) => functions.eq(fields.id, person.id))
					.build(),
			);
			return { ...connection, recipientName: recipient.name };
		},
		{
			body: t.Object({ email: t.String({ format: "email", maxLength: 320 }) }),
			detail: { tags: ["Debts"] },
			params: PersonIdParams,
		},
	)
	.post(
		"/invitations/:id/accept",
		async ({ body, params, request }) => {
			const userId = await requireUserId(request);
			const connection = await queryFirst(
				db.sql.public.DebtConnection.select("id", "requesterId", "recipientId", "status")
					.where((fields, functions) =>
						functions.and(functions.eq(fields.id, params.id), functions.eq(fields.recipientId, userId)),
					)
					.limit(1)
					.build(),
			);
			if (connection?.status !== "PENDING") throw new HttpException("Convite não encontrado", 404);
			const requester = await queryFirst(
				db.sql.public.user
					.select("name")
					.where((fields, functions) => functions.eq(fields.id, connection.requesterId))
					.limit(1)
					.build(),
			);
			const recipientPerson = body.personId
				? await getOwnedDebtPerson(body.personId, userId)
				: await findOrCreatePerson(userId, requester?.name ?? "Usuário Zaimu");
			await executeStatement(
				db.sql.public.DebtPerson.update({ connectionId: connection.id, updatedAt: new Date() })
					.where((fields, functions) => functions.eq(fields.id, recipientPerson.id))
					.build(),
			);
			const connectedPeople = await queryRows(
				db.sql.public.DebtPerson.select("id")
					.where((fields, functions) => functions.eq(fields.connectionId, connection.id))
					.build(),
			);
			if (connectedPeople.length) {
				await executeStatement(
					db.sql.public.DebtEvent.update({ connectionId: connection.id, updatedAt: new Date() })
						.where((fields, functions) =>
							functions.in(
								fields.debtPersonId,
								connectedPeople.map(person => person.id),
							),
						)
						.build(),
				);
			}
			await executeStatement(
				db.sql.public.DebtConnection.update({
					respondedAt: new Date(),
					status: "ACCEPTED",
					updatedAt: new Date(),
				})
					.where((fields, functions) => functions.eq(fields.id, connection.id))
					.build(),
			);
			return { success: true };
		},
		{
			body: t.Object({ personId: t.Optional(t.String({ maxLength: 36, minLength: 1 })) }),
			detail: { tags: ["Debts"] },
			params: PersonIdParams,
		},
	)
	.post(
		"/invitations/:id/decline",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			const updated = await queryFirst(
				db.sql.public.DebtConnection.update({
					respondedAt: new Date(),
					status: "DECLINED",
					updatedAt: new Date(),
				})
					.where((fields, functions) =>
						functions.and(functions.eq(fields.id, params.id), functions.eq(fields.recipientId, userId)),
					)
					.returning("id")
					.build(),
			);
			if (!updated) throw new HttpException("Convite não encontrado", 404);
			return { success: true };
		},
		{ detail: { tags: ["Debts"] }, params: PersonIdParams },
	)
	.post(
		"/events",
		async ({ body, request }) => {
			const userId = await requireUserId(request);
			return createDebtEvent({
				amount: body.amount,
				createdByUserId: userId,
				date: body.date,
				debtPersonId: body.personId,
				description: body.description,
				dueDate: body.dueDate,
				effect: body.isOwedToMe ? body.amount : -body.amount,
				kind: "ORIGIN",
			});
		},
		{
			body: t.Object({
				amount: t.Number({ exclusiveMinimum: 0 }),
				date: t.String(),
				description: t.Optional(t.String({ maxLength: 1000 })),
				dueDate: t.Optional(t.String()),
				isOwedToMe: t.Boolean(),
				personId: t.String({ maxLength: 36, minLength: 1 }),
			}),
			detail: { tags: ["Debts"] },
		},
	)
	.post(
		"/",
		async ({ body, request }) => {
			const userId = await requireUserId(request);
			const person = await findOrCreatePerson(userId, body.personName);
			return createDebtEvent({
				amount: body.amount,
				createdByUserId: userId,
				date: body.date,
				debtPersonId: person.id,
				description: body.description,
				dueDate: body.dueDate,
				effect: (body.isOwedToMe ?? true) ? body.amount : -body.amount,
				kind: "ORIGIN",
			});
		},
		{
			body: t.Object({
				amount: t.Number({ exclusiveMinimum: 0 }),
				date: t.String(),
				description: t.Optional(t.String({ maxLength: 1000 })),
				dueDate: t.Optional(t.String()),
				isOwedToMe: t.Optional(t.Boolean()),
				personName: t.String({ maxLength: 100, minLength: 1 }),
			}),
			detail: { tags: ["Debts"] },
		},
	)
	.patch(
		"/events/:eventId",
		async ({ body, params, request }) => {
			const userId = await requireUserId(request);
			const event = await getAccessibleDebtEvent(params.eventId, userId);
			if (event.createdByUserId !== userId || event.kind !== "ORIGIN")
				throw new HttpException("Somente a origem manual pode ser editada pelo autor", 403);
			const personId = body.personId ?? event.debtPersonId;
			if (!personId) throw new HttpException("Pessoa da dívida não encontrada", 404);
			const { connectionId } = await resolveDebtPersonConnection(personId, userId);
			const amount = body.amount ?? Number(event.amount);
			const direction = Number(event.effect) >= 0 ? 1 : -1;
			const updated = await queryFirst(
				db.sql.public.DebtEvent.update({
					amount: String(amount),
					connectionId: connectionId ?? null,
					date: body.date ? new Date(body.date) : event.date,
					debtPersonId: personId,
					description: body.description,
					dueDate: body.dueDate ? new Date(body.dueDate) : null,
					effect: String((body.isOwedToMe === undefined ? direction : body.isOwedToMe ? 1 : -1) * amount),
					updatedAt: new Date(),
				})
					.where((fields, functions) => functions.eq(fields.id, event.id))
					.returning("id", "amount", "effect", "date", "description", "kind", "debtPersonId")
					.build(),
			);
			return updated;
		},
		{
			body: t.Object({
				amount: t.Optional(t.Number({ exclusiveMinimum: 0 })),
				date: t.Optional(t.String()),
				description: t.Optional(t.String({ maxLength: 1000 })),
				dueDate: t.Optional(t.String()),
				isOwedToMe: t.Optional(t.Boolean()),
				personId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
			}),
			detail: { tags: ["Debts"] },
			params: EventIdParams,
		},
	)
	.delete(
		"/people/:id",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			await getOwnedDebtPerson(params.id, userId);
			await executeStatement(
				db.sql.public.DebtPerson.update({ hiddenAt: new Date(), updatedAt: new Date() })
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.build(),
			);
			return { success: true };
		},
		{ detail: { tags: ["Debts"] }, params: PersonIdParams },
	)
	.delete(
		"/events/:eventId",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			const event = await getAccessibleDebtEvent(params.eventId, userId);
			const existing = await queryFirst(
				db.sql.public.DebtEventVisibility.select("id")
					.where((fields, functions) =>
						functions.and(functions.eq(fields.eventId, event.id), functions.eq(fields.userId, userId)),
					)
					.limit(1)
					.build(),
			);
			if (existing) {
				await executeStatement(
					db.sql.public.DebtEventVisibility.update({ hiddenAt: new Date(), updatedAt: new Date() })
						.where((fields, functions) => functions.eq(fields.id, existing.id))
						.build(),
				);
			} else {
				await executeStatement(
					db.sql.public.DebtEventVisibility.insert([
						{ eventId: event.id, hiddenAt: new Date(), userId },
					]).build(),
				);
			}
			return { success: true };
		},
		{ detail: { tags: ["Debts"] }, params: EventIdParams },
	);
