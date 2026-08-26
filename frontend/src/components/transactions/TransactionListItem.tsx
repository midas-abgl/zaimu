import { HiArrowDown, HiArrowsRightLeft, HiArrowUp } from "react-icons/hi2";
import type { Transaction } from "@/lib/api";

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

	return (
		<div className="flex items-center gap-3 p-4">
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
					{transaction.description || transaction.tags?.[0]?.name || "Movimentação"}
				</p>
				{transaction.tags?.length && transaction.description ? (
					<p className="truncate text-muted-foreground text-xs">
						{transaction.tags.map(tag => tag.name).join(" · ")}
					</p>
				) : transaction.categoryName && transaction.description ? (
					<p className="truncate text-muted-foreground text-xs">{transaction.categoryName}</p>
				) : null}
				{transaction.sourceName ? (
					<p className="truncate text-muted-foreground text-xs">
						{transaction.source === "CREDIT_CARD" ? "Cartão" : "Conta"}: {transaction.sourceName}
					</p>
				) : null}
			</div>
			<p className={`shrink-0 whitespace-nowrap font-bold ${amountColor}`}>
				{amountPrefix}
				{formatCurrency(Number(transaction.amount))}
			</p>
		</div>
	);
}
