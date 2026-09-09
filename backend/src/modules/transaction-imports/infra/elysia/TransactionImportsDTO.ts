import { t } from "elysia";

export const TransactionImportItemUpdateDTO = t.Object({
	amount: t.Optional(t.Number({ exclusiveMinimum: 0 })),
	categoryId: t.Optional(t.Nullable(t.String({ maxLength: 36, minLength: 1 }))),
	date: t.Optional(t.String()),
	description: t.Optional(t.Nullable(t.String({ maxLength: 1000 }))),
	destinationFinancialAccountId: t.Optional(t.Nullable(t.String({ maxLength: 36, minLength: 1 }))),
	externalId: t.Optional(t.Nullable(t.String({ maxLength: 200 }))),
	isHidden: t.Optional(t.Boolean()),
	isSelected: t.Optional(t.Boolean()),
	originFinancialAccountId: t.Optional(t.Nullable(t.String({ maxLength: 36, minLength: 1 }))),
	storeName: t.Optional(t.Nullable(t.String({ maxLength: 200 }))),
	tagIds: t.Optional(t.Array(t.String({ maxLength: 36, minLength: 1 }))),
	time: t.Optional(t.Nullable(t.String({ pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d)?$" }))),
	type: t.Optional(t.Union([t.Literal("INCOME"), t.Literal("EXPENSE"), t.Literal("TRANSFER")])),
});
