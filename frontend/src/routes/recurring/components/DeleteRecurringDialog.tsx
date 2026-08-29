import { HiTrash } from "react-icons/hi2";
import { Button } from "@/components/ui/Button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/Dialog";
import type { RecurringListItemData } from "./types";

export function DeleteRecurringDialog({
	deleting,
	item,
	onDelete,
	onOpenChange,
}: {
	deleting: boolean;
	item: RecurringListItemData;
	onDelete: (deleteTransactions: boolean) => void;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog onOpenChange={onOpenChange} open>
			<DialogContent showCloseButton={!deleting}>
				<DialogHeader>
					<DialogTitle>Excluir {item.title}?</DialogTitle>
					<DialogDescription>
						Esta recorrência pode já ter gerado transações. Deseja excluí-las também?
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button disabled={deleting} onClick={() => onDelete(false)} variant="outline">
						Excluir somente recorrência
					</Button>
					<Button disabled={deleting} onClick={() => onDelete(true)} variant="destructive">
						<HiTrash /> {deleting ? "Excluindo…" : "Excluir recorrência e transações"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
