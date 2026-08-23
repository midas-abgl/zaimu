import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
	HiArrowDownLeft,
	HiArrowUpRight,
	HiCheck,
	HiCheckCircle,
	HiClock,
	HiPlus,
	HiUsers,
	HiXMark,
} from "react-icons/hi2";
import type { Debt } from "@/lib/api";
import { dataService } from "@/lib/dataService";

function formatCurrency(value: number) {
	return new Intl.NumberFormat("pt-BR", {
		currency: "BRL",
		style: "currency",
	}).format(value);
}

const tabOptions = [
	{ id: "owedToMe", label: "A receber" },
	{ id: "iOwe", label: "A pagar" },
	{ id: "settled", label: "Quitadas" },
] as const;

function DebtCard({
	debt,
	onMarkPaid,
	isLoading,
	isPaid,
}: {
	debt: Debt;
	onMarkPaid?: () => void;
	isLoading?: boolean;
	isPaid?: boolean;
}) {
	return (
		<div className="card p-4">
			<div className="flex items-center gap-3">
				<div
					className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${
						isPaid
							? "bg-primary-100 text-primary-500"
							: debt.isOwedToMe
								? "bg-success-100 text-success-600"
								: "bg-danger-100 text-danger-600"
					}`}
				>
					{isPaid ? (
						<HiCheckCircle className="h-6 w-6" />
					) : debt.isOwedToMe ? (
						<HiArrowDownLeft className="h-6 w-6" />
					) : (
						<HiArrowUpRight className="h-6 w-6" />
					)}
				</div>
				<div className="min-w-0 flex-1">
					<p className="truncate font-semibold text-foreground">{debt.personName}</p>
					{debt.description && <p className="truncate text-foreground-muted text-xs">{debt.description}</p>}
					{debt.dueDate && !isPaid && (
						<div className="mt-1 flex items-center gap-1">
							<HiClock className="h-3 w-3 text-foreground-muted" />
							<span className="text-foreground-muted text-xs">
								Due {new Date(debt.dueDate).toLocaleDateString("pt-BR")}
							</span>
						</div>
					)}
				</div>
				<div className="flex flex-col items-end gap-2 text-right">
					<p
						className={`font-bold ${
							isPaid ? "text-foreground-muted" : debt.isOwedToMe ? "text-success-600" : "text-danger-600"
						}`}
					>
						{debt.isOwedToMe ? "+" : "-"}
						{formatCurrency(debt.amount)}
					</p>
					{!isPaid && onMarkPaid && (
						<button
							className="rounded-lg bg-success-100 px-3 py-1.5 font-medium text-success-600 text-xs transition-colors hover:bg-success-200 disabled:opacity-50"
							disabled={isLoading}
							onClick={onMarkPaid}
						>
							{isLoading ? (
								<span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-success-300 border-t-success-600" />
							) : (
								"Marcar como pago"
							)}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}

function DívidasPage() {
	const queryClient = useQueryClient();
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<"owedToMe" | "iOwe" | "settled">("owedToMe");
	const [newDebt, setNewDebt] = useState({
		amount: "",
		date: new Date().toISOString().split("T")[0],
		description: "",
		dueDate: "",
		isOwedToMe: true,
		personName: "",
	});

	const { data: debtsData, isLoading } = useQuery({
		queryFn: () => dataService.debts.getAll(),
		queryKey: ["debts"],
	});

	const createMutation = useMutation({
		mutationFn: (data: Parameters<typeof dataService.debts.create>[0]) => dataService.debts.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["debts"] });
			queryClient.invalidateQueries({ queryKey: ["debts-summary"] });
			setIsCreateModalOpen(false);
			resetForm();
		},
	});

	const markPaidMutation = useMutation({
		mutationFn: ({ id }: { id: string }) =>
			dataService.debts.update(id, { isPaid: true, paidDate: new Date().toISOString() }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["debts"] });
			queryClient.invalidateQueries({ queryKey: ["debts-summary"] });
		},
	});

	const resetForm = () => {
		setNewDebt({
			amount: "",
			date: new Date().toISOString().split("T")[0],
			description: "",
			dueDate: "",
			isOwedToMe: true,
			personName: "",
		});
	};

	const handleCreate = () => {
		createMutation.mutate({
			amount: Number.parseFloat(newDebt.amount),
			date: newDebt.date,
			description: newDebt.description || undefined,
			dueDate: newDebt.dueDate || undefined,
			isOwedToMe: newDebt.isOwedToMe,
			personName: newDebt.personName,
		});
	};

	const debts = debtsData ?? [];
	const totals = debts.reduce(
		(result, debt) => {
			if (!debt.isPaid) {
				if (debt.isOwedToMe) result.owedToMe += Number(debt.amount);
				else result.iOwe += Number(debt.amount);
			}
			result.net = result.owedToMe - result.iOwe;
			return result;
		},
		{ iOwe: 0, net: 0, owedToMe: 0 },
	);
	const summary = Object.values(
		debts.reduce<Record<string, { netBalance: number; person: string }>>((result, debt) => {
			const current = result[debt.personName] ?? { netBalance: 0, person: debt.personName };
			if (!debt.isPaid) current.netBalance += Number(debt.amount) * (debt.isOwedToMe ? 1 : -1);
			result[debt.personName] = current;
			return result;
		}, {}),
	).filter(item => item.netBalance !== 0);

	const owedToMeDívidas = debts.filter(d => d.isOwedToMe && !d.isPaid);
	const iOweDívidas = debts.filter(d => !d.isOwedToMe && !d.isPaid);
	const settledDívidas = debts.filter(d => d.isPaid);

	const getDisplayDívidas = () => {
		switch (activeTab) {
			case "owedToMe":
				return owedToMeDívidas;
			case "iOwe":
				return iOweDívidas;
			case "settled":
				return settledDívidas;
		}
	};

	const displayDívidas = getDisplayDívidas();

	if (isLoading) {
		return (
			<div className="min-h-screen bg-background">
				<div className="gradient-primary px-4 pt-12 pb-20">
					<div className="mb-4 h-8 w-32 animate-pulse rounded-lg bg-white/20" />
					<div className="h-10 w-48 animate-pulse rounded-lg bg-white/20" />
				</div>
				<div className="-mt-12 space-y-3 px-4">
					{[1, 2, 3].map(i => (
						<div className="h-20 animate-pulse rounded-2xl bg-background-card" key={i} />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<div
				className={`relative overflow-hidden px-4 pt-12 pb-24 transition-all duration-500 ${
					totals.net >= 0
						? "bg-gradient-to-br from-success-600 to-success-500"
						: "bg-gradient-to-br from-danger-600 to-danger-500"
				}`}
			>
				<div className="absolute top-0 right-0 h-48 w-48 translate-x-1/4 -translate-y-1/2 rounded-full bg-white/10" />
				<div className="absolute bottom-0 left-0 h-32 w-32 -translate-x-1/4 translate-y-1/2 rounded-full bg-white/5" />

				<div className="relative z-10">
					<div className="mb-6 flex items-center justify-between">
						<h1 className="font-bold text-2xl text-white">Dívidas</h1>
						<button
							className="flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30 active:scale-95"
							onClick={() => setIsCreateModalOpen(true)}
						>
							<HiPlus className="h-5 w-5" />
							<span>Adicionar</span>
						</button>
					</div>

					<div className="mb-4 flex justify-between">
						<div>
							<p className="mb-1 text-sm text-white/70">A receber</p>
							<p className="font-bold text-2xl text-white">{formatCurrency(totals.owedToMe)}</p>
						</div>
						<div className="text-right">
							<p className="mb-1 text-sm text-white/70">A pagar</p>
							<p className="font-bold text-2xl text-white">{formatCurrency(totals.iOwe)}</p>
						</div>
					</div>

					<div className="border-white/20 border-t pt-3">
						<p className="mb-1 text-sm text-white/70">Saldo líquido</p>
						<p className="font-bold text-white text-xl">
							{totals.net >= 0 ? "+" : ""}
							{formatCurrency(totals.net)}
						</p>
					</div>
				</div>
			</div>

			{/* Person Summary Chips */}
			{summary && summary.length > 0 && (
				<div className="-mt-8 mb-4 px-4">
					<div className="scrollbar-themed -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
						{summary.map((s: { person: string; netBalance: number }) => (
							<div
								className="card-glass flex flex-shrink-0 items-center gap-3 rounded-xl px-4 py-3 shadow-card"
								key={s.person}
							>
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
									<HiUsers className="h-4 w-4 text-primary-600" />
								</div>
								<div>
									<p className="font-medium text-foreground text-sm">{s.person}</p>
									<p
										className={`font-bold text-sm ${
											s.netBalance >= 0 ? "text-success-600" : "text-danger-600"
										}`}
									>
										{s.netBalance >= 0 ? "+" : ""}
										{formatCurrency(s.netBalance)}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Tabs */}
			<div className="mb-4 px-4">
				<div className="card-glass flex gap-1 rounded-2xl p-2 shadow-card">
					{tabOptions.map(option => {
						const count =
							option.id === "owedToMe"
								? owedToMeDívidas.length
								: option.id === "iOwe"
									? iOweDívidas.length
									: settledDívidas.length;
						return (
							<button
								className={`flex-1 rounded-xl px-2 py-2.5 font-medium text-xs transition-all duration-200 ${
									activeTab === option.id
										? "bg-primary-500 text-white shadow-soft"
										: "text-foreground-muted hover:bg-primary-50"
								}`}
								key={option.id}
								onClick={() => setActiveTab(option.id)}
							>
								{option.label} ({count})
							</button>
						);
					})}
				</div>
			</div>

			{/* Debt List */}
			<div className="space-y-3 px-4 pb-8">
				{displayDívidas.length > 0 ? (
					displayDívidas.map((debt, idx) => (
						<div className="animate-fade-in" key={debt.id} style={{ animationDelay: `${idx * 0.05}s` }}>
							<DebtCard
								debt={debt}
								isLoading={markPaidMutation.isPending}
								isPaid={activeTab === "settled"}
								onMarkPaid={
									activeTab !== "settled" ? () => markPaidMutation.mutate({ id: debt.id }) : undefined
								}
							/>
						</div>
					))
				) : (
					<div className="card animate-fade-in py-12 text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
							{activeTab === "owedToMe" ? (
								<HiArrowDownLeft className="h-8 w-8 text-success-400" />
							) : activeTab === "iOwe" ? (
								<HiArrowUpRight className="h-8 w-8 text-danger-400" />
							) : (
								<HiCheckCircle className="h-8 w-8 text-primary-400" />
							)}
						</div>
						<p className="mb-1 font-semibold text-foreground">
							{activeTab === "owedToMe"
								? "No one owes you"
								: activeTab === "iOwe"
									? "You don't owe anyone"
									: "No settled debts"}
						</p>
						<p className="text-foreground-muted text-sm">
							{activeTab === "settled" ? "Complete a debt to see it here" : "Track your debts easily"}
						</p>
					</div>
				)}
			</div>

			{/* Create Modal */}
			{isCreateModalOpen && (
				<div className="fixed inset-0 z-50 flex items-end justify-center">
					<div
						className="absolute inset-0 animate-fade-in bg-primary-900/50 backdrop-blur-sm"
						onClick={() => setIsCreateModalOpen(false)}
					/>

					<div className="scrollbar-themed relative max-h-[90vh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-t-3xl bg-white p-6">
						<div className="absolute top-3 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-primary-200" />

						<div className="mb-6 flex items-center justify-between pt-2">
							<h2 className="font-bold text-foreground text-xl">Nova dívida</h2>
							<button
								className="rounded-full p-2 transition-colors hover:bg-primary-50"
								onClick={() => setIsCreateModalOpen(false)}
							>
								<HiXMark className="h-6 w-6 text-foreground-muted" />
							</button>
						</div>

						{/* Type Selection */}
						<div className="mb-6">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">Tipo</span>
							<div className="grid grid-cols-2 gap-2">
								<button
									className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium transition-all ${
										newDebt.isOwedToMe
											? "bg-success-500 text-white"
											: "bg-background-card text-foreground hover:bg-primary-100"
									}`}
									onClick={() => setNewDebt({ ...newDebt, isOwedToMe: true })}
								>
									<HiArrowDownLeft className="h-5 w-5" />
									<span>A receber</span>
								</button>
								<button
									className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium transition-all ${
										!newDebt.isOwedToMe
											? "bg-danger-500 text-white"
											: "bg-background-card text-foreground hover:bg-primary-100"
									}`}
									onClick={() => setNewDebt({ ...newDebt, isOwedToMe: false })}
								>
									<HiArrowUpRight className="h-5 w-5" />
									<span>A pagar</span>
								</button>
							</div>
						</div>

						{/* Person Name */}
						<div className="mb-4">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">Pessoa</span>
							<input
								className="input"
								onChange={e => setNewDebt({ ...newDebt, personName: e.target.value })}
								placeholder="Ex: Ana Souza"
								type="text"
								value={newDebt.personName}
							/>
						</div>

						{/* Amount */}
						<div className="mb-4">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">Valor</span>
							<div className="relative">
								<span className="absolute top-1/2 left-4 -translate-y-1/2 font-medium text-foreground-muted">
									R$
								</span>
								<input
									className="input pl-12 font-bold text-xl"
									inputMode="decimal"
									onChange={e => setNewDebt({ ...newDebt, amount: e.target.value })}
									placeholder="0.00"
									step="0.01"
									type="text"
									value={newDebt.amount}
								/>
							</div>
						</div>

						{/* Dates */}
						<div className="mb-4 grid grid-cols-2 gap-3">
							<div>
								<span className="mb-2 block font-medium text-foreground-muted text-sm">Data</span>
								<input
									className="input"
									onChange={e => setNewDebt({ ...newDebt, date: e.target.value })}
									type="date"
									value={newDebt.date}
								/>
							</div>
							<div>
								<span className="mb-2 block font-medium text-foreground-muted text-sm">Vencimento</span>
								<input
									className="input"
									onChange={e => setNewDebt({ ...newDebt, dueDate: e.target.value })}
									type="date"
									value={newDebt.dueDate}
								/>
							</div>
						</div>

						{/* Description */}
						<div className="mb-6">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">
								Description (optional)
							</span>
							<input
								className="input"
								onChange={e => setNewDebt({ ...newDebt, description: e.target.value })}
								placeholder="Ex: Divisão do aluguel"
								type="text"
								value={newDebt.description}
							/>
						</div>

						{/* Actions */}
						<div className="flex gap-3">
							<button className="btn-secondary flex-1" onClick={() => setIsCreateModalOpen(false)}>
								Cancel
							</button>
							<button
								className="btn-primary flex flex-1 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
								disabled={!newDebt.personName || !newDebt.amount || createMutation.isPending}
								onClick={handleCreate}
							>
								{createMutation.isPending ? (
									<span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
								) : (
									<>
										<HiCheck className="h-5 w-5" />
										<span>Criar</span>
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

export const Route = createFileRoute("/debts")({
	component: DívidasPage,
});
