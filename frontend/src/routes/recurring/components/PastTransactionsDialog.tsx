import { Button } from "@/components/ui/Button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/Dialog";

export function PastTransactionsDialog({
	onAddAll,
	onOpenChange,
	onSkip,
	open,
}: {
	onAddAll: () => void;
	onOpenChange: (open: boolean) => void;
	onSkip: () => void;
	open: boolean;
}) {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent showCloseButton={false}>
				<DialogHeader>
					<DialogTitle>Adicionar transações passadas?</DialogTitle>
					<DialogDescription>
						Esta recorrência começa no passado. Deseja adicionar todas as transações desde a data inicial?
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button className="cursor-pointer" onClick={onSkip} variant="outline">
						Não adicionar
					</Button>
					<Button className="cursor-pointer" onClick={onAddAll}>
						Adicionar todas
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
