import type { CreditPurchase, Transaction } from "@/lib/api";

export const transactionToCreditPurchase = (transaction: Transaction): CreditPurchase => ({
	categoryId: transaction.categoryId,
	currentInstallment: transaction.currentInstallment ?? 1,
	debtPersonId: transaction.debtPersonId,
	debtPersonName: transaction.debtPersonName,
	description: transaction.description ?? "",
	id: transaction.id,
	installmentAmount: transaction.installmentAmount ?? transaction.amount,
	installments: transaction.installments ?? 1,
	purchaseDate: transaction.date,
	statementId: transaction.creditCardStatementId ?? "",
	storeName: transaction.storeName,
	tagIds: transaction.tagIds,
	tags: transaction.tags,
	time: transaction.time,
	totalAmount: transaction.amount,
});
