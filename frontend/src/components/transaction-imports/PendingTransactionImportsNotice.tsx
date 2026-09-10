import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { LuClock3, LuFileSearch } from "react-icons/lu";
import { Button } from "@/components/ui/Button";
import { dataService } from "@/lib/dataService";
import { useAuthStore } from "@/stores";
import { PendingTransactionImportsDialog } from "./PendingTransactionImportsDialog";

export function PendingTransactionImportsNotice({ onReview }: { onReview: (importId: string) => void }) {
	const isAuthenticated = useAuthStore(state => state.isAuthenticated);
	const [selectionOpen, setSelectionOpen] = useState(false);
	const imports = useQuery({
		enabled: isAuthenticated,
		queryFn: dataService.transactionImports.getPending,
		queryKey: ["pending-transaction-imports"],
	});
	const pendingImports = imports.data;
	if (!pendingImports?.length) return null;
	const itemCount = pendingImports.reduce(
		(sum, transactionImport) => sum + transactionImport.items.length,
		0,
	);
	return (
		<>
			<section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
				<div className="flex items-center gap-3">
					<LuClock3 className="size-5 text-amber-700" />
					<div>
						<p className="font-semibold">Importações aguardando revisão</p>
						<p className="text-muted-foreground text-sm">
							{pendingImports.length} {pendingImports.length === 1 ? "lote" : "lotes"} · {itemCount}{" "}
							transações ainda não afetam seus saldos.
						</p>
					</div>
				</div>
				<Button
					className="cursor-pointer"
					onClick={() => {
						if (pendingImports.length === 1) {
							onReview(pendingImports[0].id);
							return;
						}
						setSelectionOpen(true);
					}}
					variant="outline"
				>
					<LuFileSearch /> Revisar
				</Button>
			</section>
			{pendingImports.length > 1 && (
				<PendingTransactionImportsDialog
					imports={pendingImports}
					onOpenChange={setSelectionOpen}
					onReview={onReview}
					open={selectionOpen}
				/>
			)}
		</>
	);
}
