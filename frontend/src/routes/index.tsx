import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	LuArrowDownLeft,
	LuArrowRight,
	LuArrowUpRight,
	LuCreditCard,
	LuLandmark,
	LuPlus,
	LuReceiptText,
	LuTrendingUp,
} from "react-icons/lu";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { dataService } from "@/lib/dataService";
import { type AuthState, useAuthStore } from "@/stores";

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });

function DashboardPage() {
	const user = useAuthStore((state: AuthState) => state.user);
	const dashboardQuery = useQuery({
		queryFn: () => dataService.dashboard.get(),
		queryKey: ["dashboard", user?.id ?? "guest"],
	});

	if (dashboardQuery.isPending) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-24 rounded-2xl" />
				<div className="grid gap-4 md:grid-cols-3">
					<Skeleton className="h-36 rounded-2xl" />
					<Skeleton className="h-36 rounded-2xl" />
					<Skeleton className="h-36 rounded-2xl" />
				</div>
				<Skeleton className="h-80 rounded-2xl" />
			</div>
		);
	}

	if (dashboardQuery.isError) {
		return (
			<EmptyState
				description="Não foi possível atualizar seus dados agora."
				icon={<LuTrendingUp />}
				title="Painel indisponível"
			/>
		);
	}

	const dashboard = dashboardQuery.data;
	const summary = dashboard.summary;

	return (
		<div className="space-y-6">
			<PageHeader
				actions={
					<Button asChild className="cursor-pointer">
						<Link to="/transactions">
							<LuPlus />
							Nova transação
						</Link>
					</Button>
				}
				description="Seu dinheiro, compromissos e próximos passos em um só lugar."
				eyebrow={`Olá, ${user?.name?.split(" ")[0] || "visitante"}`}
				title="Visão geral"
			/>

			<section className="grid gap-4 md:grid-cols-3">
				<Card className="border-0 bg-primary text-primary-foreground shadow-primary/15 shadow-xl md:col-span-1">
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

			<section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
				<Card>
					<CardHeader className="flex-row items-center justify-between">
						<div>
							<CardTitle>Movimentações recentes</CardTitle>
							<p className="mt-1 text-muted-foreground text-sm">Últimas entradas e saídas registradas.</p>
						</div>
						<Button asChild className="cursor-pointer" size="sm" variant="outline">
							<Link to="/transactions">
								Ver todas
								<LuArrowRight />
							</Link>
						</Button>
					</CardHeader>
					<CardContent>
						{dashboard.recentTransactions.length === 0 ? (
							<EmptyState
								description="Suas transações aparecerão aqui."
								icon={<LuReceiptText />}
								title="Nenhuma movimentação"
							/>
						) : (
							<div className="divide-y">
								{dashboard.recentTransactions.slice(0, 5).map(transaction => (
									<div className="flex items-center gap-3 py-3" key={transaction.id}>
										<div className="flex size-10 items-center justify-center rounded-xl bg-muted">
											{transaction.type === "INCOME" ? (
												<LuArrowDownLeft className="text-emerald-600" />
											) : (
												<LuArrowUpRight className="text-rose-600" />
											)}
										</div>
										<div className="min-w-0 flex-1">
											<p className="truncate font-semibold text-sm">
												{transaction.description || transaction.categoryName || "Movimentação"}
											</p>
											<p className="text-muted-foreground text-xs">
												{new Date(transaction.date).toLocaleDateString("pt-BR")}
											</p>
										</div>
										<p
											className={`font-bold text-sm ${transaction.type === "INCOME" ? "text-emerald-600" : "text-rose-600"}`}
										>
											{currency.format(Number(transaction.amount))}
										</p>
									</div>
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
		</div>
	);
}

export const Route = createFileRoute("/")({ component: DashboardPage });
