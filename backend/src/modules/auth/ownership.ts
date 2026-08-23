import { HttpException } from "~/shared/errors";
import { db } from "~/shared/infra/sql";

type DirectlyOwnedTable =
	| "Category"
	| "Debt"
	| "FinancialAccount"
	| "Loan"
	| "RecurringPayment"
	| "Salary"
	| "Subscription";

export const assertDirectOwnership = async (table: DirectlyOwnedTable, id: string, userId: string) => {
	const resource = await db
		.selectFrom(table)
		.select("id")
		.where("id", "=", id)
		.where("userId", "=", userId)
		.executeTakeFirst();

	if (!resource) throw new HttpException("Recurso não encontrado", 404);
};

export const assertCreditCardOwnership = async (creditCardId: string, userId: string) => {
	const card = await db
		.selectFrom("CreditCard")
		.innerJoin("FinancialAccount", "FinancialAccount.id", "CreditCard.financialAccountId")
		.select("CreditCard.id")
		.where("CreditCard.id", "=", creditCardId)
		.where("FinancialAccount.userId", "=", userId)
		.executeTakeFirst();

	if (!card) throw new HttpException("Cartão não encontrado", 404);
};

export const assertTransactionOwnership = async (transactionId: string, userId: string) => {
	const transaction = await db
		.selectFrom("Transaction")
		.leftJoin("FinancialAccount as origin", "origin.id", "Transaction.originFinancialAccountId")
		.leftJoin(
			"FinancialAccount as destination",
			"destination.id",
			"Transaction.destinationFinancialAccountId",
		)
		.leftJoin("RecurringPayment", "RecurringPayment.id", "Transaction.recurrenceId")
		.select("Transaction.id")
		.where("Transaction.id", "=", transactionId)
		.where(eb =>
			eb.or([
				eb("origin.userId", "=", userId),
				eb("destination.userId", "=", userId),
				eb("RecurringPayment.userId", "=", userId),
			]),
		)
		.executeTakeFirst();

	if (!transaction) throw new HttpException("Transação não encontrada", 404);
};
