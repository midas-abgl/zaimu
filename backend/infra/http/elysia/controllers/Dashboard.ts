import { GetDashboardInfo } from "@zaimu/application";
import Elysia, { t } from "elysia";
import { KyselyAccountsRepository, database } from "~/sql/kysely";

export const DashboardController = new Elysia()
	.decorate({
		accountsRepository: new KyselyAccountsRepository(database),
	})
	.group("/dashboard", app => {
		const { accountsRepository } = app.decorator;

		return app
			.decorate({
				getDashboardInfo: new GetDashboardInfo(accountsRepository),
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
					expectedExpenses: t.Number(),
					expectedIncome: t.Number(),
				}),
			});
	});
