import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LuPlus, LuUsersRound } from "react-icons/lu";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { DebtEvent } from "@/lib/api";
import { dataService } from "@/lib/dataService";
import { showToast } from "@/stores";
import { CreateDebtDialog, DebtInvitations, type DebtOriginDraft, DebtPersonCard } from "./debts/components";

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });
function DebtsPage() {
	const queryClient = useQueryClient();
	const [createOpen, setCreateOpen] = useState(false);
	const [editing, setEditing] = useState<{ event: DebtEvent; personId: string } | null>(null);
	const ledger = useQuery({ queryFn: () => dataService.debts.getLedger(), queryKey: ["debts"] });
	const refresh = () => queryClient.invalidateQueries({ queryKey: ["debts"] });
	const create = useMutation({
		mutationFn: (draft: DebtOriginDraft) => dataService.debts.createOrigin(draft),
		onError: error => showToast(error instanceof Error ? error.message : "Origem não criada.", "negative"),
		onSuccess: async () => {
			await refresh();
			showToast("Origem adicionada ao saldo.", "positive");
		},
	});
	const hidePerson = useMutation({
		mutationFn: (id: string) => dataService.debts.hidePerson(id),
		onSuccess: async () => {
			await refresh();
			showToast("Pessoa ocultada deste livro.", "info");
		},
	});
	const hideEvent = useMutation({
		mutationFn: (id: string) => dataService.debts.hideEvent(id),
		onSuccess: async () => {
			await refresh();
			showToast("Origem ocultada.", "info");
		},
	});
	const update = useMutation({
		mutationFn: ({ id, draft }: { id: string; draft: DebtOriginDraft }) =>
			dataService.debts.updateOrigin(id, draft),
		onError: error =>
			showToast(error instanceof Error ? error.message : "Origem não atualizada.", "negative"),
		onSuccess: async () => {
			await refresh();
			setEditing(null);
			showToast("Origem atualizada.", "positive");
		},
	});
	const people = ledger.data?.people ?? [];

	if (ledger.isPending)
		return (
			<div className="mx-auto grid min-h-screen w-full max-w-5xl gap-4 p-4 lg:py-10">
				<Skeleton className="h-56 rounded-3xl" />
				{[1, 2, 3].map(item => (
					<Skeleton className="h-28 rounded-2xl" key={item} />
				))}
			</div>
		);

	return (
		<main className="mx-auto min-h-screen w-full max-w-5xl bg-background lg:py-10">
			<header className="mx-4 rounded-3xl bg-gradient-to-br from-primary to-primary/75 p-5 text-primary-foreground shadow-lg sm:p-6 lg:p-8">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="text-primary-foreground/70 text-sm">Saldo líquido</p>
						<h1 className="font-bold text-3xl sm:text-4xl">
							{currency.format(ledger.data?.totals.net ?? 0)}
						</h1>
					</div>
					<Button
						className="w-full cursor-pointer sm:w-auto"
						onClick={() => setCreateOpen(true)}
						variant="secondary"
					>
						<LuPlus /> Adicionar origem
					</Button>
				</div>
				<div className="mt-6 grid grid-cols-2 gap-4 border-primary-foreground/20 border-t pt-4">
					<div>
						<p className="text-primary-foreground/70 text-sm">A receber</p>
						<strong>{currency.format(ledger.data?.totals.owedToMe ?? 0)}</strong>
					</div>
					<div className="text-right">
						<p className="text-primary-foreground/70 text-sm">A pagar</p>
						<strong>{currency.format(ledger.data?.totals.iOwe ?? 0)}</strong>
					</div>
				</div>
			</header>
			<div className="mt-5">
				<DebtInvitations />
			</div>
			<section className="grid gap-3 px-4 pt-4 pb-8">
				{people.length ? (
					people.map(person => (
						<DebtPersonCard
							key={person.id}
							onEditEvent={(event, personId) => setEditing({ event, personId })}
							onHideEvent={id => hideEvent.mutate(id)}
							onHidePerson={id => hidePerson.mutate(id)}
							person={person}
						/>
					))
				) : (
					<div className="rounded-2xl border bg-card py-12 text-center">
						<LuUsersRound className="mx-auto size-10 text-muted-foreground" />
						<p className="mt-3 font-semibold">Nenhuma dívida cadastrada</p>
						<p className="text-muted-foreground text-sm">Adicione uma origem ou vincule uma movimentação.</p>
					</div>
				)}
			</section>
			<CreateDebtDialog
				onOpenChange={setCreateOpen}
				onSubmit={draft => create.mutateAsync(draft)}
				open={createOpen}
				pending={create.isPending}
			/>
			<CreateDebtDialog
				initialValue={
					editing
						? {
								amount: editing.event.amount,
								date: editing.event.date,
								description: editing.event.description ?? undefined,
								dueDate: editing.event.dueDate ?? undefined,
								isOwedToMe: editing.event.effect >= 0,
								personId: editing.personId,
							}
						: undefined
				}
				onOpenChange={open => {
					if (!open) setEditing(null);
				}}
				onSubmit={draft => update.mutateAsync({ draft, id: editing!.event.id })}
				open={Boolean(editing)}
				pending={update.isPending}
			/>
		</main>
	);
}

export const Route = createFileRoute("/debts")({ component: DebtsPage });
