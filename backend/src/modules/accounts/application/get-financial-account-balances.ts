import { differenceInMonths, differenceInYears } from "date-fns";
import { calculateFinancialAccountYieldBalances } from "~/modules/accounts/domain/calculate-financial-account-yields";
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
	const accounts = await queryRows(
		db.sql.public.FinancialAccount.select("id", "userId", "type", "createdAt", "yieldRate", "yieldPeriod")
			.where((fields, functions) => functions.in(fields.id, accountIds))
			.build(),
	);
	const transactions = await queryRows(
		db.sql.public.Transaction.select(
			"amount",
			"date",
			"destinationFinancialAccountId",
			"originFinancialAccountId",
		)
			.where((fields, functions) =>
				functions.or(
					functions.in(fields.originFinancialAccountId, accountIds),
					functions.in(fields.destinationFinancialAccountId, accountIds),
				),
			)
			.build(),
	);
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
	const holidays = accounts.length
		? await queryRows(
				db.sql.public.FinancialAccountYieldHoliday.select("date")
					.where((fields, functions) =>
						functions.in(fields.userId, [...new Set(accounts.map(account => account.userId))]),
					)
					.build(),
			)
		: [];
	return calculateFinancialAccountYieldBalances({
		accounts,
		cashbackCredits: cashbackPurchases.map(purchase => ({
			...purchase,
			cashbackAmount: Number(purchase.cashbackAmount ?? 0),
			cashbackYieldRate: purchase.cashbackYieldRate,
		})),
		holidays: holidays.map(holiday => holiday.date),
		initialRewardsBalances: new Map(
			rewardsAccounts.map(account => [account.financialAccountId, Number(account.initialBalance)]),
		),
		transactions: transactions.map(transaction => ({ ...transaction, amount: Number(transaction.amount) })),
	});
}
