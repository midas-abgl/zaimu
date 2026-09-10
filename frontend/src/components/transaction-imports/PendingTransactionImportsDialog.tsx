import { LuClock3, LuFileSearch } from "react-icons/lu";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { ScrollArea } from "@/components/ui/ScrollArea";
import type { TransactionImport } from "@/lib/api";

const importedAtFormatter = new Intl.DateTimeFormat("pt-BR", {
	dateStyle: "short",
	timeStyle: "short",
});

export function PendingTransactionImportsDialog({
	imports,
	onOpenChange,
	onReview,
	open,
}: {
	imports: TransactionImport[];
	onOpenChange: (open: boolean) => void;
	onReview: (importId: string) => void;
	open: boolean;
}) {
	const sortedImports = imports.toSorted((left, right) => right.createdAt.localeCompare(left.createdAt));
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="grid-rows-[auto_minmax(0,1fr)] sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Selecionar lote para revisão</DialogTitle>
					<DialogDescription>Escolha um lote. Os mais recentes aparecem primeiro.</DialogDescription>
				</DialogHeader>
				<ScrollArea className="max-h-[min(24rem,calc(100dvh-15rem))] min-h-0 pr-3">
					<div className="space-y-2">
						{sortedImports.map(transactionImport => (
							<Button
								className="h-auto w-full cursor-pointer justify-start gap-3 whitespace-normal px-4 py-3 text-left"
								key={transactionImport.id}
								onClick={() => {
									onOpenChange(false);
									onReview(transactionImport.id);
								}}
								variant="outline"
							>
								<LuFileSearch className="mt-0.5 size-5 text-amber-700" />
								<span className="min-w-0 space-y-1">
									<span className="block truncate font-semibold">{transactionImport.fileName}</span>
									<span className="flex items-center gap-1.5 text-muted-foreground text-xs">
										<LuClock3 className="size-3.5" />
										{importedAtFormatter.format(new Date(transactionImport.createdAt))} ·{" "}
										{transactionImport.items.length}{" "}
										{transactionImport.items.length === 1 ? "transação restante" : "transações restantes"}
									</span>
								</span>
							</Button>
						))}
					</div>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}
