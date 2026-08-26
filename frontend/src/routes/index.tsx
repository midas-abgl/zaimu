import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	LuArrowDownLeft,
	LuArrowRight,
	LuArrowUpRight,
	LuCreditCard,
	LuLandmark,
	LuReceiptText,
	LuTrendingUp,
} from "react-icons/lu";
import { TransactionListItem } from "@/components/transactions";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { dataService } from "@/lib/dataService";
import { type AuthState, useAuthStore } from "@/stores";
import { DashboardQuickActions } from "./components";

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });

function DashboardPage() {
	const user = useAuthStore((state: AuthState) => state.user);
	const dashboardQuery = useQuery({
		queryFn: () => dataService.dashboard.get(),
		queryKey: ["dashboard", user?.id ?? "guest"],
	});
	const recentTransactionsQuery = useQuery({
		queryFn: () => dataService.transactions.getAll({ limit: 5 }),
		queryKey: ["transactions", "dashboard-recent", user?.id ?? "guest"],
	});

	if (dashboardQuery.isPending || recentTransactionsQuery.isPending) {
		return (
			<PageContainer className="space-y-6">
				<Skeleton className="h-24 rounded-2xl" />
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					<Skeleton className="h-36 rounded-2xl" />
					<Skeleton className="h-36 rounded-2xl" />
					<Skeleton className="h-36 rounded-2xl" />
				</div>
				<Skeleton className="h-80 rounded-2xl" />
			</PageContainer>
		);
	}

	if (dashboardQuery.isError) {
		return (
			<PageContainer>
				<EmptyState
					description="Não foi possível atualizar seus dados agora."
					icon={<LuTrendingUp />}
					title="Painel indisponível"
				/>
			</PageContainer>
		);
	}

	const dashboard = dashboardQuery.data;
	const summary = dashboard.summary;
	const recentTransactions = recentTransactionsQuery.data ?? [];

	return (
		<PageContainer className="space-y-6">
			<PageHeader
				actions={<DashboardQuickActions />}
				description="Seu dinheiro, compromissos e próximos passos em um só lugar."
				eyebrow={`Olá, ${user?.name?.split(" ")[0] || "visitante"}`}
				title="Visão geral"
			/>

			<section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				<Card className="border-0 bg-primary text-primary-foreground shadow-primary/15 shadow-xl sm:col-span-2 xl:col-span-1">
					<CardHeader>
						<CardTitle className="font-medium text-primary-foreground/75 text-sm">Saldo total</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="font-bold text-3xl tracking-tight">{currency.format(summary.totalBalance)}</p>
						<p className="mt-3 text-primary-foreground/70 text-xs">Somatório das contas financeiras</p>
					</CardContent>
				</Card>
				<Card className="border-0 bg-brand-yellow text-brand-ink shadow-brand-yellow/20 shadow-xl">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 font-medium text-sm">
							<LuArrowDownLeft />
							Receitas do mês
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="font-bold text-3xl tracking-tight">
							{currency.format(summary.currentMonth.income)}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
							<LuArrowUpRight />
							Despesas do mês
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="font-bold text-3xl tracking-tight">
							{currency.format(summary.currentMonth.expenses)}
						</p>
						<p
							className={`mt-3 font-semibold text-xs ${summary.currentMonth.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}
						>
							Resultado: {currency.format(summary.currentMonth.net)}
						</p>
					</CardContent>
				</Card>
			</section>

			<section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,1fr)]">
				<Card className="min-w-0">
					<CardHeader className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
						<div>
							<CardTitle>Movimentações recentes</CardTitle>
							<p className="mt-1 text-muted-foreground text-sm">
								Últimas entradas, saídas e compras no cartão.
							</p>
						</div>
						<Button asChild className="w-full cursor-pointer sm:w-auto" size="sm" variant="outline">
							<Link to="/transactions">
								Ver todas
								<LuArrowRight />
							</Link>
						</Button>
					</CardHeader>
					<CardContent>
						{recentTransactionsQuery.isError ? (
							<EmptyState
								description="Não foi possível carregar suas movimentações."
								icon={<LuReceiptText />}
								title="Movimentações indisponíveis"
							/>
						) : recentTransactions.length === 0 ? (
							<EmptyState
								description="Suas transações aparecerão aqui."
								icon={<LuReceiptText />}
								title="Nenhuma movimentação"
							/>
						) : (
							<div className="divide-y">
								{recentTransactions.map(transaction => (
									<TransactionListItem key={transaction.id} transaction={transaction} />
								))}
							</div>
						)}
					</CardContent>
				</Card>

				<div className="grid gap-4">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<LuLandmark className="text-primary" />
								Contas
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="font-bold text-3xl">{dashboard.accounts.length}</p>
							<Button asChild className="mt-4 w-full cursor-pointer" variant="outline">
								<Link to="/accounts">
									Gerenciar contas
									<LuArrowRight />
								</Link>
							</Button>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<LuCreditCard className="text-primary" />
								Próximos compromissos
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="font-bold text-3xl">
								{dashboard.upcomingBills.length + dashboard.pendingStatements.length}
							</p>
							<p className="mt-1 text-muted-foreground text-sm">Contas e faturas pendentes</p>
							<Button asChild className="mt-4 w-full cursor-pointer" variant="outline">
								<Link to="/credit-cards">
									Ver cartões
									<LuArrowRight />
								</Link>
							</Button>
						</CardContent>
					</Card>
				</div>
			</section>
		</PageContainer>
	);
}

export const Route = createFileRoute("/")({ component: DashboardPage });
