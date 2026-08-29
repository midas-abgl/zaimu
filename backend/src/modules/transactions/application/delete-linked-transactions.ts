import { replaceEntityTags, tagEntityType } from "~/modules/categories/application/tag-assignments";
import { db, executeStatement, queryRows } from "~/shared/infra/sql";

type TransactionLink = "recurrenceId" | "salaryId" | "subscriptionId";

export async function deleteLinkedTransactions(link: TransactionLink, linkedEntityId: string) {
	const transactions = await queryRows(
		db.sql.public.Transaction.select(
			"id",
			"amount",
			"originFinancialAccountId",
			"destinationFinancialAccountId",
		)
			.where((fields, functions) => {
				if (link === "recurrenceId") return functions.eq(fields.recurrenceId, linkedEntityId);
				if (link === "salaryId") return functions.eq(fields.salaryId, linkedEntityId);
				return functions.eq(fields.subscriptionId, linkedEntityId);
			})
			.build(),
	);

	if (transactions.length === 0) return 0;

	const transactionIds = transactions.map(transaction => transaction.id);
	await replaceEntityTags({ entityIds: transactionIds, entityType: tagEntityType.transaction, tagIds: [] });
	await executeStatement(
		db.sql.public.Transaction.delete()
			.where((fields, functions) => functions.in(fields.id, transactionIds))
			.build(),
	);
	return transactionIds.length;
}
