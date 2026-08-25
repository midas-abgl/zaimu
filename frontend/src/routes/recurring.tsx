import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HiArrowPath, HiCalendarDays, HiCheck, HiPlus, HiTrash, HiXMark } from "react-icons/hi2";
import { TagPicker } from "@/components/tags";
import type { RecurringPayment } from "@/lib/api";
import { dataService } from "@/lib/dataService";

function formatCurrency(value: number) {
	return new Intl.NumberFormat("pt-BR", {
		currency: "BRL",
		style: "currency",
	}).format(value);
}

const frequencyOptions = [
	{ id: "DAILY", label: "Daily" },
	{ id: "WEEKLY", label: "Semanal" },
	{ id: "BIWEEKLY", label: "Biweekly" },
	{ id: "MONTHLY", label: "Mensal" },
	{ id: "YEARLY", label: "Anual" },
];

function RecurringCard({
	payment,
	onDelete,
	isDeleting,
}: {
	payment: RecurringPayment;
	onDelete: () => void;
	isDeleting: boolean;
}) {
	const frequencyLabel = frequencyOptions.find(f => f.id === payment.frequency)?.label || payment.frequency;
	const isDespesa = payment.type === "EXPENSE";

	return (
		<div className="card p-4">
			<div className="flex items-center gap-4">
				<div
					className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
						isDespesa ? "bg-danger-100 text-danger-600" : "bg-success-100 text-success-600"
					}`}
				>
					<HiCalendarDays className="h-6 w-6" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="truncate font-semibold text-foreground">{payment.name}</p>
					<div className="mt-1 flex items-center gap-2">
						<HiArrowPath className="h-3.5 w-3.5 text-foreground-muted" />
						<span className="text-foreground-muted text-xs">
							{frequencyLabel} • Day {payment.day}
						</span>
					</div>
				</div>
				<div className="flex items-center gap-3 text-right">
					<div>
						<p className={`font-bold ${isDespesa ? "text-danger-600" : "text-success-600"}`}>
							{isDespesa ? "-" : "+"}
							{formatCurrency(payment.amount)}
						</p>
						{payment.tags?.length ? (
							<p className="text-foreground-muted text-xs">{payment.tags.map(tag => tag.name).join(" · ")}</p>
						) : payment.category ? (
							<p className="text-foreground-muted text-xs">{payment.category}</p>
						) : null}
					</div>
					<button
						className="rounded-xl bg-danger-100 p-2 text-danger-600 transition-colors hover:bg-danger-200 disabled:opacity-50"
						disabled={isDeleting}
						onClick={onDelete}
					>
						{isDeleting ? (
							<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
						) : (
							<HiTrash className="h-4 w-4" />
						)}
					</button>
				</div>
			</div>
		</div>
	);
}

function RecurringPage() {
	const queryClient = useQueryClient();
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [newPayment, setNewPayment] = useState({
		amount: "",
		day: "",
		frequency: "MONTHLY",
		name: "",
		tagIds: [] as string[],
		type: "EXPENSE",
	});

	const { data: payments, isLoading } = useQuery({
		queryFn: () => dataService.recurringPayments.getAll(),
		queryKey: ["recurring-payments"],
	});

	const createMutation = useMutation({
		mutationFn: (data: Parameters<typeof dataService.recurringPayments.create>[0]) =>
			dataService.recurringPayments.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["recurring-payments"] });
			setIsCreateModalOpen(false);
			resetForm();
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => dataService.recurringPayments.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["recurring-payments"] });
		},
	});

	const resetForm = () => {
		setNewPayment({
			amount: "",
			day: "",
			frequency: "MONTHLY",
			name: "",
			tagIds: [],
			type: "EXPENSE",
		});
	};

	const handleCreate = () => {
		createMutation.mutate({
			amount: Number.parseFloat(newPayment.amount),
			day: Number.parseInt(newPayment.day, 10),
			dayOfMonth: Number.parseInt(newPayment.day, 10),
			frequency: newPayment.frequency as RecurringPayment["frequency"],
			name: newPayment.name,
			paymentMethod: "DEBIT",
			startDate: new Date().toISOString().slice(0, 10),
			tagIds: newPayment.tagIds,
			type: newPayment.type as RecurringPayment["type"],
		});
	};

	const recurringPayments = payments || [];
	const expenses = recurringPayments.filter(p => p.type === "EXPENSE");
	const incomes = recurringPayments.filter(p => p.type === "INCOME");

	const totalMonthlyDespesas = expenses.reduce((acc, p) => acc + p.amount, 0);
	const totalMonthlyReceitas = incomes.reduce((acc, p) => acc + p.amount, 0);

	if (isLoading) {
		return (
			<div className="mx-auto min-h-screen w-full max-w-5xl bg-background lg:py-10">
				<div className="bg-gradient-to-br from-amber-500 to-amber-400 px-4 pt-12 pb-20">
					<div className="mb-4 h-8 w-40 animate-pulse rounded-lg bg-white/20" />
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
		<div className="mx-auto min-h-screen w-full max-w-5xl bg-background lg:py-10">
			{/* Header */}
			<div className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-amber-400 px-4 pt-12 pb-24 lg:rounded-3xl lg:px-8">
				<div className="absolute top-0 right-0 h-48 w-48 translate-x-1/4 -translate-y-1/2 rounded-full bg-amber-400/30" />
				<div className="absolute bottom-0 left-0 h-32 w-32 -translate-x-1/4 translate-y-1/2 rounded-full bg-amber-400/20" />

				<div className="relative z-10">
					<div className="mb-6 flex items-center justify-between">
						<h1 className="font-bold text-2xl text-white">Recorrências</h1>
						<button
							className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-semibold text-amber-600 transition-all hover:bg-amber-50 active:scale-95"
							onClick={() => setIsCreateModalOpen(true)}
						>
							<HiPlus className="h-5 w-5" />
							<span>Adicionar</span>
						</button>
					</div>

					{recurringPayments.length > 0 && (
						<div className="grid grid-cols-2 gap-4">
							<div className="rounded-2xl bg-white/20 p-4 backdrop-blur-sm">
								<p className="text-sm text-white/70">Receitas mensais</p>
								<p className="font-bold text-white text-xl">{formatCurrency(totalMonthlyReceitas)}</p>
							</div>
							<div className="rounded-2xl bg-white/20 p-4 backdrop-blur-sm">
								<p className="text-sm text-white/70">Despesas mensais</p>
								<p className="font-bold text-white text-xl">{formatCurrency(totalMonthlyDespesas)}</p>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Payment List */}
			<div className="-mt-12 space-y-6 px-4 pb-8">
				{incomes.length > 0 && (
					<div className="animate-fade-in">
						<p className="mb-2 px-1 font-medium text-foreground-muted text-sm">Receitas</p>
						<div className="space-y-3">
							{incomes.map((payment, idx) => (
								<div className="animate-fade-in" key={payment.id} style={{ animationDelay: `${idx * 0.1}s` }}>
									<RecurringCard
										isDeleting={deleteMutation.isPending}
										onDelete={() => deleteMutation.mutate(payment.id)}
										payment={payment}
									/>
								</div>
							))}
						</div>
					</div>
				)}

				{expenses.length > 0 && (
					<div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
						<p className="mb-2 px-1 font-medium text-foreground-muted text-sm">Despesas</p>
						<div className="space-y-3">
							{expenses.map(payment => (
								<RecurringCard
									isDeleting={deleteMutation.isPending}
									key={payment.id}
									onDelete={() => deleteMutation.mutate(payment.id)}
									payment={payment}
								/>
							))}
						</div>
					</div>
				)}

				{recurringPayments.length === 0 && (
					<div className="card animate-fade-in py-12 text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
							<HiCalendarDays className="h-8 w-8 text-amber-300" />
						</div>
						<p className="mb-1 font-semibold text-foreground">Nenhuma recorrência</p>
						<p className="mb-4 text-foreground-muted text-sm">
							Set up automatic payments for bills, rent, and more
						</p>
						<button
							className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 font-semibold text-white transition-all hover:bg-amber-600 active:scale-95"
							onClick={() => setIsCreateModalOpen(true)}
						>
							<HiPlus className="h-5 w-5" />
							<span>Adicionar recorrência</span>
						</button>
					</div>
				)}
			</div>

			{/* Create Modal */}
			{isCreateModalOpen && (
				<div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
					<div
						className="absolute inset-0 animate-fade-in bg-primary-900/50 backdrop-blur-sm"
						onClick={() => setIsCreateModalOpen(false)}
					/>

					<div className="scrollbar-themed relative max-h-[90dvh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl">
						<div className="absolute top-3 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-primary-200" />

						<div className="mb-6 flex items-center justify-between pt-2">
							<h2 className="font-bold text-foreground text-xl">Nova recorrência</h2>
							<button
								className="rounded-full p-2 transition-colors hover:bg-primary-50"
								onClick={() => setIsCreateModalOpen(false)}
							>
								<HiXMark className="h-6 w-6 text-foreground-muted" />
							</button>
						</div>

						{/* Type */}
						<div className="mb-4">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">Tipo</span>
							<div className="grid grid-cols-2 gap-2">
								<button
									className={`rounded-xl px-4 py-3 font-medium transition-all ${
										newPayment.type === "INCOME"
											? "bg-success-500 text-white"
											: "bg-background-card text-foreground hover:bg-success-100"
									}`}
									onClick={() => setNewPayment({ ...newPayment, type: "INCOME" })}
								>
									Receitas
								</button>
								<button
									className={`rounded-xl px-4 py-3 font-medium transition-all ${
										newPayment.type === "EXPENSE"
											? "bg-danger-500 text-white"
											: "bg-background-card text-foreground hover:bg-danger-100"
									}`}
									onClick={() => setNewPayment({ ...newPayment, type: "EXPENSE" })}
								>
									Despesa
								</button>
							</div>
						</div>

						{/* Name */}
						<div className="mb-4">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">Nome</span>
							<input
								className="input"
								onChange={e => setNewPayment({ ...newPayment, name: e.target.value })}
								placeholder="Ex: Aluguel ou energia"
								type="text"
								value={newPayment.name}
							/>
						</div>

						{/* Amount and Day */}
						<div className="mb-4 grid gap-3 sm:grid-cols-2">
							<div>
								<span className="mb-2 block font-medium text-foreground-muted text-sm">Valor</span>
								<div className="relative">
									<span className="absolute top-1/2 left-4 -translate-y-1/2 font-medium text-foreground-muted">
										R$
									</span>
									<input
										className="input pl-12"
										inputMode="decimal"
										onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })}
										placeholder="100.00"
										step="0.01"
										type="text"
										value={newPayment.amount}
									/>
								</div>
							</div>
							<div>
								<span className="mb-2 block font-medium text-foreground-muted text-sm">Dia</span>
								<input
									className="input"
									inputMode="decimal"
									max="31"
									min="1"
									onChange={e => setNewPayment({ ...newPayment, day: e.target.value })}
									placeholder="10"
									type="text"
									value={newPayment.day}
								/>
							</div>
						</div>

						{/* Frequency */}
						<div className="mb-4">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">Frequência</span>
							<div className="grid grid-cols-3 gap-2">
								{frequencyOptions.slice(2).map(option => (
									<button
										className={`rounded-xl px-4 py-2.5 font-medium text-sm transition-all ${
											newPayment.frequency === option.id
												? "bg-amber-500 text-white"
												: "bg-background-card text-foreground hover:bg-amber-100"
										}`}
										key={option.id}
										onClick={() => setNewPayment({ ...newPayment, frequency: option.id })}
									>
										{option.label}
									</button>
								))}
							</div>
						</div>

						<div className="mb-6">
							<TagPicker
								onValueChange={tagIds => setNewPayment({ ...newPayment, tagIds })}
								value={newPayment.tagIds}
							/>
						</div>

						{/* Actions */}
						<div className="flex gap-3">
							<button className="btn-secondary flex-1" onClick={() => setIsCreateModalOpen(false)}>
								Cancel
							</button>
							<button
								className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-semibold text-white transition-all hover:bg-amber-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
								disabled={
									!newPayment.name || !newPayment.amount || !newPayment.day || createMutation.isPending
								}
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

export const Route = createFileRoute("/recurring")({
	component: RecurringPage,
});
