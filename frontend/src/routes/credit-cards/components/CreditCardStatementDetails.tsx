import { useQuery } from "@tanstack/react-query";
import { LuCalendarCheck, LuCalendarClock, LuCircleCheck, LuClock3, LuReceiptText } from "react-icons/lu";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Skeleton } from "@/components/ui/Skeleton";
import { TabsContent } from "@/components/ui/Tabs";
import type { CreditCardStatement } from "@/lib/api";
import { dataService } from "@/lib/dataService";
import { formatLocalDate } from "@/lib/date";

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });

export function CreditCardStatementDetails({ statement }: { statement: CreditCardStatement }) {
	const detail = useQuery({
		queryFn: () => dataService.creditCards.getStatement(statement.creditCardId, statement.id),
		queryKey: ["credit-card-statement", statement.creditCardId, statement.id],
	});

	return (
		<TabsContent
			className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-5 pl-4 sm:pl-6"
			value={statement.id}
		>
			<header className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p className="text-muted-foreground text-xs uppercase tracking-wide">Mês de referência</p>
					<h3 className="mt-1 font-bold text-xl capitalize" id={`statement-title-${statement.id}`}>
						{formatLocalDate(statement.statementDate, { month: "long", year: "numeric" })}
					</h3>
				</div>
				<div className="text-right">
					<p className="text-muted-foreground text-xs">Total da fatura</p>
					<strong className="text-xl">{currency.format(statement.totalAmount)}</strong>
				</div>
			</header>
			<div className="grid gap-2 lg:grid-cols-3">
				<div className="rounded-xl border bg-muted/30 p-3">
					<p className="flex items-center gap-1.5 text-muted-foreground text-xs">
						<LuCalendarCheck /> Fechamento
					</p>
					<strong className="mt-1 block text-sm">{formatLocalDate(statement.statementDate)}</strong>
				</div>
				<div className="rounded-xl border bg-muted/30 p-3">
					<p className="flex items-center gap-1.5 text-muted-foreground text-xs">
						<LuCalendarClock /> Vencimento
					</p>
					<strong className="mt-1 block text-sm">{formatLocalDate(statement.dueDate)}</strong>
				</div>
				<div className="rounded-xl border bg-muted/30 p-3">
					<p className="text-muted-foreground text-xs">Status</p>
					<Badge className="mt-1" variant={statement.isPaid ? "secondary" : "outline"}>
						{statement.isPaid ? <LuCircleCheck /> : <LuClock3 />}
						{statement.isPaid ? "Paga" : "Em aberto"}
					</Badge>
				</div>
			</div>
			<div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
				<div className="flex items-center justify-between gap-3">
					<h4 className="font-semibold">Transações</h4>
					{detail.data && (
						<span className="text-muted-foreground text-xs">
							{detail.data.purchases.length} {detail.data.purchases.length === 1 ? "compra" : "compras"}
						</span>
					)}
				</div>
				<ScrollArea className="min-h-0 pr-3">
					{detail.isPending ? (
						<div className="grid gap-2">
							{[1, 2, 3, 4].map(item => (
								<Skeleton className="h-16" key={item} />
							))}
						</div>
					) : detail.isError ? (
						<EmptyState
							description="Tente selecionar a fatura novamente."
							icon={<LuReceiptText className="size-7" />}
							title="Não foi possível carregar as transações"
						/>
					) : detail.data.purchases.length ? (
						<div className="grid gap-2">
							{detail.data.purchases.map(purchase => (
								<div
									className="flex items-center justify-between gap-4 rounded-xl border bg-card p-3"
									key={purchase.id}
								>
									<span className="min-w-0">
										<span className="block truncate font-medium">{purchase.description}</span>
										<span className="text-muted-foreground text-xs">
											{formatLocalDate(purchase.purchaseDate)}
											{purchase.categoryName ? ` · ${purchase.categoryName}` : ""}
											{purchase.installments > 1
												? ` · ${purchase.currentInstallment}/${purchase.installments}`
												: ""}
										</span>
									</span>
									<strong className="shrink-0">{currency.format(purchase.installmentAmount)}</strong>
								</div>
							))}
						</div>
					) : (
						<EmptyState
							description="Nenhuma compra foi vinculada a esta fatura."
							icon={<LuReceiptText className="size-7" />}
							title="Fatura sem transações"
						/>
					)}
				</ScrollArea>
			</div>
		</TabsContent>
	);
}
