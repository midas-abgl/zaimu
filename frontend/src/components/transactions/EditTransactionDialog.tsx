import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CustomSelect } from "@/components/ui/CustomSelect";
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
import { getFinancialAccountDisplayName } from "@/lib/financial-account";
import { showToast } from "@/stores";
import { TransactionDetailsFields } from "./TransactionDetailsFields";

function createDraft(transaction: Transaction) {
	return {
		amount: String(transaction.amount),
		date: transaction.date.slice(0, 10),
		destinationFinancialAccountId: transaction.destinationFinancialAccountId ?? "",
		originFinancialAccountId: transaction.originFinancialAccountId ?? "",
		tagIds: transaction.tagIds ?? transaction.tags?.map(tag => tag.id) ?? [],
		type: transaction.type,
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
	const accountsQuery = useQuery({
		enabled: open,
		queryFn: () => dataService.accounts.getAll(),
		queryKey: ["accounts"],
	});

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
				destinationFinancialAccountId: draft.destinationFinancialAccountId || null,
				originFinancialAccountId: draft.originFinancialAccountId || null,
				tagIds: draft.tagIds,
				type: draft.type,
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
	const balanceAccounts =
		accountsQuery.data
			?.filter(account => account.type !== "CREDIT_CARD")
			.toSorted((left, right) =>
				getFinancialAccountDisplayName(left).localeCompare(getFinancialAccountDisplayName(right), "pt-BR"),
			) ?? [];
	const primaryAccountId =
		draft.type === "INCOME" ? draft.destinationFinancialAccountId : draft.originFinancialAccountId;

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
						onTypeChange={type =>
							setDraft(current =>
								current
									? {
											...current,
											destinationFinancialAccountId:
												type === "INCOME" ? current.destinationFinancialAccountId : "",
											originFinancialAccountId: type === "INCOME" ? "" : current.originFinancialAccountId,
											type,
										}
									: current,
							)
						}
						tagIds={draft.tagIds}
						type={draft.type}
					/>
					{balanceAccounts.length > 0 ? (
						<CustomSelect
							label={draft.type === "INCOME" ? "Conta de destino" : "Conta de origem"}
							onValueChange={accountId =>
								setDraft(current =>
									current
										? current.type === "INCOME"
											? { ...current, destinationFinancialAccountId: accountId }
											: { ...current, originFinancialAccountId: accountId }
										: current,
								)
							}
							options={balanceAccounts.map(account => ({
								label: getFinancialAccountDisplayName(account),
								value: account.id,
							}))}
							placeholder="Selecione a conta"
							required
							value={primaryAccountId}
						/>
					) : null}
					{draft.type === "TRANSFER" && balanceAccounts.length > 0 ? (
						<CustomSelect
							label="Conta de destino"
							onValueChange={destinationFinancialAccountId =>
								setDraft(current => (current ? { ...current, destinationFinancialAccountId } : current))
							}
							options={balanceAccounts
								.filter(account => account.id !== draft.originFinancialAccountId)
								.map(account => ({ label: getFinancialAccountDisplayName(account), value: account.id }))}
							placeholder="Selecione o destino"
							required
							value={draft.destinationFinancialAccountId}
						/>
					) : null}
				</div>
				<DialogFooter>
					<Button className="cursor-pointer" onClick={() => onOpenChange(false)} variant="outline">
						Descartar
					</Button>
					<Button
						className="cursor-pointer disabled:cursor-not-allowed"
						disabled={
							!draft.amount ||
							!primaryAccountId ||
							(draft.type === "TRANSFER" && !draft.destinationFinancialAccountId) ||
							update.isPending
						}
						onClick={() => update.mutate()}
					>
						{update.isPending ? "Salvando…" : "Salvar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
