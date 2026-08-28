import { HiArrowDown, HiArrowUp, HiCheck, HiPause, HiPlay, HiTrash } from "react-icons/hi2";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmActionButton } from "@/components/ui/ConfirmActionButton";
import { frequencyLabels, paymentMethodLabels, sourceLabels } from "./constants";
import type { RecurringListItemData } from "./types";

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });

export function RecurringListItem({
	deleting,
	item,
	onDelete,
	onToggle,
	toggling,
}: {
	deleting: boolean;
	item: RecurringListItemData;
	onDelete: () => void;
	onToggle: () => void;
	toggling: boolean;
}) {
	const isIncome = item.direction === "INCOME";
	const paymentMethod = item.paymentMethod ? paymentMethodLabels[item.paymentMethod] : undefined;

	return (
		<div className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${item.active ? "" : "opacity-60"}`}>
			<div className="flex min-w-0 flex-1 items-center gap-3">
				<div
					className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${
						isIncome ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
					}`}
				>
					{isIncome ? <HiArrowDown /> : <HiArrowUp />}
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<p className="truncate font-semibold">{item.title}</p>
						<Badge variant="outline">{sourceLabels[item.source]}</Badge>
						{!item.active && <Badge variant="secondary">Pausada</Badge>}
					</div>
					<p className="truncate text-muted-foreground text-xs">
						{frequencyLabels[item.frequency]}
						{item.day ? ` · dia ${item.day}` : ""}
						{paymentMethod ? ` · ${paymentMethod}` : ""}
					</p>
					{item.tags?.length ? (
						<p className="truncate text-muted-foreground text-xs">
							{item.tags.map(tag => tag.name).join(" · ")}
						</p>
					) : null}
					{item.accountName ? (
						<p className="truncate text-muted-foreground text-xs">Conta: {item.accountName}</p>
					) : null}
				</div>
				<p
					className={`shrink-0 whitespace-nowrap font-bold ${isIncome ? "text-emerald-600" : "text-rose-600"}`}
				>
					{isIncome ? "+" : "−"}
					{currency.format(item.amount)}
				</p>
			</div>
			<div className="flex shrink-0 items-center justify-end gap-2">
				<Button
					className="cursor-pointer disabled:cursor-not-allowed"
					disabled={toggling || deleting}
					onClick={onToggle}
					size="sm"
					variant="outline"
				>
					{item.active ? <HiPause /> : <HiPlay />}
					{toggling ? "Salvando…" : item.active ? "Pausar" : "Retomar"}
				</Button>
				<ConfirmActionButton
					className="cursor-pointer disabled:cursor-not-allowed"
					confirmation={`Excluir ${item.title} permanentemente?`}
					confirmChildren={
						deleting ? (
							"Excluindo…"
						) : (
							<>
								<HiCheck /> Excluir
							</>
						)
					}
					disabled={toggling || deleting}
					onConfirm={onDelete}
					size="sm"
					variant="destructive"
				>
					<HiTrash /> Excluir
				</ConfirmActionButton>
			</div>
		</div>
	);
}
