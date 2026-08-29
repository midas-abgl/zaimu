import { LuDollarSign, LuLandmark, LuPencil, LuStore, LuTrash2 } from "react-icons/lu";
import { Button } from "@/components/ui/Button";
import { ConfirmActionButton } from "@/components/ui/ConfirmActionButton";
import type { Transaction } from "@/lib/api";
import { TransactionAccounts } from "./TransactionAccounts";
import { TransactionTags } from "./TransactionTags";

function formatCurrency(value: number) {
	return new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(value);
}

export function TransactionListItem({
	deleting = false,
	onDelete,
	onEdit,
	transaction,
}: {
	deleting?: boolean;
	onDelete?: () => void;
	onEdit?: () => void;
	transaction: Transaction;
}) {
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
		<div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 px-4 py-5">
			<div
				className={`flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted ${amountColor}`}
			>
				{isCreditCardPurchase ? <LuDollarSign aria-hidden="true" /> : <LuLandmark aria-hidden="true" />}
			</div>
			<div className="min-w-0 space-y-2.5">
				<div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
					<p className="min-w-0 flex-1 truncate font-semibold leading-6">
						{transaction.description ||
							transaction.tags?.[0]?.name ||
							transaction.categoryName ||
							"Movimentação"}
					</p>
					<p className={`whitespace-nowrap font-bold ${amountColor}`}>
						{amountPrefix}
						{formatCurrency(Number(transaction.amount))}
					</p>
				</div>
				<div className="flex min-w-0 flex-wrap items-center gap-1.5">
					{transaction.storeName ? (
						<span className="inline-flex min-w-0 items-center gap-1 text-muted-foreground text-xs">
							<LuStore aria-hidden="true" className="size-3.5 shrink-0" />
							<span className="max-w-40 truncate">{transaction.storeName}</span>
						</span>
					) : null}
					<TransactionAccounts transaction={transaction} />
					<TransactionTags fallback={fallbackTag} tags={transaction.tags} />
				</div>
				{onEdit || onDelete ? (
					<div className="flex flex-wrap justify-end gap-2 border-t pt-3">
						{onEdit ? (
							<Button
								className="cursor-pointer"
								disabled={deleting}
								onClick={onEdit}
								size="sm"
								variant="outline"
							>
								<LuPencil /> Editar
							</Button>
						) : null}
						{onDelete ? (
							<ConfirmActionButton
								className="cursor-pointer disabled:cursor-not-allowed"
								confirmation="Excluir esta transação permanentemente?"
								confirmChildren={
									<>
										<LuTrash2 /> Excluir
									</>
								}
								disabled={deleting}
								onConfirm={onDelete}
								size="sm"
								variant="destructive"
							>
								<LuTrash2 /> Excluir
							</ConfirmActionButton>
						) : null}
					</div>
				) : null}
			</div>
		</div>
	);
}
