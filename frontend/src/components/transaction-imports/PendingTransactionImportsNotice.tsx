import { useQuery } from "@tanstack/react-query";
import { LuClock3 } from "react-icons/lu";
import { Button } from "@/components/ui/Button";
import { dataService } from "@/lib/dataService";
import { useAuthStore } from "@/stores";

export function PendingTransactionImportsNotice({ onReview }: { onReview: (importId: string) => void }) {
	const isAuthenticated = useAuthStore(state => state.isAuthenticated);
	const imports = useQuery({
		enabled: isAuthenticated,
		queryFn: dataService.transactionImports.getPending,
		queryKey: ["pending-transaction-imports"],
	});
	const pendingImports = imports.data;
	const firstImport = pendingImports?.[0];
	if (!firstImport) return null;
	const itemCount = pendingImports.reduce(
		(sum, transactionImport) => sum + transactionImport.items.length,
		0,
	);
	return (
		<section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
			<div className="flex items-center gap-3">
				<LuClock3 className="size-5 text-amber-700" />
				<div>
					<p className="font-semibold">Importações aguardando revisão</p>
					<p className="text-muted-foreground text-sm">
						{pendingImports.length} lote(s) · {itemCount} transações ainda não afetam seus saldos.
					</p>
				</div>
			</div>
			<Button className="cursor-pointer" onClick={() => onReview(firstImport.id)} variant="outline">
				Revisar
			</Button>
		</section>
	);
}
