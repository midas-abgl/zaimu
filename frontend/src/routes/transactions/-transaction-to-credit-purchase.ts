import type { CreditPurchase, Transaction } from "@/lib/api";

export const transactionToCreditPurchase = (transaction: Transaction): CreditPurchase => ({
	categoryId: transaction.categoryId,
	currentInstallment: transaction.currentInstallment ?? 1,
	debtSplit: transaction.debtSplit,
	description: transaction.description ?? "",
	feeAmount: transaction.feeAmount,
	feeDescription: transaction.feeDescription,
	id: transaction.id,
	installmentAmount: transaction.installmentAmount ?? transaction.amount,
	installments: transaction.installments ?? 1,
	isRefund: transaction.isRefund,
	purchaseDate: transaction.date,
	refundOfPurchaseId: transaction.refundOfPurchaseId,
	statementId: transaction.creditCardStatementId ?? "",
	storeName: transaction.storeName,
	tagIds: transaction.tagIds,
	tags: transaction.tags,
	time: transaction.time,
	totalAmount: transaction.amount,
});
