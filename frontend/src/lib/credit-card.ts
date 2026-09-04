import type { CreditCard, CreditCardStatement } from "./api";

const toCents = (amount: number) => Math.round(amount * 100);

export function applyStatementCredits(
	statements: CreditCardStatement[],
	today = new Date().toISOString().slice(0, 10),
): CreditCardStatement[] {
	let carriedCreditInCents = 0;
	const effectiveById = new Map<string, Pick<CreditCardStatement, "balanceAmount" | "isPaid">>();

	const chronologicalStatements = statements.toSorted((left, right) =>
		left.statementDate.localeCompare(right.statementDate),
	);
	for (const statement of chronologicalStatements) {
		const paidAmountInCents = toCents(statement.paidAmount);
		const appliedAmountInCents = paidAmountInCents + carriedCreditInCents;
		const rawBalanceInCents = toCents(statement.totalAmount) - appliedAmountInCents;
		const isClosed = statement.statementDate.slice(0, 10) <= today;
		const balanceAmount = (paidAmountInCents > 0 ? Math.max(0, rawBalanceInCents) : rawBalanceInCents) / 100;
		carriedCreditInCents = Math.max(0, -rawBalanceInCents);
		effectiveById.set(statement.id, {
			balanceAmount,
			isPaid: isClosed && appliedAmountInCents > 0 && rawBalanceInCents <= 0,
		});
	}

	return statements.map(statement => ({ ...statement, ...effectiveById.get(statement.id)! }));
}

export function getCreditCardDisplayName(card: Pick<CreditCard, "accountName">) {
	return card.accountName || "Cartão de crédito";
}
