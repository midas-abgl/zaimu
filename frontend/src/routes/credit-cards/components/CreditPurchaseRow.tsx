import { LuPencil, LuRefreshCw, LuTrash2, LuUsersRound } from "react-icons/lu";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmActionButton } from "@/components/ui/ConfirmActionButton";
import type { CreditPurchase } from "@/lib/api";
import { formatLocalDate, formatLocalTime } from "@/lib/date";

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });

export function CreditPurchaseRow({
	disabled,
	onDelete,
	onEdit,
	onRefinance,
	purchase,
}: {
	disabled: boolean;
	onDelete: () => void | Promise<void>;
	onEdit: () => void;
	onRefinance: () => void;
	purchase: CreditPurchase;
}) {
	return (
		<div className="grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
			<div className="min-w-0">
				<p className="truncate font-medium">{purchase.description || purchase.storeName || "Compra"}</p>
				<p className="text-muted-foreground text-xs">
					{formatLocalDate(purchase.purchaseDate)}
					{formatLocalTime(purchase.time) ? ` · ${formatLocalTime(purchase.time)}` : ""}
					{purchase.storeName ? ` · ${purchase.storeName}` : ""}
					{purchase.isForecast ? " · Previsão" : ""}
					{purchase.tags?.length
						? ` · ${purchase.tags.map(tag => tag.name).join(" · ")}`
						: purchase.categoryName
							? ` · ${purchase.categoryName}`
							: ""}
					{purchase.installments > 1 ? ` · ${purchase.currentInstallment}/${purchase.installments}` : ""}
					{purchase.isSettled ? " · Quitada por reparcelamento" : ""}
				</p>
				{purchase.debtPersonName ? (
					<Badge className="mt-2 gap-1.5" variant="outline">
						<LuUsersRound /> Dívida · {purchase.debtPersonName}
					</Badge>
				) : null}
			</div>
			<div className="grid justify-items-end gap-2">
				<strong>{currency.format(purchase.installmentAmount)}</strong>
				<div className="flex gap-2">
					<Button
						aria-label={`Editar ${purchase.description}`}
						className="cursor-pointer"
						disabled={disabled}
						onClick={onEdit}
						size="sm"
						variant="outline"
					>
						<LuPencil /> Editar
					</Button>
					{purchase.installments > 1 && !purchase.isSettled ? (
						<Button
							aria-label={`Reparcelar ${purchase.description}`}
							className="cursor-pointer"
							disabled={disabled}
							onClick={onRefinance}
							size="sm"
							variant="outline"
						>
							<LuRefreshCw /> Reparcelar
						</Button>
					) : null}
					<ConfirmActionButton
						aria-label={`Excluir ${purchase.description}`}
						className="w-24 cursor-pointer"
						confirmation={
							purchase.installments > 1
								? "Excluir esta parcela permanentemente?"
								: "Excluir esta compra permanentemente?"
						}
						disabled={disabled}
						onConfirm={onDelete}
						size="sm"
						variant="destructive"
					>
						<LuTrash2 /> Excluir
					</ConfirmActionButton>
				</div>
			</div>
		</div>
	);
}
