import { LuPencil, LuTrendingUp } from "react-icons/lu";
import { Button } from "@/components/ui/Button";

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });

export function FinancialAccountYieldStatementItem({
	amount,
	onEdit,
}: {
	amount: number;
	onEdit: () => void;
}) {
	return (
		<div className="flex items-center gap-3 px-4 py-3">
			<span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
				<LuTrendingUp />
			</span>
			<p className="min-w-0 flex-1 font-semibold">Rendimento</p>
			<p className="whitespace-nowrap font-bold text-emerald-600">+{currency.format(amount)}</p>
			<Button
				aria-label="Editar rendimento"
				className="cursor-pointer"
				onClick={onEdit}
				size="icon"
				variant="outline"
			>
				<LuPencil />
			</Button>
		</div>
	);
}
