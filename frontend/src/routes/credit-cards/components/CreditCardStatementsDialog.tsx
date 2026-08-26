import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { LuReceiptText } from "react-icons/lu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import type { CreditCard } from "@/lib/api";
import { dataService } from "@/lib/dataService";
import { getLocalMonthKey } from "@/lib/date";
import { CreditCardStatementDetails } from "./CreditCardStatementDetails";
import { CreditCardStatementTabs } from "./CreditCardStatementTabs";

export function CreditCardStatementsDialog({
	card,
	onOpenChange,
}: {
	card: CreditCard | null;
	onOpenChange: (open: boolean) => void;
}) {
	const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
	const statements = useQuery({
		enabled: Boolean(card),
		queryFn: () => dataService.creditCards.getStatements(card!.id),
		queryKey: ["credit-card-statements", card?.id, { isPaid: undefined }],
	});
	const currentStatement = statements.data?.find(
		statement => getLocalMonthKey(statement.statementDate) === getLocalMonthKey(new Date()),
	);
	const selectedStatement =
		statements.data?.find(statement => statement.id === selectedStatementId) ??
		currentStatement ??
		statements.data?.[0];

	return (
		<Dialog onOpenChange={onOpenChange} open={Boolean(card)}>
			<DialogContent className="max-h-[90dvh] gap-4 p-4 sm:max-w-5xl sm:gap-6 sm:p-6">
				<DialogHeader>
					<DialogTitle>Faturas de {card?.accountName ?? "Cartão de crédito"}</DialogTitle>
					<DialogDescription>Selecione um mês para consultar os detalhes e as transações.</DialogDescription>
				</DialogHeader>
				{statements.isPending ? (
					<div className="grid h-[65dvh] grid-rows-[10rem_minmax(0,1fr)] gap-4 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6 min-[480px]:grid-cols-[7.5rem_minmax(0,1fr)] min-[480px]:grid-rows-1">
						<div className="grid content-start gap-2 overflow-hidden border-b pb-3 min-[480px]:border-r min-[480px]:border-b-0 min-[480px]:pr-3 min-[480px]:pb-0">
							{[1, 2, 3, 4].map(item => (
								<Skeleton className="h-20" key={item} />
							))}
						</div>
						<Skeleton className="h-full" />
					</div>
				) : statements.isError ? (
					<EmptyState
						description="Tente novamente em instantes."
						icon={<LuReceiptText className="size-7" />}
						title="Não foi possível carregar as faturas"
					/>
				) : selectedStatement ? (
					<Tabs
						className="grid h-[65dvh] min-h-0 grid-rows-[10rem_minmax(0,1fr)] gap-0 sm:grid-cols-[13rem_minmax(0,1fr)] min-[480px]:grid-cols-[7.5rem_minmax(0,1fr)] min-[480px]:grid-rows-1"
						onValueChange={setSelectedStatementId}
						orientation="vertical"
						value={selectedStatement.id}
					>
						<CreditCardStatementTabs selectedId={selectedStatement.id} statements={statements.data} />
						<CreditCardStatementDetails key={selectedStatement.id} statement={selectedStatement} />
					</Tabs>
				) : (
					<EmptyState
						description="As faturas aparecerão aqui depois da primeira compra."
						icon={<LuReceiptText className="size-7" />}
						title="Nenhuma fatura registrada"
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}
