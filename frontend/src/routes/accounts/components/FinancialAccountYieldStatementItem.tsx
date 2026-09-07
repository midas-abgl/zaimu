import { LuTrendingUp } from "react-icons/lu";

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });

export function FinancialAccountYieldStatementItem({ amount }: { amount: number }) {
	return (
		<div className="flex items-center gap-3 px-4 py-3">
			<span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
				<LuTrendingUp />
			</span>
			<div className="min-w-0 flex-1">
				<p className="font-semibold">Rendimento</p>
				<p className="text-muted-foreground text-sm">Rendimento diário da conta</p>
			</div>
			<p className="whitespace-nowrap font-bold text-emerald-600">+{currency.format(amount)}</p>
		</div>
	);
}
