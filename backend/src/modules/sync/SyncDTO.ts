import { t } from "elysia";

const Id = t.String({ maxLength: 36, minLength: 1 });
const Entity = t.Record(t.String(), t.Unknown());

export const SyncBody = t.Object({
	categories: t.Optional(t.Array(Entity)),
	creditCardStatements: t.Optional(t.Array(Entity)),
	creditCards: t.Optional(t.Array(Entity)),
	creditPurchases: t.Optional(t.Array(Entity)),
	debts: t.Optional(t.Array(Entity)),
	financialAccounts: t.Optional(t.Array(Entity)),
	loans: t.Optional(t.Array(Entity)),
	recurringPayments: t.Optional(t.Array(Entity)),
	salaries: t.Optional(t.Array(Entity)),
	subscriptions: t.Optional(t.Array(Entity)),
	transactions: t.Optional(t.Array(Entity)),
});
export type SyncBody = typeof SyncBody.static;

export const SyncReturn = t.Object({
	serverData: t.Object({
		categories: t.Array(Entity),
		creditCardStatements: t.Array(Entity),
		creditCards: t.Array(Entity),
		creditPurchases: t.Array(Entity),
		debts: t.Array(Entity),
		financialAccounts: t.Array(Entity),
		loans: t.Array(Entity),
		recurringPayments: t.Array(Entity),
		salaries: t.Array(Entity),
		subscriptions: t.Array(Entity),
		transactions: t.Array(Entity),
	}),
	syncResults: t.Record(t.String(), t.Object({ errors: t.Array(t.String()), synced: t.Number() })),
});
export type SyncReturn = typeof SyncReturn.static;

export { Id };
