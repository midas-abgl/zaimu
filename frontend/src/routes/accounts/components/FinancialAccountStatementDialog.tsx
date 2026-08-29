import { useQuery } from "@tanstack/react-query";
import { TransactionListItem } from "@/components/transactions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Skeleton } from "@/components/ui/Skeleton";
import type { FinancialAccount, Transaction } from "@/lib/api";
import { dataService } from "@/lib/dataService";
import { getFinancialAccountDisplayName } from "@/lib/financial-account";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
	day: "numeric",
	month: "long",
	year: "numeric",
});

function groupTransactionsByDate(transactions: Transaction[]) {
	return transactions.reduce<Record<string, Transaction[]>>((groups, transaction) => {
		const date = transaction.date.slice(0, 10);
		const transactionsForDate = groups[date] ?? [];
		transactionsForDate.push(transaction);
		groups[date] = transactionsForDate;
		return groups;
	}, {});
}

export function FinancialAccountStatementDialog({
	account,
	onOpenChange,
	open,
}: {
	account: FinancialAccount;
	onOpenChange: (open: boolean) => void;
	open: boolean;
}) {
	const statement = useQuery({
		enabled: open,
		queryFn: () => dataService.transactions.getAll({ financialAccountId: account.id }),
		queryKey: ["transactions", "financial-account", account.id],
	});
	const groupedTransactions = groupTransactionsByDate(statement.data ?? []);
	const displayName = getFinancialAccountDisplayName(account);

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[calc(100dvh-2rem)] gap-4 sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Extrato · {displayName}</DialogTitle>
					<DialogDescription>Movimentações que compõem saldo desta conta.</DialogDescription>
				</DialogHeader>
				{statement.isPending ? (
					<div className="space-y-3">
						{[1, 2, 3].map(item => (
							<Skeleton className="h-24 rounded-2xl" key={item} />
						))}
					</div>
				) : statement.isError ? (
					<EmptyState description="Tente novamente em instantes." title="Não foi possível carregar extrato" />
				) : statement.data?.length ? (
					<ScrollArea className="h-[min(34rem,calc(100dvh-14rem))] pr-3">
						<div className="space-y-5">
							{Object.entries(groupedTransactions).map(([date, transactions]) => (
								<section className="space-y-2" key={date}>
									<h3 className="font-medium text-muted-foreground text-sm">
										{dateFormatter.format(new Date(`${date}T12:00:00`))}
									</h3>
									<div className="divide-y rounded-2xl border bg-card shadow-sm">
										{transactions.map(transaction => (
											<TransactionListItem key={transaction.id} transaction={transaction} />
										))}
									</div>
								</section>
							))}
						</div>
					</ScrollArea>
				) : (
					<EmptyState
						description="Nenhuma entrada, saída ou transferência vinculada a esta conta."
						title="Extrato vazio"
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}
