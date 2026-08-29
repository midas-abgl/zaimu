import { LuDollarSign, LuLandmark, LuPencil, LuStore, LuTrash2 } from "react-icons/lu";
import { Button } from "@/components/ui/Button";
import { ConfirmActionButton } from "@/components/ui/ConfirmActionButton";
import { ListItemLayout } from "@/components/ui/ListItemLayout";
import type { Transaction } from "@/lib/api";
import { getTransactionTitle } from "@/lib/transaction-title";
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
	const isCreditCardPurchase = transaction.source === "CREDIT_CARD";
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
		<ListItemLayout
			actions={
				onEdit || onDelete ? (
					<>
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
					</>
				) : undefined
			}
			amount={
				<p className={`whitespace-nowrap font-bold ${amountColor}`}>
					{amountPrefix}
					{formatCurrency(Number(transaction.amount))}
				</p>
			}
			icon={
				<div
					className={`flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted ${amountColor}`}
				>
					{isCreditCardPurchase ? <LuDollarSign aria-hidden="true" /> : <LuLandmark aria-hidden="true" />}
				</div>
			}
			metadata={
				<>
					{transaction.storeName ? (
						<span className="inline-flex min-w-0 items-center gap-1 text-muted-foreground text-xs">
							<LuStore aria-hidden="true" className="size-3.5 shrink-0" />
							<span className="max-w-40 truncate">{transaction.storeName}</span>
						</span>
					) : null}
					<TransactionAccounts transaction={transaction} />
				</>
			}
			tags={<TransactionTags fallback={fallbackTag} tags={transaction.tags} />}
			title={
				<p className="min-w-0 flex-1 truncate font-semibold leading-6">{getTransactionTitle(transaction)}</p>
			}
		/>
	);
}
