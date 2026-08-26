import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HiArrowDown, HiArrowsRightLeft, HiArrowUp, HiPlus } from "react-icons/hi2";
import { CreateTransactionDialog } from "@/components/transactions";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
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
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [filterType, setFilterType] = useState<string>("all");

	const transactionsQuery = useQuery({
		queryFn: () =>
			dataService.transactions.getAll({
				limit: 50,
				type: filterType === "all" ? undefined : (filterType as Transaction["type"]),
			}),
		queryKey: ["transactions", filterType],
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
		<PageContainer className="space-y-6">
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

			<div className="grid gap-2 rounded-2xl border bg-card p-2 sm:grid-cols-4 min-[440px]:grid-cols-2">
				{typeOptions.map(option => (
					<Button
						className="w-full cursor-pointer"
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
												{transaction.description || transaction.tags?.[0]?.name || "Movimentação"}
											</p>
											{transaction.tags?.length && transaction.description ? (
												<p className="truncate text-muted-foreground text-xs">
													{transaction.tags.map(tag => tag.name).join(" · ")}
												</p>
											) : transaction.categoryName && transaction.description ? (
												<p className="truncate text-muted-foreground text-xs">{transaction.categoryName}</p>
											) : null}
											{transaction.sourceName ? (
												<p className="truncate text-muted-foreground text-xs">
													{transaction.source === "CREDIT_CARD" ? "Cartão" : "Conta"}:{" "}
													{transaction.sourceName}
												</p>
											) : null}
										</div>
										<p
											className={`shrink-0 whitespace-nowrap font-bold ${transaction.type === "INCOME" ? "text-emerald-600" : transaction.type === "EXPENSE" ? "text-rose-600" : "text-primary"}`}
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

			<CreateTransactionDialog onOpenChange={setIsModalOpen} open={isModalOpen} />
		</PageContainer>
	);
}

export const Route = createFileRoute("/transactions")({ component: TransactionsPage });
