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
import { api, type Subscription } from "@/lib/api";
import { type AuthState, useAuthStore } from "@/stores";

function formatCurrency(value: number) {
	return new Intl.NumberFormat("pt-BR", {
		currency: "BRL",
		style: "currency",
	}).format(value);
}

const frequencyOptions = [
	{ id: "MONTHLY", label: "Monthly" },
	{ id: "YEARLY", label: "Yearly" },
	{ id: "WEEKLY", label: "Weekly" },
];

const paymentMethodOptions = [
	{ id: "CREDIT", label: "Credit Card" },
	{ id: "DEBIT", label: "Debit" },
	{ id: "PIX", label: "Pix" },
	{ id: "BOLETO", label: "Boleto" },
	{ id: "TRANSFER", label: "Transfer" },
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

function SubscriptionsPage() {
	const queryClient = useQueryClient();
	const user = useAuthStore((s: AuthState) => s.user);
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
		enabled: !!user?.id,
		queryFn: () => api.getSubscriptions({ userId: user?.id }),
		queryKey: ["subscriptions", user?.id],
	});

	const createMutation = useMutation({
		mutationFn: (data: Parameters<typeof api.createSubscription>[0]) => api.createSubscription(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard"] });
			setIsCreateModalOpen(false);
			resetForm();
		},
	});

	const toggleMutation = useMutation({
		mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
			api.updateSubscription(id, { isActive }),
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
			userId: user!.id,
		});
	};

	const subscriptions = subscriptionsData?.subscriptions || [];
	const totalMonthlyCost = subscriptionsData?.totalMonthlyCost || 0;

	const activeSubscriptions = subscriptions.filter(s => s.isActive);
	const pausedSubscriptions = subscriptions.filter(s => !s.isActive);

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
			<div className="gradient-primary relative overflow-hidden px-4 pt-12 pb-24">
				<div className="absolute top-0 right-0 h-48 w-48 translate-x-1/4 -translate-y-1/2 rounded-full bg-primary-500/20" />
				<div className="absolute bottom-0 left-0 h-32 w-32 -translate-x-1/4 translate-y-1/2 rounded-full bg-primary-500/10" />

				<div className="relative z-10">
					<div className="mb-6 flex items-center justify-between">
						<h1 className="font-bold text-2xl text-white">Subscriptions</h1>
						<button
							className="flex items-center gap-2 rounded-xl bg-accent-300 px-4 py-2 font-semibold text-primary-900 transition-all hover:bg-accent-200 active:scale-95"
							onClick={() => setIsCreateModalOpen(true)}
						>
							<HiPlus className="h-5 w-5" />
							<span>Add</span>
						</button>
					</div>

					{subscriptions.length > 0 && (
						<div>
							<p className="mb-1 text-sm text-white/70">Monthly Cost</p>
							<p className="font-bold text-4xl text-white tracking-tight">
								{formatCurrency(totalMonthlyCost)}
							</p>
							<p className="mt-2 text-sm text-white/70">
								{activeSubscriptions.length} active subscription{activeSubscriptions.length !== 1 ? "s" : ""}
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Subscription List */}
			<div className="-mt-12 space-y-6 px-4 pb-8">
				{activeSubscriptions.length > 0 && (
					<div className="animate-fade-in">
						<p className="mb-2 px-1 font-medium text-foreground-muted text-sm">Active</p>
						<div className="space-y-3">
							{activeSubscriptions.map((sub, idx) => (
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

				{pausedSubscriptions.length > 0 && (
					<div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
						<p className="mb-2 px-1 font-medium text-foreground-muted text-sm">Paused</p>
						<div className="space-y-3">
							{pausedSubscriptions.map(sub => (
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
						<p className="mb-1 font-semibold text-foreground">No subscriptions</p>
						<p className="mb-4 text-foreground-muted text-sm">Track your recurring expenses</p>
						<button
							className="btn-primary inline-flex items-center gap-2"
							onClick={() => setIsCreateModalOpen(true)}
						>
							<HiPlus className="h-5 w-5" />
							<span>Add Subscription</span>
						</button>
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

					<div className="relative max-h-[90vh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-t-3xl bg-white p-6">
						<div className="absolute top-3 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-primary-200" />

						<div className="mb-6 flex items-center justify-between pt-2">
							<h2 className="font-bold text-foreground text-xl">New Subscription</h2>
							<button
								className="rounded-full p-2 transition-colors hover:bg-primary-50"
								onClick={() => setIsCreateModalOpen(false)}
							>
								<HiXMark className="h-6 w-6 text-foreground-muted" />
							</button>
						</div>

						{/* Name */}
						<div className="mb-4">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">Name</span>
							<input
								className="input"
								onChange={e => setNewSubscription({ ...newSubscription, name: e.target.value })}
								placeholder="e.g., Netflix"
								type="text"
								value={newSubscription.name}
							/>
						</div>

						{/* Amount and Billing Day */}
						<div className="mb-4 grid grid-cols-2 gap-3">
							<div>
								<span className="mb-2 block font-medium text-foreground-muted text-sm">Amount</span>
								<div className="relative">
									<span className="absolute top-1/2 left-4 -translate-y-1/2 font-medium text-foreground-muted">
										R$
									</span>
									<input
										className="input pl-12"
										onChange={e => setNewSubscription({ ...newSubscription, amount: e.target.value })}
										placeholder="39.90"
										step="0.01"
										type="number"
										value={newSubscription.amount}
									/>
								</div>
							</div>
							<div>
								<span className="mb-2 block font-medium text-foreground-muted text-sm">Billing Day</span>
								<input
									className="input"
									max="31"
									min="1"
									onChange={e => setNewSubscription({ ...newSubscription, billingDay: e.target.value })}
									placeholder="15"
									type="number"
									value={newSubscription.billingDay}
								/>
							</div>
						</div>

						{/* Frequency */}
						<div className="mb-4">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">Frequency</span>
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

						{/* Payment Method */}
						<div className="mb-4">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">Payment Method</span>
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

						{/* Start Date */}
						<div className="mb-6">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">Start Date</span>
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
										<span>Create</span>
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
	component: SubscriptionsPage,
});
