import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HiArrowDown, HiArrowsRightLeft, HiArrowUp, HiCheck, HiPlus, HiXMark } from "react-icons/hi2";
import { api, type Transaction } from "@/lib/api";
import { type AuthState, useAuthStore } from "@/stores";

function formatCurrency(value: number) {
	return new Intl.NumberFormat("pt-BR", {
		currency: "BRL",
		style: "currency",
	}).format(value);
}

const typeOptions = [
	{ icon: null, id: "all", label: "All" },
	{ icon: HiArrowUp, id: "EXPENSE", label: "Expenses" },
	{ icon: HiArrowDown, id: "INCOME", label: "Income" },
	{ icon: HiArrowsRightLeft, id: "TRANSFER", label: "Transfers" },
] as const;

function TransactionsPage() {
	const queryClient = useQueryClient();
	const user = useAuthStore((s: AuthState) => s.user);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [filterType, setFilterType] = useState<string>("all");
	const [newTransaction, setNewTransaction] = useState({
		amount: "",
		categoryId: "",
		date: new Date().toISOString().split("T")[0],
		description: "",
		destinationId: "",
		originId: "",
		type: "EXPENSE" as Transaction["type"],
	});

	const { data: transactions, isLoading } = useQuery({
		queryFn: () =>
			api.getTransactions({
				limit: 50,
				type: filterType !== "all" ? (filterType as Transaction["type"]) : undefined,
			}),
		queryKey: ["transactions", filterType !== "all" ? filterType : undefined],
	});

	const { data: accounts } = useQuery({
		enabled: !!user?.id,
		queryFn: () => api.getAccounts(user?.id),
		queryKey: ["accounts", user?.id],
	});

	const { data: categories } = useQuery({
		enabled: !!user?.id,
		queryFn: () => api.getCategories(user?.id),
		queryKey: ["categories", user?.id],
	});

	const createMutation = useMutation({
		mutationFn: (data: Parameters<typeof api.createTransaction>[0]) => api.createTransaction(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["transactions"] });
			queryClient.invalidateQueries({ queryKey: ["accounts"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard"] });
			setIsModalOpen(false);
			resetForm();
		},
	});

	const resetForm = () => {
		setNewTransaction({
			amount: "",
			categoryId: "",
			date: new Date().toISOString().split("T")[0],
			description: "",
			destinationId: "",
			originId: "",
			type: "EXPENSE",
		});
	};

	const handleCreate = () => {
		if (!newTransaction.amount) return;

		createMutation.mutate({
			amount: Number.parseFloat(newTransaction.amount),
			categoryId: newTransaction.categoryId || undefined,
			date: newTransaction.date,
			description: newTransaction.description || undefined,
			destinationId: newTransaction.destinationId || undefined,
			originId: newTransaction.originId || undefined,
			type: newTransaction.type,
		});
	};

	// Group transactions by date
	const groupedTransactions = transactions?.reduce(
		(groups, tx) => {
			const date = tx.date.split("T")[0];
			if (!groups[date]) {
				groups[date] = [];
			}
			groups[date].push(tx);
			return groups;
		},
		{} as Record<string, Transaction[]>,
	);

	if (isLoading) {
		return (
			<div className="min-h-screen bg-background">
				<div className="gradient-primary px-4 pt-12 pb-8">
					<div className="h-8 w-40 animate-pulse rounded-lg bg-white/20" />
				</div>
				<div className="-mt-4 space-y-3 px-4">
					{[1, 2, 3, 4, 5].map(i => (
						<div className="h-20 animate-pulse rounded-2xl bg-background-card" key={i} />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<div className="gradient-primary relative overflow-hidden px-4 pt-12 pb-20">
				<div className="absolute top-0 right-0 h-48 w-48 translate-x-1/4 -translate-y-1/2 rounded-full bg-primary-500/20" />

				<div className="relative z-10 flex items-center justify-between">
					<h1 className="font-bold text-2xl text-white">Transactions</h1>
					<button
						className="flex items-center gap-2 rounded-xl bg-accent-300 px-4 py-2 font-semibold text-primary-900 transition-all hover:bg-accent-200 active:scale-95"
						onClick={() => setIsModalOpen(true)}
					>
						<HiPlus className="h-5 w-5" />
						<span>Add</span>
					</button>
				</div>
			</div>

			{/* Filter Tabs */}
			<div className="-mt-12 mb-4 px-4">
				<div className="card-glass flex gap-1 rounded-2xl p-2 shadow-card">
					{typeOptions.map(option => (
						<button
							className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 font-medium text-sm transition-all duration-200 ${
								filterType === option.id
									? "bg-primary-500 text-white shadow-soft"
									: "text-foreground-muted hover:bg-primary-50"
							}`}
							key={option.id}
							onClick={() => setFilterType(option.id)}
						>
							{option.icon && <option.icon className="h-4 w-4" />}
							<span className="hidden sm:inline">{option.label}</span>
							<span className="sm:hidden">{option.label.slice(0, 3)}</span>
						</button>
					))}
				</div>
			</div>

			{/* Transaction List */}
			<div className="space-y-4 px-4 pb-8">
				{!groupedTransactions || Object.keys(groupedTransactions).length === 0 ? (
					<div className="card py-12 text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
							<HiArrowsRightLeft className="h-8 w-8 text-primary-300" />
						</div>
						<p className="mb-1 font-semibold text-foreground">No transactions</p>
						<p className="text-foreground-muted text-sm">Add your first transaction to get started</p>
					</div>
				) : (
					Object.entries(groupedTransactions).map(([date, txs]) => (
						<div className="animate-fade-in" key={date}>
							{/* Date Header */}
							<p className="mb-2 px-1 font-medium text-foreground-muted text-sm">
								{new Date(date).toLocaleDateString("pt-BR", {
									day: "numeric",
									month: "long",
									weekday: "long",
								})}
							</p>

							{/* Transactions for this date */}
							<div className="card overflow-hidden p-0">
								{txs.map((tx, idx) => (
									<div
										className={`flex items-center gap-3 p-4 transition-colors hover:bg-primary-50/50 ${
											idx !== txs.length - 1 ? "border-primary-50 border-b" : ""
										}`}
										key={tx.id}
									>
										<div
											className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${
												tx.type === "INCOME"
													? "bg-success-100"
													: tx.type === "EXPENSE"
														? "bg-danger-100"
														: "bg-primary-100"
											}`}
										>
											{tx.type === "INCOME" ? (
												<HiArrowDown className="h-6 w-6 text-success-600" />
											) : tx.type === "EXPENSE" ? (
												<HiArrowUp className="h-6 w-6 text-danger-600" />
											) : (
												<HiArrowsRightLeft className="h-6 w-6 text-primary-600" />
											)}
										</div>
										<div className="min-w-0 flex-1">
											<p className="truncate font-semibold text-foreground">
												{tx.description || tx.categoryName || "Transaction"}
											</p>
											{tx.categoryName && tx.description && (
												<p className="truncate text-foreground-muted text-xs">{tx.categoryName}</p>
											)}
										</div>
										<p
											className={`whitespace-nowrap text-right font-bold ${
												tx.type === "INCOME"
													? "text-success-600"
													: tx.type === "EXPENSE"
														? "text-danger-600"
														: "text-primary-600"
											}`}
										>
											{tx.type === "INCOME" ? "+" : tx.type === "EXPENSE" ? "-" : ""}
											{formatCurrency(Number(tx.amount))}
										</p>
									</div>
								))}
							</div>
						</div>
					))
				)}
			</div>

			{/* Add Transaction Modal */}
			{isModalOpen && (
				<div className="fixed inset-0 z-50 flex items-end justify-center">
					{/* Backdrop */}
					<div
						className="absolute inset-0 animate-fade-in bg-primary-900/50 backdrop-blur-sm"
						onClick={() => setIsModalOpen(false)}
					/>

					{/* Modal Content */}
					<div className="relative max-h-[90vh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-t-3xl bg-white p-6">
						{/* Handle */}
						<div className="absolute top-3 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-primary-200" />

						{/* Header */}
						<div className="mb-6 flex items-center justify-between pt-2">
							<h2 className="font-bold text-foreground text-xl">New Transaction</h2>
							<button
								className="rounded-full p-2 transition-colors hover:bg-primary-50"
								onClick={() => setIsModalOpen(false)}
							>
								<HiXMark className="h-6 w-6 text-foreground-muted" />
							</button>
						</div>

						{/* Type Selection */}
						<div className="mb-6">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">Type</span>
							<div className="grid grid-cols-3 gap-2">
								{(["EXPENSE", "INCOME", "TRANSFER"] as const).map(type => (
									<button
										className={`rounded-xl px-4 py-3 font-medium transition-all ${
											newTransaction.type === type
												? type === "INCOME"
													? "bg-success-500 text-white"
													: type === "EXPENSE"
														? "bg-danger-500 text-white"
														: "bg-primary-500 text-white"
												: "bg-background-card text-foreground hover:bg-primary-100"
										}`}
										key={type}
										onClick={() => setNewTransaction({ ...newTransaction, type })}
									>
										{type === "EXPENSE" ? "Expense" : type === "INCOME" ? "Income" : "Transfer"}
									</button>
								))}
							</div>
						</div>

						{/* Amount */}
						<div className="mb-4">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">Amount</span>
							<div className="relative">
								<span className="absolute top-1/2 left-4 -translate-y-1/2 font-medium text-foreground-muted">
									R$
								</span>
								<input
									className="input pl-12 font-bold text-2xl"
									onChange={e => setNewTransaction({ ...newTransaction, amount: e.target.value })}
									placeholder="0.00"
									step="0.01"
									type="number"
									value={newTransaction.amount}
								/>
							</div>
						</div>

						{/* Description */}
						<div className="mb-4">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">Description</span>
							<input
								className="input"
								onChange={e => setNewTransaction({ ...newTransaction, description: e.target.value })}
								placeholder="What was this for?"
								type="text"
								value={newTransaction.description}
							/>
						</div>

						{/* Date */}
						<div className="mb-4">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">Date</span>
							<input
								className="input"
								onChange={e => setNewTransaction({ ...newTransaction, date: e.target.value })}
								type="date"
								value={newTransaction.date}
							/>
						</div>

						{/* Category */}
						{newTransaction.type !== "TRANSFER" && categories && categories.length > 0 && (
							<div className="mb-4">
								<span className="mb-2 block font-medium text-foreground-muted text-sm">Category</span>
								<select
									className="input"
									onChange={e => setNewTransaction({ ...newTransaction, categoryId: e.target.value })}
									value={newTransaction.categoryId}
								>
									<option value="">Select category</option>
									{categories.map((cat: { id: string; name: string }) => (
										<option key={cat.id} value={cat.id}>
											{cat.name}
										</option>
									))}
								</select>
							</div>
						)}

						{/* Origin Account */}
						{accounts && accounts.length > 0 && (
							<div className="mb-4">
								<span className="mb-2 block font-medium text-foreground-muted text-sm">
									{newTransaction.type === "TRANSFER" ? "From Account" : "Account"}
								</span>
								<select
									className="input"
									onChange={e => setNewTransaction({ ...newTransaction, originId: e.target.value })}
									value={newTransaction.originId}
								>
									<option value="">Select account</option>
									{accounts.map((acc: { id: string; name: string }) => (
										<option key={acc.id} value={acc.id}>
											{acc.name}
										</option>
									))}
								</select>
							</div>
						)}

						{/* Destination Account (for transfers) */}
						{newTransaction.type === "TRANSFER" && accounts && accounts.length > 0 && (
							<div className="mb-6">
								<span className="mb-2 block font-medium text-foreground-muted text-sm">To Account</span>
								<select
									className="input"
									onChange={e => setNewTransaction({ ...newTransaction, destinationId: e.target.value })}
									value={newTransaction.destinationId}
								>
									<option value="">Select destination</option>
									{accounts
										.filter((acc: { id: string }) => acc.id !== newTransaction.originId)
										.map((acc: { id: string; name: string }) => (
											<option key={acc.id} value={acc.id}>
												{acc.name}
											</option>
										))}
								</select>
							</div>
						)}

						{/* Actions */}
						<div className="flex gap-3 pt-2">
							<button className="btn-secondary flex-1" onClick={() => setIsModalOpen(false)}>
								Cancel
							</button>
							<button
								className="btn-primary flex flex-1 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
								disabled={!newTransaction.amount || createMutation.isPending}
								onClick={handleCreate}
							>
								{createMutation.isPending ? (
									<span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
								) : (
									<>
										<HiCheck className="h-5 w-5" />
										<span>Save</span>
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export const Route = createFileRoute("/transactions")({
	component: TransactionsPage,
});
