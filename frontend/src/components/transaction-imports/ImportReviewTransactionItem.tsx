import { LuCheck, LuChevronDown, LuCircleAlert, LuEyeOff, LuLandmark, LuPencil } from "react-icons/lu";
import { TransactionListItem } from "@/components/transactions";
import { Button } from "@/components/ui/Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/Tooltip";
import type { Transaction, TransactionImportItem } from "@/lib/api";
import { formatLocalTime } from "@/lib/date";
import { getTransactionTitle } from "@/lib/transaction-title";

function formatCurrency(value: number) {
	return new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(value);
}

export function ImportReviewTransactionItem({
	collapsed,
	decision,
	disabled,
	item,
	onCollapsedChange,
	onDecision,
	onEdit,
	onResolveDuplicate,
	transaction,
}: {
	collapsed: boolean;
	decision?: boolean;
	disabled: boolean;
	item: TransactionImportItem;
	onCollapsedChange: (collapsed: boolean) => void;
	onDecision: (isSelected: boolean) => void;
	onEdit: () => void;
	onResolveDuplicate: () => void;
	transaction: Transaction;
}) {
	const amountPrefix = transaction.type === "INCOME" ? "+" : transaction.type === "EXPENSE" ? "−" : "";
	const amountColor = transaction.type === "INCOME" ? "text-emerald-600" : "text-rose-600";
	const expandLabel = `Expandir ${getTransactionTitle(transaction)}`;

	if (collapsed) {
		return (
			<div className="flex min-w-0 items-center gap-3 px-4 py-3">
				<div
					className={`flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted ${amountColor}`}
				>
					<LuLandmark aria-hidden="true" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="truncate font-medium text-sm">{getTransactionTitle(transaction)}</p>
					<span className="text-muted-foreground text-xs">{decision ? "Aprovada" : "Ignorada"}</span>
				</div>
				<p className={`shrink-0 font-semibold text-sm ${amountColor}`}>
					{amountPrefix}
					{formatCurrency(Number(transaction.amount))}
				</p>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							aria-expanded={false}
							aria-label={expandLabel}
							className="cursor-pointer"
							onClick={() => onCollapsedChange(false)}
							size="icon-xs"
							variant="outline"
						>
							<LuChevronDown aria-hidden="true" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>{expandLabel}</TooltipContent>
				</Tooltip>
			</div>
		);
	}

	return (
		<TransactionListItem
			actionItems={[
				...(item.duplicate
					? [
							{
								disabled,
								icon: <LuCircleAlert />,
								onClick: onResolveDuplicate,
								text: "Resolver duplicata",
							},
						]
					: []),
				{ disabled, icon: <LuPencil />, onClick: onEdit, text: "Editar" },
				{ disabled, icon: <LuCheck />, onClick: () => onDecision(true), text: "Aprovar" },
				{ disabled, icon: <LuEyeOff />, onClick: () => onDecision(false), text: "Ignorar" },
			]}
			className={item.isSelected ? undefined : "opacity-55"}
			forceCompactActions
			metadataPrefix={
				<div className="flex flex-wrap items-center gap-1.5">
					{formatLocalTime(item.time) ? (
						<span className="text-muted-foreground text-xs">{formatLocalTime(item.time)}</span>
					) : null}
					{item.duplicateReason ? (
						<span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-700 text-xs">
							<LuCircleAlert /> Possível duplicata
						</span>
					) : null}
				</div>
			}
			transaction={transaction}
		/>
	);
}
