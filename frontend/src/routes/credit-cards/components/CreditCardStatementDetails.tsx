import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LuCalendarCheck, LuCalendarClock, LuCircleCheck, LuClock3, LuReceiptText } from "react-icons/lu";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Skeleton } from "@/components/ui/Skeleton";
import { TabsContent } from "@/components/ui/Tabs";
import type { CreditCardStatement, CreditPurchase } from "@/lib/api";
import { dataService } from "@/lib/dataService";
import { formatLocalDate } from "@/lib/date";
import { showToast } from "@/stores";
import { CreditPurchaseRow } from "./CreditPurchaseRow";
import { EditCreditPurchaseDialog } from "./EditCreditPurchaseDialog";

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });

export function CreditCardStatementDetails({ statement }: { statement: CreditCardStatement }) {
	const queryClient = useQueryClient();
	const [editingPurchase, setEditingPurchase] = useState<CreditPurchase | null>(null);
	const detail = useQuery({
		queryFn: () => dataService.creditCards.getStatement(statement.creditCardId, statement.id),
		queryKey: ["credit-card-statement", statement.creditCardId, statement.id],
	});
	const refreshStatement = async () => {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: ["credit-card-statement", statement.creditCardId, statement.id],
			}),
			queryClient.invalidateQueries({ queryKey: ["credit-card-statements", statement.creditCardId] }),
		]);
	};
	const updatePurchase = useMutation({
		mutationFn: ({
			data,
			purchaseId,
		}: {
			data: Parameters<typeof dataService.creditCards.updatePurchase>[2];
			purchaseId: string;
		}) => dataService.creditCards.updatePurchase(statement.creditCardId, purchaseId, data),
		onError: error => {
			showToast(error instanceof Error ? error.message : "Não foi possível editar a transação.", "negative");
		},
		onSuccess: async () => {
			setEditingPurchase(null);
			await refreshStatement();
			showToast("Transação atualizada.", "positive");
		},
	});
	const deletePurchase = useMutation({
		mutationFn: (purchaseId: string) =>
			dataService.creditCards.deletePurchase(statement.creditCardId, purchaseId),
		onError: error => {
			showToast(error instanceof Error ? error.message : "Não foi possível excluir a transação.", "negative");
		},
		onSuccess: async () => {
			await refreshStatement();
			showToast("Transação excluída.", "positive");
		},
	});
	return (
		<TabsContent
			className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-5 pt-4 sm:pl-6 min-[480px]:pt-0 min-[480px]:pl-4"
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
								<CreditPurchaseRow
									disabled={statement.isPaid || statement.isForecast === true || deletePurchase.isPending}
									key={purchase.id}
									onDelete={() => deletePurchase.mutateAsync(purchase.id)}
									onEdit={() => setEditingPurchase(purchase)}
									purchase={purchase}
								/>
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
			{editingPurchase && (
				<EditCreditPurchaseDialog
					key={editingPurchase.id}
					onOpenChange={open => !open && setEditingPurchase(null)}
					onSubmit={async data => {
						await updatePurchase.mutateAsync({ data, purchaseId: editingPurchase.id });
					}}
					open
					pending={updatePurchase.isPending}
					purchase={editingPurchase}
				/>
			)}
		</TabsContent>
	);
}
