import { useState } from "react";
import {
	LuChevronDown,
	LuChevronUp,
	LuPencil,
	LuShoppingCart,
	LuTrash2,
	LuUsersRound,
	LuWalletCards,
} from "react-icons/lu";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmActionButton } from "@/components/ui/ConfirmActionButton";
import type { DebtEvent, DebtPerson } from "@/lib/api";
import { formatLocalDate } from "@/lib/date";

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });

function eventLabel(event: DebtEvent) {
	if (event.description) return event.description;
	if (event.kind === "PURCHASE") return "Compra";
	if (event.kind === "TRANSACTION") return event.effect < 0 ? "Recebimento" : "Pagamento";
	if (event.kind === "MIGRATED_SETTLEMENT") return "Quitação migrada";
	return "Lançamento manual";
}

export function DebtPersonCard({
	onDeleteEvent,
	onDeletePerson,
	onEditEvent,
	person,
}: {
	onDeleteEvent: (id: string) => void;
	onDeletePerson: (id: string) => void;
	onEditEvent: (event: DebtEvent, personId: string) => void;
	person: DebtPerson;
}) {
	const [expanded, setExpanded] = useState(false);
	return (
		<article className="rounded-2xl border bg-card p-4 shadow-sm">
			<div className="flex items-start gap-3">
				<div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
					<LuUsersRound />
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<h2 className="truncate font-semibold">{person.name}</h2>
						{person.isZaimuUser ? <Badge variant="secondary">Zaimu</Badge> : null}
						{person.connectionStatus === "PENDING" ? <Badge variant="outline">Convite pendente</Badge> : null}
					</div>
					<p className="text-muted-foreground text-sm">
						{person.balance > 0 ? "Deve a você" : person.balance < 0 ? "Você deve" : "Saldo quitado"}
					</p>
				</div>
				<strong
					className={
						person.balance > 0
							? "text-emerald-600"
							: person.balance < 0
								? "text-rose-600"
								: "text-muted-foreground"
					}
				>
					{currency.format(Math.abs(person.balance))}
				</strong>
			</div>
			<div className="mt-3 flex gap-2">
				<Button
					className="flex-1 cursor-pointer"
					onClick={() => setExpanded(current => !current)}
					type="button"
					variant="outline"
				>
					{expanded ? <LuChevronUp /> : <LuChevronDown />} {expanded ? "Minimizar" : "Expandir"}
				</Button>
				<ConfirmActionButton
					aria-label={`Excluir ${person.name}`}
					className="cursor-pointer"
					confirmation={`Excluir ${person.name}?`}
					onConfirm={() => onDeletePerson(person.id)}
					size="icon"
					variant="destructive"
				>
					<LuTrash2 />
				</ConfirmActionButton>
			</div>
			{expanded ? (
				<div className="mt-4 grid gap-2 border-t pt-4">
					{person.events.map(event => (
						<div
							className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-xl border p-3 sm:flex sm:gap-3"
							key={event.id}
						>
							<div className="text-muted-foreground">
								{event.kind === "PURCHASE" ? <LuShoppingCart /> : <LuWalletCards />}
							</div>
							<div className="min-w-0 flex-1">
								<p className="truncate font-medium text-sm">{eventLabel(event)}</p>
								<p className="text-muted-foreground text-xs">
									{formatLocalDate(event.date)} · {event.createdByMe ? "Você" : event.createdByName}
								</p>
							</div>
							<div className="col-span-2 flex items-center justify-end gap-2 border-t pt-2 sm:col-auto sm:ml-auto sm:border-0 sm:pt-0">
								<span className={event.effect >= 0 ? "text-emerald-600" : "text-rose-600"}>
									{event.effect >= 0 ? "+" : "−"}
									{currency.format(Math.abs(event.effect))}
								</span>
								{event.kind === "ORIGIN" && event.createdByMe ? (
									<Button
										aria-label="Editar lançamento"
										className="cursor-pointer"
										onClick={() => onEditEvent(event, person.id)}
										size="icon"
										type="button"
										variant="outline"
									>
										<LuPencil />
									</Button>
								) : null}
								{event.kind === "ORIGIN" ? (
									<ConfirmActionButton
										aria-label="Excluir lançamento"
										className="cursor-pointer"
										confirmation="Excluir este lançamento?"
										onConfirm={() => onDeleteEvent(event.id)}
										size="icon"
										variant="destructive"
									>
										<LuTrash2 />
									</ConfirmActionButton>
								) : null}
							</div>
						</div>
					))}
				</div>
			) : null}
		</article>
	);
}
