export type StatementProvider = "MERCADO_PAGO" | "NUBANK" | "GENERIC";
export type StatementTransactionType = "EXPENSE" | "INCOME" | "YIELD";

export interface StatementTransaction {
	amount: number;
	balanceAfter?: number;
	date: string;
	description: string;
	externalId?: string;
	type: StatementTransactionType;
}

export interface Statement {
	periodEnd?: string;
	periodStart?: string;
	provider: StatementProvider;
	transactions: StatementTransaction[];
}
