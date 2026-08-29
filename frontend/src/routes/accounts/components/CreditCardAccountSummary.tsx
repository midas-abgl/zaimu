import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/Skeleton";
import type { CreditCard } from "@/lib/api";
import { dataService } from "@/lib/dataService";

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });

export function CreditCardAccountSummary({ card }: { card?: CreditCard }) {
	const statements = useQuery({
		enabled: Boolean(card),
		queryFn: () => dataService.creditCards.getStatements(card!.id, false),
		queryKey: ["credit-card-statements", card?.id, { isPaid: false }],
	});

	if (!card || statements.isError) {
		return <p className="text-muted-foreground text-sm">Dados do cartão indisponíveis.</p>;
	}

	if (statements.isPending) {
		return (
			<div className="grid gap-4 min-[420px]:grid-cols-2">
				<div className="grid gap-2">
					<Skeleton className="h-3 w-20" />
					<Skeleton className="h-7 w-28" />
				</div>
				<div className="grid gap-2">
					<Skeleton className="h-3 w-28" />
					<Skeleton className="h-7 w-28" />
				</div>
			</div>
		);
	}

	const currentStatement = statements.data?.[0];
	const currentBill = currentStatement?.totalAmount ?? 0;
	const availableLimit = Math.max(0, card.creditLimit - currentBill);

	return (
		<div className="grid gap-4 min-[420px]:grid-cols-2">
			<div>
				<p className="text-muted-foreground text-xs">Fatura atual</p>
				<p className="mt-1 font-bold text-lg">{currency.format(currentBill)}</p>
			</div>
			<div>
				<p className="text-muted-foreground text-xs">Limite disponível</p>
				<p className="mt-1 font-bold text-lg">{currency.format(availableLimit)}</p>
			</div>
		</div>
	);
}
