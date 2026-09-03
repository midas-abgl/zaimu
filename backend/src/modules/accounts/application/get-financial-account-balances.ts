import { differenceInMonths, differenceInYears } from "date-fns";
import { db, queryRows } from "~/shared/infra/sql";

export function calculateCashbackValue(
	amount: number,
	awardedAt: Date,
	yieldRate?: null | number,
	yieldPeriod?: null | string,
	today = new Date(),
) {
	if (!yieldRate || !yieldPeriod) return amount;
	const periods = Math.max(
		0,
		yieldPeriod === "MONTHLY" ? differenceInMonths(today, awardedAt) : differenceInYears(today, awardedAt),
	);
	return amount * (1 + yieldRate / 100) ** periods;
}

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
	const rewardsAccounts = await queryRows(
		db.sql.public.RewardsAccount.select("financialAccountId", "initialBalance")
			.where((fields, functions) => functions.in(fields.financialAccountId, accountIds))
			.build(),
	);
	const rewardsAccountIds = rewardsAccounts.map(account => account.financialAccountId);
	const cashbackPurchases = rewardsAccountIds.length
		? await queryRows(
				db.sql.public.CreditPurchase.select(
					"cashbackAccountId",
					"cashbackAmount",
					"cashbackYieldPeriod",
					"cashbackYieldRate",
					"purchaseDate",
				)
					.where((fields, functions) => functions.in(fields.cashbackAccountId, rewardsAccountIds))
					.build(),
			)
		: [];
	for (const rewardsAccount of rewardsAccounts) {
		const rewardsBalance = cashbackPurchases
			.filter(purchase => purchase.cashbackAccountId === rewardsAccount.financialAccountId)
			.reduce(
				(total, purchase) =>
					total +
					calculateCashbackValue(
						Number(purchase.cashbackAmount ?? 0),
						purchase.purchaseDate,
						purchase.cashbackYieldRate,
						purchase.cashbackYieldPeriod,
					),
				Number(rewardsAccount.initialBalance),
			);
		balances.set(rewardsAccount.financialAccountId, Number(rewardsBalance.toFixed(4)));
	}
	return balances;
}
