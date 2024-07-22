import { GetDashboardInfo } from "@zaimu/application";
import Elysia, { t } from "elysia";
import { KyselyAccountsRepository, KyselyEventsRepository, database } from "~/sql/kysely";

export const DashboardController = new Elysia()
	.decorate({
		accountsRepository: new KyselyAccountsRepository(database),
		eventsRepository: new KyselyEventsRepository(database),
	})
	.group("/dashboard", app => {
		const { accountsRepository, eventsRepository } = app.decorator;

		return app
			.decorate({
				getDashboardInfo: new GetDashboardInfo(accountsRepository, eventsRepository),
			})
			.get("/", ({ getDashboardInfo, query: { userEmail } }) => getDashboardInfo.execute({ userEmail }), {
				detail: {
					tags: ["Dashboard"],
				},
				query: t.Object({
					userEmail: t.String({ format: "email" }),
				}),
				response: t.Object({
					balance: t.Number(),
					expenses: t.Object({
						current: t.Number(),
						next: t.Number(),
					}),
					income: t.Object({
						current: t.Number(),
						next: t.Number(),
					}),
				}),
			});
	});
