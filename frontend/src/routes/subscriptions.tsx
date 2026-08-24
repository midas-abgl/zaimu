import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
	HiArrowPathRoundedSquare,
	HiCalendarDays,
	HiCheck,
	HiCreditCard,
	HiPause,
	HiPlay,
	HiPlus,
	HiXMark,
} from "react-icons/hi2";
import type { Subscription } from "@/lib/api";
import { dataService } from "@/lib/dataService";

function formatCurrency(value: number) {
	return new Intl.NumberFormat("pt-BR", {
		currency: "BRL",
		style: "currency",
	}).format(value);
}

const frequencyOptions = [
	{ id: "MONTHLY", label: "Mensal" },
	{ id: "YEARLY", label: "Anual" },
	{ id: "WEEKLY", label: "Semanal" },
];

const paymentMethodOptions = [
	{ id: "CREDIT", label: "Cartão de crédito" },
	{ id: "DEBIT", label: "Débito" },
	{ id: "PIX", label: "Pix" },
	{ id: "BOLETO", label: "Boleto" },
	{ id: "TRANSFER", label: "Transferência" },
];

function SubscriptionCard({
	subscription,
	paused,
	onToggle,
	isToggling,
}: {
	subscription: Subscription;
	paused?: boolean;
	onToggle: () => void;
	isToggling: boolean;
}) {
	const frequencyLabel =
		frequencyOptions.find(f => f.id === subscription.frequency)?.label || subscription.frequency;
	const methodLabel =
		paymentMethodOptions.find(p => p.id === subscription.paymentMethod)?.label || subscription.paymentMethod;

	return (
		<div className={`card p-4 transition-opacity ${paused ? "opacity-60" : ""}`}>
			<div className="flex items-center gap-4">
				<div
					className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
						paused ? "bg-primary-100 text-primary-400" : "bg-primary-100 text-primary-600"
					}`}
				>
					<HiArrowPathRoundedSquare className="h-6 w-6" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="truncate font-semibold text-foreground">{subscription.name}</p>
					<div className="mt-1 flex items-center gap-2">
						<HiCalendarDays className="h-3.5 w-3.5 text-foreground-muted" />
						<span className="text-foreground-muted text-xs">
							Day {subscription.billingDay} • {frequencyLabel}
						</span>
					</div>
				</div>
				<div className="flex items-center gap-3 text-right">
					<div>
						<p className={`font-bold ${paused ? "text-foreground-muted" : "text-primary-600"}`}>
							{formatCurrency(subscription.amount)}
						</p>
						<div className="flex items-center justify-end gap-1 text-foreground-muted">
							{subscription.paymentMethod === "CREDIT" && <HiCreditCard className="h-3 w-3" />}
							<span className="text-xs">{methodLabel}</span>
						</div>
					</div>
					<button
						className={`rounded-xl p-2 transition-colors disabled:opacity-50 ${
							paused
								? "bg-success-100 text-success-600 hover:bg-success-200"
								: "bg-primary-100 text-primary-600 hover:bg-primary-200"
						}`}
						disabled={isToggling}
						onClick={onToggle}
					>
						{isToggling ? (
							<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
						) : paused ? (
							<HiPlay className="h-4 w-4" />
						) : (
							<HiPause className="h-4 w-4" />
						)}
					</button>
				</div>
			</div>
		</div>
	);
}

function AssinaturasPage() {
	const queryClient = useQueryClient();
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [newSubscription, setNewSubscription] = useState({
		amount: "",
		billingDay: "",
		frequency: "MONTHLY",
		name: "",
		paymentMethod: "CREDIT",
		startDate: new Date().toISOString().split("T")[0],
	});

	const { data: subscriptionsData, isLoading } = useQuery({
		queryFn: () => dataService.subscriptions.getAll(),
		queryKey: ["subscriptions"],
	});

	const createMutation = useMutation({
		mutationFn: (data: Parameters<typeof dataService.subscriptions.create>[0]) =>
			dataService.subscriptions.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard"] });
			setIsCreateModalOpen(false);
			resetForm();
		},
	});

	const toggleMutation = useMutation({
		mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
			dataService.subscriptions.update(id, { isActive }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
		},
	});

	const resetForm = () => {
		setNewSubscription({
			amount: "",
			billingDay: "",
			frequency: "MONTHLY",
			name: "",
			paymentMethod: "CREDIT",
			startDate: new Date().toISOString().split("T")[0],
		});
	};

	const handleCreate = () => {
		createMutation.mutate({
			amount: Number.parseFloat(newSubscription.amount),
			billingDay: Number.parseInt(newSubscription.billingDay, 10),
			frequency: newSubscription.frequency as Subscription["frequency"],
			name: newSubscription.name,
			paymentMethod: newSubscription.paymentMethod as Subscription["paymentMethod"],
			startDate: newSubscription.startDate,
		});
	};

	const subscriptions = subscriptionsData ?? [];
	const totalMonthlyCost = subscriptions
		.filter(subscription => subscription.isActive)
		.reduce((total, subscription) => {
			const amount = Number(subscription.amount);
			if (subscription.frequency === "YEARLY") return total + amount / 12;
			if (subscription.frequency === "WEEKLY") return total + amount * 4.345;
			return total + amount;
		}, 0);

	const activeAssinaturas = subscriptions.filter(s => s.isActive);
	const pausedAssinaturas = subscriptions.filter(s => !s.isActive);

	if (isLoading) {
		return (
			<div className="mx-auto min-h-screen w-full max-w-5xl bg-background lg:py-10">
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
		<div className="mx-auto min-h-screen w-full max-w-5xl bg-background lg:py-10">
			{/* Header */}
			<div className="gradient-primary relative overflow-hidden px-4 pt-12 pb-24 lg:rounded-3xl lg:px-8">
				<div className="absolute top-0 right-0 h-48 w-48 translate-x-1/4 -translate-y-1/2 rounded-full bg-primary-500/20" />
				<div className="absolute bottom-0 left-0 h-32 w-32 -translate-x-1/4 translate-y-1/2 rounded-full bg-primary-500/10" />

				<div className="relative z-10">
					<div className="mb-6 flex items-center justify-between">
						<h1 className="font-bold text-2xl text-white">Assinaturas</h1>
						<button
							className="flex items-center gap-2 rounded-xl bg-accent-300 px-4 py-2 font-semibold text-primary-900 transition-all hover:bg-accent-200 active:scale-95"
							onClick={() => setIsCreateModalOpen(true)}
						>
							<HiPlus className="h-5 w-5" />
							<span>Adicionar</span>
						</button>
					</div>

					{subscriptions.length > 0 && (
						<div>
							<p className="mb-1 text-sm text-white/70">Custo mensal</p>
							<p className="font-bold text-4xl text-white tracking-tight">
								{formatCurrency(totalMonthlyCost)}
							</p>
							<p className="mt-2 text-sm text-white/70">
								{activeAssinaturas.length} active subscription{activeAssinaturas.length !== 1 ? "s" : ""}
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Subscription List */}
			<div className="-mt-12 space-y-6 px-4 pb-8">
				{activeAssinaturas.length > 0 && (
					<div className="animate-fade-in">
						<p className="mb-2 px-1 font-medium text-foreground-muted text-sm">Ativas</p>
						<div className="space-y-3">
							{activeAssinaturas.map((sub, idx) => (
								<div className="animate-fade-in" key={sub.id} style={{ animationDelay: `${idx * 0.1}s` }}>
									<SubscriptionCard
										isToggling={toggleMutation.isPending}
										onToggle={() => toggleMutation.mutate({ id: sub.id, isActive: false })}
										subscription={sub}
									/>
								</div>
							))}
						</div>
					</div>
				)}

				{pausedAssinaturas.length > 0 && (
					<div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
						<p className="mb-2 px-1 font-medium text-foreground-muted text-sm">Pausadas</p>
						<div className="space-y-3">
							{pausedAssinaturas.map(sub => (
								<SubscriptionCard
									isToggling={toggleMutation.isPending}
									key={sub.id}
									onToggle={() => toggleMutation.mutate({ id: sub.id, isActive: true })}
									paused
									subscription={sub}
								/>
							))}
						</div>
					</div>
				)}

				{subscriptions.length === 0 && (
					<div className="card animate-fade-in py-12 text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
							<HiArrowPathRoundedSquare className="h-8 w-8 text-primary-300" />
						</div>
						<p className="mb-1 font-semibold text-foreground">Nenhuma assinatura</p>
						<p className="mb-4 text-foreground-muted text-sm">Acompanhe seus gastos recorrentes</p>
						<button
							className="btn-primary inline-flex items-center gap-2"
							onClick={() => setIsCreateModalOpen(true)}
						>
							<HiPlus className="h-5 w-5" />
							<span>Adicionar assinatura</span>
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
							<h2 className="font-bold text-foreground text-xl">Nova assinatura</h2>
							<button
								className="rounded-full p-2 transition-colors hover:bg-primary-50"
								onClick={() => setIsCreateModalOpen(false)}
							>
								<HiXMark className="h-6 w-6 text-foreground-muted" />
							</button>
						</div>

						{/* Name */}
						<div className="mb-4">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">Nome</span>
							<input
								className="input"
								onChange={e => setNewSubscription({ ...newSubscription, name: e.target.value })}
								placeholder="Ex: Netflix"
								type="text"
								value={newSubscription.name}
							/>
						</div>

						{/* Amount and Dia da cobrança */}
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
										onChange={e => setNewSubscription({ ...newSubscription, amount: e.target.value })}
										placeholder="39.90"
										step="0.01"
										type="text"
										value={newSubscription.amount}
									/>
								</div>
							</div>
							<div>
								<span className="mb-2 block font-medium text-foreground-muted text-sm">Dia da cobrança</span>
								<input
									className="input"
									inputMode="decimal"
									max="31"
									min="1"
									onChange={e => setNewSubscription({ ...newSubscription, billingDay: e.target.value })}
									placeholder="15"
									type="text"
									value={newSubscription.billingDay}
								/>
							</div>
						</div>

						{/* Frequency */}
						<div className="mb-4">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">Frequência</span>
							<div className="grid grid-cols-3 gap-2">
								{frequencyOptions.map(option => (
									<button
										className={`rounded-xl px-4 py-2.5 font-medium text-sm transition-all ${
											newSubscription.frequency === option.id
												? "bg-primary-500 text-white"
												: "bg-background-card text-foreground hover:bg-primary-100"
										}`}
										key={option.id}
										onClick={() => setNewSubscription({ ...newSubscription, frequency: option.id })}
									>
										{option.label}
									</button>
								))}
							</div>
						</div>

						{/* Forma de pagamento */}
						<div className="mb-4">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">Forma de pagamento</span>
							<div className="grid grid-cols-2 gap-2">
								{paymentMethodOptions.slice(0, 4).map(option => (
									<button
										className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-medium text-sm transition-all ${
											newSubscription.paymentMethod === option.id
												? "bg-primary-500 text-white"
												: "bg-background-card text-foreground hover:bg-primary-100"
										}`}
										key={option.id}
										onClick={() => setNewSubscription({ ...newSubscription, paymentMethod: option.id })}
									>
										{option.id === "CREDIT" && <HiCreditCard className="h-4 w-4" />}
										<span>{option.label}</span>
									</button>
								))}
							</div>
						</div>

						{/* Data inicial */}
						<div className="mb-6">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">Data inicial</span>
							<input
								className="input"
								onChange={e => setNewSubscription({ ...newSubscription, startDate: e.target.value })}
								type="date"
								value={newSubscription.startDate}
							/>
						</div>

						{/* Actions */}
						<div className="flex gap-3">
							<button className="btn-secondary flex-1" onClick={() => setIsCreateModalOpen(false)}>
								Cancel
							</button>
							<button
								className="btn-primary flex flex-1 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
								disabled={
									!newSubscription.name ||
									!newSubscription.amount ||
									!newSubscription.billingDay ||
									createMutation.isPending
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

export const Route = createFileRoute("/subscriptions")({
	component: AssinaturasPage,
});
