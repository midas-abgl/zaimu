import { replaceEntityTags, tagEntityType } from "~/modules/categories/application/tag-assignments";
import { deleteCreatorDebtEventForPurchase } from "~/modules/debts/application";
import { db, executeStatement, numeric, param, queryRows } from "~/shared/infra/sql";

export async function deleteLinkedSubscriptionPurchases(subscriptionId: string, userId: string) {
	const purchases = await queryRows(
		db.sql.public.CreditPurchase.select("id", "installmentAmount", "statementId")
			.where((fields, functions) => functions.eq(fields.subscriptionId, subscriptionId))
			.build(),
	);
	if (!purchases.length) return 0;

	await Promise.all(purchases.map(purchase => deleteCreatorDebtEventForPurchase(purchase.id, userId)));
	await replaceEntityTags({
		entityIds: purchases.map(purchase => purchase.id),
		entityType: tagEntityType.creditPurchase,
		tagIds: [],
	});
	await executeStatement(
		db.sql.public.CreditPurchase.delete()
			.where((fields, functions) =>
				functions.in(
					fields.id,
					purchases.map(purchase => purchase.id),
				),
			)
			.build(),
	);

	const totalsByStatement = new Map<string, number>();
	for (const purchase of purchases)
		totalsByStatement.set(
			purchase.statementId,
			(totalsByStatement.get(purchase.statementId) ?? 0) + Number(purchase.installmentAmount),
		);
	await Promise.all(
		[...totalsByStatement].map(([statementId, removedAmount]) => {
			const amount = param(numeric<12, 2>(removedAmount), { codecId: "pg/numeric@1" });
			return executeStatement(
				db.sql.public.CreditCardStatement.update((fields, functions) => ({
					totalAmount: functions.raw`GREATEST(0, ${fields.totalAmount} - ${amount})`.returns("pg/numeric@1"),
					updatedAt: functions.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
				}))
					.where((fields, functions) => functions.eq(fields.id, statementId))
					.build(),
			);
		}),
	);
	return purchases.length;
}
