import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/Dialog";
import { useDebouncedInput } from "@/hooks/use-debounced-input";
import type { Transaction } from "@/lib/api";
import { dataService } from "@/lib/dataService";
import { showToast } from "@/stores";
import { TransactionDetailsFields } from "./TransactionDetailsFields";

function createDraft(transaction: Transaction) {
	return {
		amount: String(transaction.amount),
		date: transaction.date.slice(0, 10),
		tagIds: transaction.tagIds ?? transaction.tags?.map(tag => tag.id) ?? [],
	};
}

export function EditTransactionDialog({
	onOpenChange,
	open,
	transaction,
}: {
	onOpenChange: (open: boolean) => void;
	open: boolean;
	transaction: Transaction | null;
}) {
	const queryClient = useQueryClient();
	const [draft, setDraft] = useState(() => (transaction ? createDraft(transaction) : null));
	const [description, setDescription] = useDebouncedInput(transaction?.description ?? "", () => undefined);

	useEffect(() => {
		if (!open || !transaction) return;
		setDraft(createDraft(transaction));
		setDescription(transaction.description ?? "");
	}, [open, setDescription, transaction]);

	const update = useMutation({
		mutationFn: () => {
			if (!transaction || !draft) throw new Error("Transação não encontrada");
			return dataService.transactions.update(transaction.id, {
				amount: Number.parseFloat(draft.amount),
				date: draft.date,
				description: description.trim() || undefined,
				tagIds: draft.tagIds,
			});
		},
		onError: error => showToast(error.message, "negative"),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["accounts"] }),
				queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
				queryClient.invalidateQueries({ queryKey: ["transactions"] }),
			]);
			showToast("Transação atualizada.", "positive");
			onOpenChange(false);
		},
	});

	if (!transaction || !draft) return null;

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[92dvh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Editar transação</DialogTitle>
					<DialogDescription>Altere os dados da movimentação.</DialogDescription>
				</DialogHeader>
				<div className="scrollbar-themed grid min-h-0 gap-4 overflow-y-auto pr-1">
					<TransactionDetailsFields
						amount={draft.amount}
						date={draft.date}
						description={description}
						onAmountChange={amount => setDraft(current => (current ? { ...current, amount } : current))}
						onDateChange={date => setDraft(current => (current ? { ...current, date } : current))}
						onDescriptionChange={setDescription}
						onTagIdsChange={tagIds => setDraft(current => (current ? { ...current, tagIds } : current))}
						onTypeChange={() => undefined}
						showType={false}
						tagIds={draft.tagIds}
						type={transaction.type}
					/>
				</div>
				<DialogFooter>
					<Button className="cursor-pointer" onClick={() => onOpenChange(false)} variant="outline">
						Descartar
					</Button>
					<Button
						className="cursor-pointer disabled:cursor-not-allowed"
						disabled={!draft.amount || update.isPending}
						onClick={() => update.mutate()}
					>
						{update.isPending ? "Salvando…" : "Salvar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
