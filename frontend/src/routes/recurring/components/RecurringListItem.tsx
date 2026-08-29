import { HiArrowDown, HiArrowUp, HiCheck, HiPause, HiPencil, HiPlay, HiTrash } from "react-icons/hi2";
import { LuLandmark } from "react-icons/lu";
import { TransactionTags } from "@/components/transactions/TransactionListItem/TransactionTags";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmActionButton } from "@/components/ui/ConfirmActionButton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/Tooltip";
import { formatLocalDate } from "@/lib/date";
import { frequencyLabels, paymentMethodLabels, sourceLabels } from "./constants";
import { isRecurrenceEnded } from "./recurrence-dates";
import type { RecurringListItemData } from "./types";

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });

export function RecurringListItem({
	deleting,
	item,
	onDelete,
	onEdit,
	onToggle,
	toggling,
}: {
	deleting: boolean;
	item: RecurringListItemData;
	onDelete: () => void;
	onEdit: () => void;
	onToggle: () => void;
	toggling: boolean;
}) {
	const isIncome = item.direction === "INCOME";
	const hasEnded = isRecurrenceEnded(item.endDate);
	const paymentMethod = item.paymentMethod ? paymentMethodLabels[item.paymentMethod] : undefined;

	return (
		<div className={`grid grid-cols-[auto_minmax(0,1fr)] gap-4 px-4 py-5 ${item.active ? "" : "opacity-60"}`}>
			<div
				className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${
					isIncome ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
				}`}
			>
				{isIncome ? <HiArrowDown aria-hidden="true" /> : <HiArrowUp aria-hidden="true" />}
			</div>
			<div className="min-w-0 space-y-2.5">
				<div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
					<div className="flex min-w-0 flex-wrap items-center gap-2">
						<p className="min-w-0 flex-1 truncate font-semibold leading-6">{item.title}</p>
						<Badge variant="outline">{sourceLabels[item.source]}</Badge>
						{!item.active && <Badge variant="secondary">Pausada</Badge>}
						{hasEnded && <Badge variant="secondary">Encerrada</Badge>}
					</div>
					<p className={`whitespace-nowrap font-bold ${isIncome ? "text-emerald-600" : "text-rose-600"}`}>
						{isIncome ? "+" : "−"}
						{currency.format(item.amount)}
					</p>
				</div>
				<div className="flex min-w-0 flex-wrap items-center gap-1.5">
					<span className="text-muted-foreground text-xs">
						{frequencyLabels[item.frequency]}
						{item.day ? ` · dia ${item.day}` : ""}
						{paymentMethod ? ` · ${paymentMethod}` : ""}
						{item.startDate ? ` · inicia ${formatLocalDate(item.startDate)}` : ""}
						{item.endDate ? ` · até ${formatLocalDate(item.endDate)}` : ""}
					</span>
					{item.accountName ? (
						<Badge className="h-7 max-w-full gap-1.5 px-2.5 font-normal" variant="outline">
							<LuLandmark aria-hidden="true" />
							<span className="text-muted-foreground">Conta:</span>
							<span className="truncate">{item.accountName}</span>
						</Badge>
					) : null}
					<TransactionTags tags={item.tags} />
				</div>
				<div className="flex flex-wrap justify-end gap-2 border-t pt-3">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								aria-label="Editar recorrência"
								className="cursor-pointer disabled:cursor-not-allowed"
								disabled={toggling || deleting}
								onClick={onEdit}
								size="icon-sm"
								variant="outline"
							>
								<HiPencil />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Editar</TooltipContent>
					</Tooltip>
					{!hasEnded ? (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									aria-label={item.active ? "Pausar recorrência" : "Retomar recorrência"}
									className="cursor-pointer disabled:cursor-not-allowed"
									disabled={toggling || deleting}
									onClick={onToggle}
									size="icon-sm"
									variant="outline"
								>
									{item.active ? <HiPause /> : <HiPlay />}
								</Button>
							</TooltipTrigger>
							<TooltipContent>{item.active ? "Pausar" : "Retomar"}</TooltipContent>
						</Tooltip>
					) : null}
					<Tooltip>
						<TooltipTrigger asChild>
							<span>
								<ConfirmActionButton
									aria-label="Excluir recorrência"
									className="cursor-pointer disabled:cursor-not-allowed"
									confirmation={`Excluir ${item.title} permanentemente?`}
									confirmChildren={<HiCheck />}
									disabled={toggling || deleting}
									onConfirm={onDelete}
									size="icon-sm"
									variant="destructive"
								>
									<HiTrash />
								</ConfirmActionButton>
							</span>
						</TooltipTrigger>
						<TooltipContent>Excluir</TooltipContent>
					</Tooltip>
				</div>
			</div>
		</div>
	);
}
