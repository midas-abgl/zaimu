import { db, queryRows } from "~/shared/infra/sql";

export async function getFinancialAccountBalances(accountIds: string[]) {
	const balances = new Map(accountIds.map(accountId => [accountId, 0]));
	if (accountIds.length === 0) return balances;
	const transactions = await queryRows(
		db.sql.public.Transaction.select("amount", "destinationFinancialAccountId", "originFinancialAccountId")
			.where((fields, functions) =>
				functions.or(
					functions.in(fields.originFinancialAccountId, accountIds),
					functions.in(fields.destinationFinancialAccountId, accountIds),
				),
			)
			.build(),
	);
	for (const transaction of transactions) {
		if (transaction.originFinancialAccountId && balances.has(transaction.originFinancialAccountId)) {
			balances.set(
				transaction.originFinancialAccountId,
				balances.get(transaction.originFinancialAccountId)! - Number(transaction.amount),
			);
		}
		if (
			transaction.destinationFinancialAccountId &&
			balances.has(transaction.destinationFinancialAccountId)
		) {
			balances.set(
				transaction.destinationFinancialAccountId,
				balances.get(transaction.destinationFinancialAccountId)! + Number(transaction.amount),
			);
		}
	}
	return balances;
}
