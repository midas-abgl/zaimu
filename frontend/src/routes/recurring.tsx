import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HiArrowDown, HiArrowPath, HiArrowUp, HiPlus } from "react-icons/hi2";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { dataService } from "@/lib/dataService";
import { showToast } from "@/stores";
import {
	CreateRecurringDialog,
	DeleteRecurringDialog,
	type RecurringDirection,
	RecurringListItem,
	type RecurringListItemData,
	RecurringSummary,
	recurringPaymentToListItem,
	salaryToListItem,
	subscriptionToListItem,
} from "./recurring/components";

type DirectionFilter = "all" | RecurringDirection;

const filterOptions = [
	{ icon: null, id: "all", label: "Todas" },
	{ icon: HiArrowDown, id: "INCOME", label: "Entradas" },
	{ icon: HiArrowUp, id: "EXPENSE", label: "Saídas" },
] as const;

function RecurringPage() {
	const queryClient = useQueryClient();
	const [filter, setFilter] = useState<DirectionFilter>("all");
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<RecurringListItemData>();
	const [deletingItem, setDeletingItem] = useState<RecurringListItemData>();
	const salariesQuery = useQuery({ queryFn: () => dataService.salaries.getAll(), queryKey: ["salaries"] });
	const accountsQuery = useQuery({ queryFn: () => dataService.accounts.getAll(), queryKey: ["accounts"] });
	const subscriptionsQuery = useQuery({
		queryFn: () => dataService.subscriptions.getAll(),
		queryKey: ["subscriptions"],
	});
	const recurringQuery = useQuery({
		queryFn: () => dataService.recurringPayments.getAll(),
		queryKey: ["recurring-payments"],
	});
	const invalidate = async (item: RecurringListItemData) => {
		const queryKey =
			item.source === "salary"
				? ["salaries"]
				: item.source === "subscription"
					? ["subscriptions"]
					: ["recurring-payments"];
		await Promise.all([
			queryClient.invalidateQueries({ queryKey }),
			queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
		]);
	};
	const toggle = useMutation({
		mutationFn: async (item: RecurringListItemData) => {
			if (item.source === "salary") return dataService.salaries.update(item.id, { isActive: !item.active });
			if (item.source === "subscription")
				return dataService.subscriptions.update(item.id, { isActive: !item.active });
			return dataService.recurringPayments.update(item.id, { isActive: !item.active });
		},
		onError: error => showToast(error.message, "negative"),
		onSuccess: async (_, item) => {
			await invalidate(item);
			showToast(item.active ? "Recorrência pausada." : "Recorrência retomada.", "positive");
		},
	});
	const remove = useMutation({
		mutationFn: async ({
			deleteTransactions,
			item,
		}: {
			deleteTransactions: boolean;
			item: RecurringListItemData;
		}) => {
			if (item.source === "salary") return dataService.salaries.delete(item.id, deleteTransactions);
			if (item.source === "subscription")
				return dataService.subscriptions.delete(item.id, deleteTransactions);
			return dataService.recurringPayments.delete(item.id, deleteTransactions);
		},
		onError: error => showToast(error.message, "negative"),
		onSuccess: async (_, { item }) => {
			await invalidate(item);
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["accounts"] }),
				queryClient.invalidateQueries({ queryKey: ["transactions"] }),
			]);
			setDeletingItem(undefined);
			showToast("Recorrência excluída.", "positive");
		},
	});

	const isPending =
		salariesQuery.isPending ||
		accountsQuery.isPending ||
		subscriptionsQuery.isPending ||
		recurringQuery.isPending;
	const isError =
		salariesQuery.isError || accountsQuery.isError || subscriptionsQuery.isError || recurringQuery.isError;
	const items = [
		...(salariesQuery.data ?? []).map(salary => salaryToListItem(salary, accountsQuery.data ?? [])),
		...(subscriptionsQuery.data ?? []).map(subscription =>
			subscriptionToListItem(subscription, accountsQuery.data ?? []),
		),
		...(recurringQuery.data ?? []).map(payment =>
			recurringPaymentToListItem(payment, accountsQuery.data ?? []),
		),
	].sort(
		(left, right) => Number(right.active) - Number(left.active) || left.title.localeCompare(right.title),
	);
	const filteredItems = items.filter(item => filter === "all" || item.direction === filter);
	const activeItems = filteredItems.filter(item => item.active);
	const pausedItems = filteredItems.filter(item => !item.active);
	const monthlyIncome = items
		.filter(item => item.active && item.direction === "INCOME")
		.reduce((total, item) => total + item.monthlyAmount, 0);
	const monthlyExpenses = items
		.filter(item => item.active && item.direction === "EXPENSE")
		.reduce((total, item) => total + item.monthlyAmount, 0);
	const renderItem = (item: RecurringListItemData) => (
		<RecurringListItem
			deleting={remove.isPending && remove.variables?.item.id === item.id}
			item={item}
			key={`${item.source}:${item.id}`}
			onDelete={() => setDeletingItem(item)}
			onEdit={() => setEditingItem(item)}
			onToggle={() => toggle.mutate(item)}
			toggling={toggle.isPending && toggle.variables?.id === item.id}
		/>
	);

	return (
		<PageContainer className="space-y-6">
			<PageHeader
				actions={
					<Button className="cursor-pointer" onClick={() => setIsCreateOpen(true)}>
						<HiPlus />
						Adicionar
					</Button>
				}
				description="Centralize salários, assinaturas e pagamentos que se repetem."
				title="Recorrências"
			/>

			{isPending ? (
				<div className="grid gap-3 sm:grid-cols-2">
					<Skeleton className="h-[74px] rounded-2xl" />
					<Skeleton className="h-[74px] rounded-2xl" />
				</div>
			) : (
				<RecurringSummary expenses={monthlyExpenses} incomes={monthlyIncome} />
			)}

			<div className="grid gap-2 rounded-2xl border bg-card p-2 min-[440px]:grid-cols-3">
				{filterOptions.map(option => (
					<Button
						className="w-full cursor-pointer"
						key={option.id}
						onClick={() => setFilter(option.id)}
						variant={filter === option.id ? "default" : "outline"}
					>
						{option.icon && <option.icon />}
						{option.label}
					</Button>
				))}
			</div>

			{isPending ? (
				<div className="space-y-5">
					{[1, 2].map(section => (
						<div className="space-y-2" key={section}>
							<Skeleton className="h-4 w-28" />
							<Skeleton className="h-36 rounded-2xl" />
						</div>
					))}
				</div>
			) : isError ? (
				<EmptyState
					description="Não foi possível carregar salários, assinaturas e recorrências."
					icon={<HiArrowPath />}
					title="Falha ao carregar recorrências"
				/>
			) : filteredItems.length === 0 ? (
				<EmptyState
					action={
						<Button className="cursor-pointer" onClick={() => setIsCreateOpen(true)}>
							<HiPlus /> Adicionar recorrência
						</Button>
					}
					description={
						items.length === 0
							? "Cadastre uma entrada ou saída recorrente para começar."
							: "Nenhuma recorrência corresponde ao filtro selecionado."
					}
					icon={<HiArrowPath />}
					title="Nenhuma recorrência"
				/>
			) : (
				<div className="space-y-5">
					{activeItems.length > 0 && (
						<section className="space-y-2">
							<h2 className="font-medium text-muted-foreground text-sm">Ativas</h2>
							<div className="divide-y rounded-2xl border bg-card shadow-sm">
								{activeItems.map(renderItem)}
							</div>
						</section>
					)}
					{pausedItems.length > 0 && (
						<section className="space-y-2">
							<h2 className="font-medium text-muted-foreground text-sm">Pausadas</h2>
							<div className="divide-y rounded-2xl border bg-card shadow-sm">
								{pausedItems.map(renderItem)}
							</div>
						</section>
					)}
				</div>
			)}

			<CreateRecurringDialog onOpenChange={setIsCreateOpen} open={isCreateOpen} />
			{editingItem && (
				<CreateRecurringDialog
					item={editingItem}
					key={`${editingItem.source}:${editingItem.id}`}
					onOpenChange={open => {
						if (!open) setEditingItem(undefined);
					}}
					open
				/>
			)}
			{deletingItem && (
				<DeleteRecurringDialog
					deleting={remove.isPending}
					item={deletingItem}
					onDelete={deleteTransactions => remove.mutate({ deleteTransactions, item: deletingItem })}
					onOpenChange={open => {
						if (!open && !remove.isPending) setDeletingItem(undefined);
					}}
				/>
			)}
		</PageContainer>
	);
}

export const Route = createFileRoute("/recurring")({ component: RecurringPage });
