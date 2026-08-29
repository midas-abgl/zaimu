import { HiArrowDown, HiArrowsRightLeft, HiArrowUp } from "react-icons/hi2";
import type { Transaction } from "@/lib/api";
import { TransactionAccounts } from "./TransactionAccounts";
import { TransactionTags } from "./TransactionTags";

function formatCurrency(value: number) {
	return new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(value);
}

export function TransactionListItem({ transaction }: { transaction: Transaction }) {
	const amountPrefix = transaction.type === "INCOME" ? "+" : transaction.type === "EXPENSE" ? "−" : "";
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
		<div className="flex items-start gap-3 p-4">
			<div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted">
				{transaction.type === "INCOME" ? (
					<HiArrowDown className="text-emerald-600" />
				) : transaction.type === "EXPENSE" ? (
					<HiArrowUp className="text-rose-600" />
				) : (
					<HiArrowsRightLeft className="text-primary" />
				)}
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate font-semibold">
					{transaction.description ||
						transaction.tags?.[0]?.name ||
						transaction.categoryName ||
						"Movimentação"}
				</p>
				<TransactionTags fallback={fallbackTag} tags={transaction.tags} />
				<TransactionAccounts transaction={transaction} />
			</div>
			<p className={`shrink-0 whitespace-nowrap pt-0.5 font-bold ${amountColor}`}>
				{amountPrefix}
				{formatCurrency(Number(transaction.amount))}
			</p>
		</div>
	);
}
