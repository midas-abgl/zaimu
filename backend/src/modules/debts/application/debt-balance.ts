export type DebtTransactionType = "EXPENSE" | "INCOME" | "TRANSFER";

export const debtEffectForTransaction = (amount: number, type: DebtTransactionType) => {
	if (type === "TRANSFER") return 0;
	return type === "INCOME" ? -amount : amount;
};

export const debtEffectForPerspective = (effect: number, createdByCurrentUser: boolean) =>
	createdByCurrentUser ? effect : -effect;

export const calculateDebtTotals = (balances: number[]) =>
	balances.reduce(
		(result, balance) => {
			if (balance > 0) result.owedToMe += balance;
			if (balance < 0) result.iOwe += Math.abs(balance);
			result.net += balance;
			return result;
		},
		{ iOwe: 0, net: 0, owedToMe: 0 },
	);

export const isCompatibleDebtPair = (input: {
	amount: number;
	date: string;
	effect: number;
	eventAmount: number;
	eventDate: string;
	eventPerspectiveEffect: number;
}) =>
	input.amount === input.eventAmount &&
	input.effect === input.eventPerspectiveEffect &&
	input.date.slice(0, 10) === input.eventDate.slice(0, 10);
