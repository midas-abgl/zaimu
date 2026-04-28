import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { HiArrowDown, HiArrowsRightLeft, HiArrowUp, HiBell, HiChevronRight, HiPlus } from "react-icons/hi2";
import { api } from "@/lib/api";
import { type AuthState, useAuthStore } from "@/stores";

function formatCurrency(value: number) {
	return new Intl.NumberFormat("pt-BR", {
		currency: "BRL",
		style: "currency",
	}).format(value);
}

function DashboardPage() {
	const user = useAuthStore((s: AuthState) => s.user);

	const { data: dashboard, isLoading } = useQuery({
		enabled: !!user?.id,
		queryFn: () => api.getDashboard(user!.id),
		queryKey: ["dashboard", user?.id],
	});

	if (isLoading) {
		return (
			<div className="min-h-screen bg-background">
				{/* Skeleton Header */}
				<div className="gradient-primary px-4 pt-12 pb-32">
					<div className="animate-pulse space-y-4">
						<div className="h-6 w-32 rounded-lg bg-white/20" />
						<div className="h-10 w-48 rounded-lg bg-white/20" />
					</div>
				</div>
				{/* Skeleton Cards */}
				<div className="-mt-24 space-y-4 px-4">
					<div className="h-40 animate-pulse rounded-3xl bg-background-card" />
					<div className="h-32 animate-pulse rounded-3xl bg-background-card" />
					<div className="h-48 animate-pulse rounded-3xl bg-background-card" />
				</div>
			</div>
		);
	}

	// Mock data for demo if no user
	const summary = dashboard?.summary || { currentMonth: { expenses: 0, income: 0 }, totalBalance: 0 };
	const accounts = dashboard?.accounts || [];
	const upcomingBills = dashboard?.upcomingBills || [];
	const loans = dashboard?.loans || { active: [], monthlyPayment: 0, totalRemaining: 0 };
	const debts = dashboard?.debts || { iOwe: 0, owedToMe: 0 };
	const recentTransactions = dashboard?.recentTransactions || [];

	return (
		<div className="min-h-screen bg-background">
			{/* Header with gradient background */}
			<div className="gradient-primary relative overflow-hidden px-4 pt-12 pb-32">
				{/* Background decoration */}
				<div className="absolute top-0 right-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-500/20" />
				<div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/4 translate-y-1/2 rounded-full bg-primary-700/30" />

				<div className="relative z-10">
					{/* Top row with greeting and notifications */}
					<div className="mb-6 flex items-center justify-between">
						<div>
							<p className="text-sm text-white/70">Welcome back,</p>
							<h1 className="font-bold text-2xl text-white">{user?.name || "User"}</h1>
						</div>
						<button className="relative rounded-full bg-white/10 p-2 backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95">
							<HiBell className="h-6 w-6 text-white" />
							<span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-accent-300" />
						</button>
					</div>

					{/* Balance display */}
					<div className="mb-4 text-center">
						<p className="mb-1 text-sm text-white/70">Total Balance</p>
						<h2 className="animate-fade-in font-bold text-4xl text-white tracking-tight">
							{formatCurrency(summary.totalBalance)}
						</h2>
					</div>
				</div>
			</div>

			{/* Main content - overlapping the header */}
			<div className="relative z-10 -mt-24 space-y-4 px-4 pb-8">
				{/* Income/Expense Summary Card */}
				<div className="card animate-slide-up p-5">
					<div className="flex items-center justify-between">
						{/* Income */}
						<div className="flex items-center gap-3">
							<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success-100">
								<HiArrowDown className="h-6 w-6 rotate-180 text-success-600" />
							</div>
							<div>
								<p className="text-foreground-secondary text-xs">Income</p>
								<p className="font-bold text-foreground text-lg">
									{formatCurrency(summary.currentMonth.income)}
								</p>
							</div>
						</div>

						{/* Divider */}
						<div className="h-12 w-px bg-primary-100" />

						{/* Expenses */}
						<div className="flex items-center gap-3">
							<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-100">
								<HiArrowUp className="h-6 w-6 rotate-180 text-danger-600" />
							</div>
							<div>
								<p className="text-foreground-secondary text-xs">Expenses</p>
								<p className="font-bold text-foreground text-lg">
									{formatCurrency(summary.currentMonth.expenses)}
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Quick Actions */}
				<div className="flex animate-slide-up gap-3" style={{ animationDelay: "0.1s" }}>
					<Link
						className="card-interactive flex flex-1 items-center justify-center gap-2 py-4"
						to="/transactions"
					>
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500">
							<HiPlus className="h-5 w-5 text-white" />
						</div>
						<span className="font-medium text-foreground">Add Transaction</span>
					</Link>
				</div>

				{/* Accounts Section */}
				{accounts.length > 0 && (
					<div className="animate-slide-up" style={{ animationDelay: "0.15s" }}>
						<div className="mb-3 flex items-center justify-between">
							<h3 className="font-bold text-foreground text-lg">My Accounts</h3>
							<Link
								className="flex items-center gap-1 font-medium text-primary-500 text-sm transition-colors hover:text-primary-600"
								to="/accounts"
							>
								See all <HiChevronRight className="h-4 w-4" />
							</Link>
						</div>
						<div className="space-y-2">
							{accounts
								.slice(0, 3)
								.map(
									(account: { id: string; name: string; type: string; balance: number }, index: number) => (
										<div
											className="card-interactive flex items-center justify-between"
											key={account.id}
											style={{ animationDelay: `${0.2 + index * 0.05}s` }}
										>
											<div className="flex items-center gap-3">
												<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
													<span className="font-bold text-primary-600 text-sm">
														{account.name.charAt(0).toUpperCase()}
													</span>
												</div>
												<div>
													<p className="font-semibold text-foreground">{account.name}</p>
													<p className="text-foreground-secondary text-xs capitalize">
														{account.type.toLowerCase()}
													</p>
												</div>
											</div>
											<p
												className={`font-bold ${account.balance >= 0 ? "text-success-600" : "text-danger-600"}`}
											>
												{formatCurrency(account.balance)}
											</p>
										</div>
									),
								)}
						</div>
					</div>
				)}

				{/* Upcoming Bills */}
				{upcomingBills.length > 0 && (
					<div className="animate-slide-up" style={{ animationDelay: "0.25s" }}>
						<div className="mb-3 flex items-center justify-between">
							<h3 className="font-bold text-foreground text-lg">Upcoming Bills</h3>
						</div>
						<div className="card overflow-hidden p-0">
							{upcomingBills
								.slice(0, 3)
								.map((bill: { id: string; name: string; dueDay: number; amount: number }, index: number) => (
									<div
										className={`flex items-center justify-between p-4 ${
											index !== upcomingBills.slice(0, 3).length - 1 ? "border-primary-50 border-b" : ""
										}`}
										key={bill.id}
									>
										<div>
											<p className="font-semibold text-foreground">{bill.name}</p>
											<p className="text-foreground-muted text-xs">Due day {bill.dueDay}</p>
										</div>
										<span className="chip-accent font-semibold">{formatCurrency(bill.amount)}</span>
									</div>
								))}
						</div>
					</div>
				)}

				{/* Loans Summary */}
				{loans.active.length > 0 && (
					<div className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
						<div className="mb-3 flex items-center justify-between">
							<h3 className="font-bold text-foreground text-lg">Active Loans</h3>
							<Link className="flex items-center gap-1 font-medium text-primary-500 text-sm" to="/loans">
								See all <HiChevronRight className="h-4 w-4" />
							</Link>
						</div>
						<div className="card">
							<div className="mb-4 flex justify-between">
								<div>
									<p className="text-foreground-muted text-xs">Total Remaining</p>
									<p className="font-bold text-foreground text-lg">{formatCurrency(loans.totalRemaining)}</p>
								</div>
								<div className="text-right">
									<p className="text-foreground-muted text-xs">Monthly Payment</p>
									<p className="font-bold text-lg text-primary-500">{formatCurrency(loans.monthlyPayment)}</p>
								</div>
							</div>
							<div className="space-y-2 border-primary-50 border-t pt-3">
								{loans.active
									.slice(0, 2)
									.map(
										(loan: {
											id: string;
											lender: string;
											remainingInstallments: number;
											installmentAmount: number;
										}) => (
											<div className="flex items-center justify-between text-sm" key={loan.id}>
												<span className="text-foreground-muted">{loan.lender}</span>
												<span className="font-medium text-foreground">
													{loan.remainingInstallments}x of {formatCurrency(loan.installmentAmount)}
												</span>
											</div>
										),
									)}
							</div>
						</div>
					</div>
				)}

				{/* Debts Summary */}
				{(debts.owedToMe > 0 || debts.iOwe > 0) && (
					<div className="animate-slide-up" style={{ animationDelay: "0.35s" }}>
						<div className="mb-3 flex items-center justify-between">
							<h3 className="font-bold text-foreground text-lg">Debts</h3>
							<Link className="font-medium text-primary-500 text-sm" to="/debts">
								See all
							</Link>
						</div>
						<div className="card">
							<div className="flex justify-between">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-100">
										<HiArrowDown className="h-5 w-5 text-success-600" />
									</div>
									<div>
										<p className="text-foreground-muted text-xs">Owed to me</p>
										<p className="font-bold text-success-600">{formatCurrency(debts.owedToMe)}</p>
									</div>
								</div>
								<div className="flex items-center gap-3">
									<div>
										<p className="text-right text-foreground-muted text-xs">I owe</p>
										<p className="font-bold text-danger-600">{formatCurrency(debts.iOwe)}</p>
									</div>
									<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-100">
										<HiArrowUp className="h-5 w-5 text-danger-600" />
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Recent Transactions */}
				<div className="animate-slide-up" style={{ animationDelay: "0.4s" }}>
					<div className="mb-3 flex items-center justify-between">
						<h3 className="font-bold text-foreground text-lg">Recent Transactions</h3>
						<Link className="font-medium text-primary-500 text-sm" to="/transactions">
							See all
						</Link>
					</div>
					<div className="card overflow-hidden p-0">
						{recentTransactions.length === 0 ? (
							<div className="p-8 text-center">
								<div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
									<HiArrowsRightLeft className="h-8 w-8 text-primary-300" />
								</div>
								<p className="text-foreground-muted">No transactions yet</p>
								<p className="mt-1 text-foreground-light text-xs">
									Add your first transaction to get started
								</p>
							</div>
						) : (
							recentTransactions.slice(0, 5).map(
								(
									tx: {
										id: string;
										type: string;
										description?: string;
										categoryName?: string;
										date: string;
										amount: number;
									},
									index: number,
								) => (
									<div
										className={`flex items-center justify-between p-4 transition-colors hover:bg-primary-50/50 ${
											index !== recentTransactions.slice(0, 5).length - 1 ? "border-primary-50 border-b" : ""
										}`}
										key={tx.id}
									>
										<div className="flex items-center gap-3">
											<div
												className={`flex h-10 w-10 items-center justify-center rounded-xl ${
													tx.type === "INCOME"
														? "bg-success-100"
														: tx.type === "EXPENSE"
															? "bg-danger-100"
															: "bg-primary-100"
												}`}
											>
												{tx.type === "INCOME" ? (
													<HiArrowDown className="h-5 w-5 text-success-600" />
												) : tx.type === "EXPENSE" ? (
													<HiArrowUp className="h-5 w-5 text-danger-600" />
												) : (
													<HiArrowsRightLeft className="h-5 w-5 text-primary-600" />
												)}
											</div>
											<div>
												<p className="font-semibold text-foreground">
													{tx.description || tx.categoryName || "Transaction"}
												</p>
												<p className="text-foreground-muted text-xs">
													{new Date(tx.date).toLocaleDateString("pt-BR", {
														day: "2-digit",
														month: "short",
													})}
												</p>
											</div>
										</div>
										<p
											className={`font-bold ${
												tx.type === "INCOME"
													? "text-success-600"
													: tx.type === "EXPENSE"
														? "text-danger-600"
														: "text-primary-600"
											}`}
										>
											{tx.type === "INCOME" ? "+" : tx.type === "EXPENSE" ? "-" : ""}
											{formatCurrency(tx.amount)}
										</p>
									</div>
								),
							)
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export const Route = createFileRoute("/")({
	component: DashboardPage,
});
