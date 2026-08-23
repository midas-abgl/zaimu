import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HiArrowDown, HiArrowsRightLeft, HiArrowUp, HiPlus } from "react-icons/hi2";
import { Button } from "@/components/ui/Button";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { DateField } from "@/components/ui/DateField";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField } from "@/components/ui/FormField";
import { MoneyField } from "@/components/ui/MoneyField";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDebouncedInput } from "@/hooks/use-debounced-input";
import type { Transaction } from "@/lib/api";
import { dataService } from "@/lib/dataService";

const typeOptions = [
	{ icon: null, id: "all", label: "Todas" },
	{ icon: HiArrowUp, id: "EXPENSE", label: "Despesas" },
	{ icon: HiArrowDown, id: "INCOME", label: "Receitas" },
	{ icon: HiArrowsRightLeft, id: "TRANSFER", label: "Transferências" },
] as const;

function formatCurrency(value: number) {
	return new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(value);
}

function TransactionsPage() {
	const queryClient = useQueryClient();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [filterType, setFilterType] = useState<string>("all");
	const [draft, setDraft] = useState({
		amount: "",
		categoryId: "",
		date: new Date().toISOString().slice(0, 10),
		description: "",
		destinationFinancialAccountId: "",
		originFinancialAccountId: "",
		type: "EXPENSE" as Transaction["type"],
	});
	const [description, setDescription] = useDebouncedInput(draft.description, value =>
		setDraft(current => ({ ...current, description: value })),
	);

	const transactionsQuery = useQuery({
		queryFn: () =>
			dataService.transactions.getAll({
				limit: 50,
				type: filterType === "all" ? undefined : (filterType as Transaction["type"]),
			}),
		queryKey: ["transactions", filterType],
	});
	const accountsQuery = useQuery({ queryFn: () => dataService.accounts.getAll(), queryKey: ["accounts"] });
	const categoriesQuery = useQuery({
		queryFn: () => dataService.categories.getAll(),
		queryKey: ["categories"],
	});

	const resetForm = () => {
		setDraft({
			amount: "",
			categoryId: "",
			date: new Date().toISOString().slice(0, 10),
			description: "",
			destinationFinancialAccountId: "",
			originFinancialAccountId: "",
			type: "EXPENSE",
		});
		setDescription("");
	};

	const createMutation = useMutation({
		mutationFn: () =>
			dataService.transactions.create({
				amount: Number.parseFloat(draft.amount),
				categoryId: draft.categoryId || undefined,
				date: draft.date,
				description: description || undefined,
				destinationFinancialAccountId: draft.destinationFinancialAccountId || undefined,
				originFinancialAccountId: draft.originFinancialAccountId || undefined,
				type: draft.type,
			}),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["transactions"] }),
				queryClient.invalidateQueries({ queryKey: ["accounts"] }),
				queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
			]);
			setIsModalOpen(false);
			resetForm();
		},
	});

	const groupedTransactions = transactionsQuery.data?.reduce<Record<string, Transaction[]>>(
		(groups, transaction) => {
			const date = transaction.date.slice(0, 10);
			if (!groups[date]) groups[date] = [];
			groups[date].push(transaction);
			return groups;
		},
		{},
	);

	return (
		<div className="space-y-6">
			<PageHeader
				actions={
					<Button className="cursor-pointer" onClick={() => setIsModalOpen(true)}>
						<HiPlus />
						Adicionar
					</Button>
				}
				description="Acompanhe entradas, despesas e transferências."
				title="Transações"
			/>

			<div className="grid grid-cols-2 gap-2 rounded-2xl border bg-card p-2 sm:grid-cols-4">
				{typeOptions.map(option => (
					<Button
						className="cursor-pointer"
						key={option.id}
						onClick={() => setFilterType(option.id)}
						variant={filterType === option.id ? "default" : "outline"}
					>
						{option.icon && <option.icon />}
						{option.label}
					</Button>
				))}
			</div>

			{transactionsQuery.isPending ? (
				<div className="space-y-5">
					{[1, 2, 3].map(item => (
						<div className="space-y-2" key={item}>
							<Skeleton className="h-4 w-36" />
							<Skeleton className="h-24 rounded-2xl" />
						</div>
					))}
				</div>
			) : transactionsQuery.isError ? (
				<EmptyState
					description="Não foi possível carregar suas movimentações."
					icon={<HiArrowsRightLeft />}
					title="Falha ao carregar transações"
				/>
			) : !groupedTransactions || Object.keys(groupedTransactions).length === 0 ? (
				<EmptyState
					description="Registre sua primeira movimentação para começar."
					icon={<HiArrowsRightLeft />}
					title="Nenhuma transação"
				/>
			) : (
				<div className="space-y-5">
					{Object.entries(groupedTransactions).map(([date, transactions]) => (
						<section className="space-y-2" key={date}>
							<h2 className="font-medium text-muted-foreground text-sm">
								{new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
									day: "numeric",
									month: "long",
									weekday: "long",
								})}
							</h2>
							<div className="divide-y rounded-2xl border bg-card shadow-sm">
								{transactions.map(transaction => (
									<div className="flex items-center gap-3 p-4" key={transaction.id}>
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
												{transaction.description || transaction.categoryName || "Movimentação"}
											</p>
											{transaction.categoryName && transaction.description && (
												<p className="truncate text-muted-foreground text-xs">{transaction.categoryName}</p>
											)}
										</div>
										<p
											className={`font-bold ${transaction.type === "INCOME" ? "text-emerald-600" : transaction.type === "EXPENSE" ? "text-rose-600" : "text-primary"}`}
										>
											{transaction.type === "INCOME" ? "+" : transaction.type === "EXPENSE" ? "−" : ""}
											{formatCurrency(Number(transaction.amount))}
										</p>
									</div>
								))}
							</div>
						</section>
					))}
				</div>
			)}

			<Dialog onOpenChange={setIsModalOpen} open={isModalOpen}>
				<DialogContent className="max-h-[92dvh] sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Nova transação</DialogTitle>
						<DialogDescription>Informe os dados da movimentação.</DialogDescription>
					</DialogHeader>
					<div className="scrollbar-themed grid gap-4 overflow-y-auto pr-1">
						<CustomSelect
							label="Tipo"
							onValueChange={value =>
								setDraft(current => ({ ...current, type: value as Transaction["type"] }))
							}
							options={[
								{ label: "Despesa", value: "EXPENSE" },
								{ label: "Receita", value: "INCOME" },
								{ label: "Transferência", value: "TRANSFER" },
							]}
							placeholder="Selecione o tipo"
							required
							value={draft.type}
						/>
						<MoneyField
							id="transaction-amount"
							label="Valor"
							onValueChange={amount => setDraft(current => ({ ...current, amount }))}
							required
							value={draft.amount}
						/>
						<FormField
							autoComplete="off"
							id="transaction-description"
							label="Descrição"
							name="description"
							onChange={event => setDescription(event.currentTarget.value)}
							placeholder="Ex: Mercado do mês"
							type="text"
							value={description}
						/>
						<DateField
							id="transaction-date"
							label="Data"
							name="date"
							onChange={event => setDraft(current => ({ ...current, date: event.currentTarget.value }))}
							required
							value={draft.date}
						/>
						{draft.type !== "TRANSFER" && categoriesQuery.data?.length ? (
							<CustomSelect
								label="Categoria"
								onValueChange={categoryId => setDraft(current => ({ ...current, categoryId }))}
								options={categoriesQuery.data.map(category => ({ label: category.name, value: category.id }))}
								placeholder="Selecione a categoria"
								value={draft.categoryId}
							/>
						) : null}
						{accountsQuery.data?.length ? (
							<CustomSelect
								label={draft.type === "TRANSFER" ? "Conta de origem" : "Conta"}
								onValueChange={originFinancialAccountId =>
									setDraft(current => ({ ...current, originFinancialAccountId }))
								}
								options={accountsQuery.data.map(account => ({ label: account.name, value: account.id }))}
								placeholder="Selecione a conta"
								value={draft.originFinancialAccountId}
							/>
						) : null}
						{draft.type === "TRANSFER" && accountsQuery.data?.length ? (
							<CustomSelect
								label="Conta de destino"
								onValueChange={destinationFinancialAccountId =>
									setDraft(current => ({ ...current, destinationFinancialAccountId }))
								}
								options={accountsQuery.data
									.filter(account => account.id !== draft.originFinancialAccountId)
									.map(account => ({ label: account.name, value: account.id }))}
								placeholder="Selecione o destino"
								value={draft.destinationFinancialAccountId}
							/>
						) : null}
					</div>
					<DialogFooter>
						<Button className="cursor-pointer" onClick={() => setIsModalOpen(false)} variant="outline">
							Descartar
						</Button>
						<Button
							className="cursor-pointer"
							disabled={!draft.amount || createMutation.isPending}
							onClick={() => createMutation.mutate()}
						>
							{createMutation.isPending ? "Salvando…" : "Salvar"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

export const Route = createFileRoute("/transactions")({ component: TransactionsPage });
