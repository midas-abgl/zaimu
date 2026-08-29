import { useQuery } from "@tanstack/react-query";
import { LuCalendarClock, LuPlus, LuReceiptText, LuWalletCards } from "react-icons/lu";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Skeleton } from "@/components/ui/Skeleton";
import type { CreditCard } from "@/lib/api";
import { getCreditCardDisplayName } from "@/lib/credit-card";
import { dataService } from "@/lib/dataService";
import { formatLocalDate } from "@/lib/date";

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });

export function CreditCardOverviewCard({
	card,
	onAddPurchase,
	onViewStatements,
}: {
	card: CreditCard;
	onAddPurchase: () => void;
	onViewStatements: () => void;
}) {
	const statements = useQuery({
		queryFn: () => dataService.creditCards.getStatements(card.id, false),
		queryKey: ["credit-card-statements", card.id, { isPaid: false }],
	});
	if (statements.isPending) return <Skeleton className="h-72" />;
	const statement = statements.data?.[0];
	const used = statement?.totalAmount ?? 0;
	const available = Math.max(0, card.creditLimit - used);
	const percent = card.creditLimit > 0 ? Math.min(100, (used / card.creditLimit) * 100) : 0;

	return (
		<article className="overflow-hidden rounded-3xl border bg-card shadow-card">
			<div className="relative min-h-44 overflow-hidden bg-brand-indigo p-6 text-white">
				<div className="absolute -top-16 -right-12 size-48 rounded-full bg-brand-yellow/25" />
				<div className="absolute -bottom-20 -left-12 size-44 rounded-full border-[28px] border-white/10" />
				<div className="relative flex items-start justify-between">
					<span className="flex size-11 items-center justify-center rounded-2xl bg-white/15">
						<LuWalletCards className="size-6" />
					</span>
					<span className="rounded-full border border-white/20 px-3 py-1 text-white/75 text-xs">
						fecha dia {card.statementDay}
					</span>
				</div>
				<div className="relative mt-7">
					<h2 className="font-bold text-xl">{getCreditCardDisplayName(card)}</h2>
					<p className="mt-1 text-sm text-white/65">vencimento dia {card.dueDay}</p>
					{card.excludeFromTotals && (
						<span className="mt-3 inline-flex rounded-full border border-white/25 px-2.5 py-1 text-white/75 text-xs">
							Fora dos seus totais
						</span>
					)}
				</div>
			</div>
			<div className="grid gap-5 p-5">
				<div>
					<div className="mb-2 flex justify-between gap-3 text-sm">
						<span className="text-muted-foreground">Limite utilizado</span>
						<strong>{percent.toFixed(0)}%</strong>
					</div>
					<Progress value={percent} />
				</div>
				<div className="grid gap-3 min-[420px]:grid-cols-2">
					<div className="rounded-xl bg-muted p-3">
						<p className="text-muted-foreground text-xs">Fatura prevista</p>
						<p className="mt-1 font-bold">{currency.format(used)}</p>
					</div>
					<div className="rounded-xl bg-accent p-3 text-accent-foreground">
						<p className="text-brand-ink/60 text-xs">Disponível</p>
						<p className="mt-1 font-bold">{currency.format(available)}</p>
					</div>
				</div>
				{card.securityDeposit != null && (
					<div className="rounded-xl border border-dashed p-3">
						<p className="text-muted-foreground text-xs">Valor em garantia do limite</p>
						<p className="mt-1 font-bold">{currency.format(card.securityDeposit)}</p>
					</div>
				)}
				{statement && (
					<p className="flex items-center gap-2 text-muted-foreground text-sm">
						<LuCalendarClock /> Vence em {formatLocalDate(statement.dueDate)}
					</p>
				)}
				<div className="grid gap-3 min-[420px]:grid-cols-2">
					<Button className="w-full cursor-pointer" onClick={onViewStatements} variant="outline">
						<LuReceiptText /> Ver faturas
					</Button>
					<Button className="w-full cursor-pointer" onClick={onAddPurchase}>
						<LuPlus /> Registrar compra
					</Button>
				</div>
			</div>
		</article>
	);
}
