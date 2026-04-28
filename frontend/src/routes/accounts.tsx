import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
	HiBanknotes,
	HiBuildingLibrary,
	HiCheck,
	HiChevronRight,
	HiCreditCard,
	HiPlus,
	HiWallet,
	HiXMark,
} from "react-icons/hi2";
import { type Account, api } from "@/lib/api";
import { type AuthState, useAuthStore } from "@/stores";

function formatCurrency(value: number) {
	return new Intl.NumberFormat("pt-BR", {
		currency: "BRL",
		style: "currency",
	}).format(value);
}

const accountTypeConfig: Record<
	string,
	{ icon: React.ReactNode; label: string; color: string; bgColor: string }
> = {
	CASH: {
		bgColor: "bg-success-100",
		color: "text-success-600",
		icon: <HiWallet className="h-6 w-6" />,
		label: "Cash",
	},
	CHECKING: {
		bgColor: "bg-primary-100",
		color: "text-primary-600",
		icon: <HiBuildingLibrary className="h-6 w-6" />,
		label: "Checking Account",
	},
	CREDIT_CARD: {
		bgColor: "bg-primary-100",
		color: "text-primary-500",
		icon: <HiCreditCard className="h-6 w-6" />,
		label: "Credit Card",
	},
	INVESTMENT: {
		bgColor: "bg-accent-100",
		color: "text-accent-600",
		icon: <HiBuildingLibrary className="h-6 w-6" />,
		label: "Investment",
	},
	SAVINGS: {
		bgColor: "bg-success-100",
		color: "text-success-600",
		icon: <HiBanknotes className="h-6 w-6" />,
		label: "Savings Account",
	},
};

const accountTypeOptions = [
	{ id: "CHECKING", label: "Checking Account" },
	{ id: "SAVINGS", label: "Savings Account" },
	{ id: "INVESTMENT", label: "Investment" },
	{ id: "CASH", label: "Cash" },
	{ id: "CREDIT_CARD", label: "Credit Card" },
];

function AccountsPage() {
	const queryClient = useQueryClient();
	const user = useAuthStore((s: AuthState) => s.user);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [newAccount, setNewAccount] = useState({
		balance: "",
		creditLimit: "",
		dueDay: "",
		name: "",
		statementDay: "",
		type: "CHECKING",
	});

	const { data: accounts, isLoading } = useQuery({
		enabled: !!user?.id,
		queryFn: () => api.getAccounts(user?.id),
		queryKey: ["accounts", user?.id],
	});

	const createMutation = useMutation({
		mutationFn: (data: Parameters<typeof api.createAccount>[0]) => api.createAccount(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["accounts"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard"] });
			setIsModalOpen(false);
			resetForm();
		},
	});

	const resetForm = () => {
		setNewAccount({
			balance: "",
			creditLimit: "",
			dueDay: "",
			name: "",
			statementDay: "",
			type: "CHECKING",
		});
	};

	const handleCreate = () => {
		const type = newAccount.type as Account["type"];
		const data: Parameters<typeof api.createAccount>[0] = {
			balance: Number.parseFloat(newAccount.balance) || 0,
			name: newAccount.name,
			type,
			userId: user!.id,
		};

		if (type === "CREDIT_CARD") {
			data.creditCard = {
				creditLimit: Number.parseFloat(newAccount.creditLimit) || 0,
				dueDay: Number.parseInt(newAccount.dueDay, 10) || 10,
				statementDay: Number.parseInt(newAccount.statementDay, 10) || 1,
			};
		}

		createMutation.mutate(data);
	};

	const totalBalance =
		accounts?.reduce((sum, acc) => {
			if (acc.type === "CREDIT_CARD") return sum;
			return sum + acc.balance;
		}, 0) || 0;

	const regularAccounts = accounts?.filter(acc => acc.type !== "CREDIT_CARD") || [];
	const creditCards = accounts?.filter(acc => acc.type === "CREDIT_CARD") || [];

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
						<h1 className="font-bold text-2xl text-white">Accounts</h1>
						<button
							className="flex items-center gap-2 rounded-xl bg-accent-300 px-4 py-2 font-semibold text-primary-900 transition-all hover:bg-accent-200 active:scale-95"
							onClick={() => setIsModalOpen(true)}
						>
							<HiPlus className="h-5 w-5" />
							<span>Add</span>
						</button>
					</div>

					<p className="mb-1 text-sm text-white/70">Total Balance</p>
					<p className="font-bold text-4xl text-white tracking-tight">{formatCurrency(totalBalance)}</p>
				</div>
			</div>

			{/* Account Cards */}
			<div className="-mt-12 space-y-6 px-4 pb-8">
				{/* Regular Accounts Section */}
				{regularAccounts.length > 0 && (
					<div className="animate-fade-in">
						<p className="mb-2 px-1 font-medium text-foreground-muted text-sm">Accounts</p>
						<div className="card overflow-hidden p-0">
							{regularAccounts.map((account, idx) => {
								const config = accountTypeConfig[account.type] || accountTypeConfig.CHECKING;
								return (
									<div
										className={`flex items-center gap-4 p-4 transition-colors hover:bg-primary-50/50 ${
											idx !== regularAccounts.length - 1 ? "border-primary-50 border-b" : ""
										}`}
										key={account.id}
									>
										<div
											className={`flex h-12 w-12 items-center justify-center rounded-2xl ${config.bgColor} ${config.color}`}
										>
											{config.icon}
										</div>
										<div className="min-w-0 flex-1">
											<p className="truncate font-semibold text-foreground">{account.name}</p>
											<p className="text-foreground-muted text-xs">{config.label}</p>
										</div>
										<div className="flex items-center gap-2 text-right">
											<p
												className={`font-bold ${account.balance >= 0 ? "text-success-600" : "text-danger-600"}`}
											>
												{formatCurrency(account.balance)}
											</p>
											<HiChevronRight className="h-5 w-5 text-foreground-muted" />
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}

				{/* Credit Cards Section */}
				{creditCards.length > 0 && (
					<div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
						<p className="mb-2 px-1 font-medium text-foreground-muted text-sm">Credit Cards</p>
						<div className="space-y-3">
							{creditCards.map(account => {
								const config = accountTypeConfig.CREDIT_CARD;
								const usedLimit = account.creditCard ? account.creditCard.creditLimit + account.balance : 0;
								const limitPercent = account.creditCard
									? (usedLimit / account.creditCard.creditLimit) * 100
									: 0;

								return (
									<div className="card p-4" key={account.id}>
										<div className="mb-3 flex items-center gap-4">
											<div
												className={`flex h-12 w-12 items-center justify-center rounded-2xl ${config.bgColor} ${config.color}`}
											>
												{config.icon}
											</div>
											<div className="min-w-0 flex-1">
												<p className="truncate font-semibold text-foreground">{account.name}</p>
												<p className="text-foreground-muted text-xs">Due day: {account.creditCard?.dueDay}</p>
											</div>
											<HiChevronRight className="h-5 w-5 text-foreground-muted" />
										</div>

										{account.creditCard && (
											<div className="space-y-2">
												<div className="flex justify-between text-sm">
													<span className="text-foreground-muted">Used</span>
													<span className="font-semibold text-danger-600">{formatCurrency(usedLimit)}</span>
												</div>
												<div className="h-2 overflow-hidden rounded-full bg-primary-100">
													<div
														className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-500"
														style={{ width: `${Math.min(limitPercent, 100)}%` }}
													/>
												</div>
												<div className="flex justify-between text-foreground-muted text-xs">
													<span>Available: {formatCurrency(account.creditCard.creditLimit - usedLimit)}</span>
													<span>Limit: {formatCurrency(account.creditCard.creditLimit)}</span>
												</div>
											</div>
										)}
									</div>
								);
							})}
						</div>
					</div>
				)}

				{/* Empty State */}
				{(!accounts || accounts.length === 0) && (
					<div className="card animate-fade-in py-12 text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
							<HiBuildingLibrary className="h-8 w-8 text-primary-300" />
						</div>
						<p className="mb-1 font-semibold text-foreground">No accounts yet</p>
						<p className="mb-4 text-foreground-muted text-sm">Add your first account to start tracking</p>
						<button
							className="btn-primary inline-flex items-center gap-2"
							onClick={() => setIsModalOpen(true)}
						>
							<HiPlus className="h-5 w-5" />
							<span>Add Account</span>
						</button>
					</div>
				)}
			</div>

			{/* Create Modal */}
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
							<h2 className="font-bold text-foreground text-xl">New Account</h2>
							<button
								className="rounded-full p-2 transition-colors hover:bg-primary-50"
								onClick={() => setIsModalOpen(false)}
							>
								<HiXMark className="h-6 w-6 text-foreground-muted" />
							</button>
						</div>

						{/* Account Type */}
						<div className="mb-6">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">Type</span>
							<div className="grid grid-cols-2 gap-2">
								{accountTypeOptions.map(option => {
									const config = accountTypeConfig[option.id];
									return (
										<button
											className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left font-medium transition-all ${
												newAccount.type === option.id
													? "bg-primary-500 text-white"
													: "bg-background-card text-foreground hover:bg-primary-100"
											}`}
											key={option.id}
											onClick={() => setNewAccount({ ...newAccount, type: option.id })}
										>
											<span className={newAccount.type === option.id ? "text-white" : config.color}>
												{config.icon}
											</span>
											<span className="text-sm">{option.label}</span>
										</button>
									);
								})}
							</div>
						</div>

						{/* Name */}
						<div className="mb-4">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">Name</span>
							<input
								className="input"
								onChange={e => setNewAccount({ ...newAccount, name: e.target.value })}
								placeholder="e.g., Main Checking"
								type="text"
								value={newAccount.name}
							/>
						</div>

						{/* Balance (for non-credit cards) */}
						{newAccount.type !== "CREDIT_CARD" && (
							<div className="mb-4">
								<span className="mb-2 block font-medium text-foreground-muted text-sm">Initial Balance</span>
								<div className="relative">
									<span className="absolute top-1/2 left-4 -translate-y-1/2 font-medium text-foreground-muted">
										R$
									</span>
									<input
										className="input pl-12"
										onChange={e => setNewAccount({ ...newAccount, balance: e.target.value })}
										placeholder="0.00"
										step="0.01"
										type="number"
										value={newAccount.balance}
									/>
								</div>
							</div>
						)}

						{/* Credit Card Fields */}
						{newAccount.type === "CREDIT_CARD" && (
							<>
								<div className="mb-4">
									<span className="mb-2 block font-medium text-foreground-muted text-sm">Credit Limit</span>
									<div className="relative">
										<span className="absolute top-1/2 left-4 -translate-y-1/2 font-medium text-foreground-muted">
											R$
										</span>
										<input
											className="input pl-12"
											onChange={e => setNewAccount({ ...newAccount, creditLimit: e.target.value })}
											placeholder="5000.00"
											step="0.01"
											type="number"
											value={newAccount.creditLimit}
										/>
									</div>
								</div>

								<div className="mb-4 grid grid-cols-2 gap-3">
									<div>
										<span className="mb-2 block font-medium text-foreground-muted text-sm">
											Statement Day
										</span>
										<input
											className="input"
											max="31"
											min="1"
											onChange={e => setNewAccount({ ...newAccount, statementDay: e.target.value })}
											placeholder="15"
											type="number"
											value={newAccount.statementDay}
										/>
									</div>
									<div>
										<span className="mb-2 block font-medium text-foreground-muted text-sm">Due Day</span>
										<input
											className="input"
											max="31"
											min="1"
											onChange={e => setNewAccount({ ...newAccount, dueDay: e.target.value })}
											placeholder="25"
											type="number"
											value={newAccount.dueDay}
										/>
									</div>
								</div>
							</>
						)}

						{/* Actions */}
						<div className="flex gap-3 pt-4">
							<button className="btn-secondary flex-1" onClick={() => setIsModalOpen(false)}>
								Cancel
							</button>
							<button
								className="btn-primary flex flex-1 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
								disabled={!newAccount.name || createMutation.isPending}
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

export const Route = createFileRoute("/accounts")({
	component: AccountsPage,
});
