import { LuDollarSign, LuLandmark } from "react-icons/lu";
import type { Transaction } from "@/lib/api";
import { TransactionAccounts } from "./TransactionAccounts";
import { TransactionTags } from "./TransactionTags";

function formatCurrency(value: number) {
	return new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(value);
}

export function TransactionListItem({ transaction }: { transaction: Transaction }) {
	const amountPrefix = transaction.type === "INCOME" ? "+" : transaction.type === "EXPENSE" ? "−" : "";
	const isCreditCardPurchase = transaction.source === "CREDIT_CARD";
	const amountColor =
		transaction.type === "INCOME"
			? "text-emerald-600"
			: transaction.type === "EXPENSE"
				? "text-rose-600"
				: "text-primary";
	const fallbackTag = transaction.categoryName
		? {
				color: transaction.categoryColor,
				id: transaction.categoryId || `category-${transaction.categoryName}`,
				name: transaction.categoryName,
			}
		: undefined;

	return (
		<div className="flex items-start gap-4 px-4 py-5">
			<div
				className={`flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted ${amountColor}`}
			>
				{isCreditCardPurchase ? <LuDollarSign aria-hidden="true" /> : <LuLandmark aria-hidden="true" />}
			</div>
			<div className="min-w-0 flex-1 space-y-2.5">
				<p className="truncate font-semibold leading-6">
					{transaction.description ||
						transaction.tags?.[0]?.name ||
						transaction.categoryName ||
						"Movimentação"}
				</p>
				<div className="flex min-w-0 flex-wrap items-center gap-1.5">
					<TransactionAccounts transaction={transaction} />
					<TransactionTags fallback={fallbackTag} tags={transaction.tags} />
				</div>
			</div>
			<p className={`shrink-0 whitespace-nowrap pt-0.5 font-bold ${amountColor}`}>
				{amountPrefix}
				{formatCurrency(Number(transaction.amount))}
			</p>
		</div>
	);
}
