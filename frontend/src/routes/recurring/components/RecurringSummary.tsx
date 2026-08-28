import { HiArrowDown, HiArrowUp } from "react-icons/hi2";

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });

export function RecurringSummary({ expenses, incomes }: { expenses: number; incomes: number }) {
	return (
		<div className="grid gap-3 sm:grid-cols-2">
			<div className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
					<HiArrowDown />
				</div>
				<div className="min-w-0">
					<p className="text-muted-foreground text-xs">Entradas mensais</p>
					<p className="truncate font-bold text-emerald-600 text-lg">{currency.format(incomes)}</p>
				</div>
			</div>
			<div className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600">
					<HiArrowUp />
				</div>
				<div className="min-w-0">
					<p className="text-muted-foreground text-xs">Saídas mensais</p>
					<p className="truncate font-bold text-lg text-rose-600">{currency.format(expenses)}</p>
				</div>
			</div>
		</div>
	);
}
