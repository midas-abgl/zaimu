import { RegisterEvent } from "@zaimu/application";
import Elysia, { t } from "elysia";
import { KyselyAccountsRepository, database } from "~/sql/kysely";
import { KyselyEventsRepository } from "~/sql/kysely/repositories/KyselyEventsRepository";

export const EventsController = new Elysia()
	.decorate({
		accountsRepository: new KyselyAccountsRepository(database),
		eventsRepository: new KyselyEventsRepository(database),
	})
	.group("/events", app => {
		const { accountsRepository, eventsRepository } = app.decorator;

		return app
			.decorate({
				registerEvent: new RegisterEvent(accountsRepository, eventsRepository),
			})
			.post("/", ({ body, registerEvent }) => registerEvent.execute(body), {
				detail: {
					tags: ["Events"],
				},
				body: t.Object({
					accountId: t.String({ format: "uuid" }),
					amount: t.Number(),
					date: t.Date(),
					description: t.Optional(t.String({ maxLength: 1000 })),
					details: t.Object({}),
					type: t.String({ maxLength: 15 }),
				}),
				response: t.Object({
					id: t.String(),
					type: t.String(),
					accountId: t.String(),
					amount: t.Number(),
					date: t.Date(),
					description: t.Nullable(t.String()),
					details: t.Object({}),
					createdAt: t.Date(),
					updatedAt: t.Date(),
				}),
			});
	});
